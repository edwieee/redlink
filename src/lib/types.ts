export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type UrgencyLevel = 'urgent' | 'normal' | 'CRITICAL' | 'URGENT' | 'STANDARD';

export type RequestStatus = 'OPEN' | 'MATCHED' | 'FULFILLED' | 'CANCELLED';

export type MatchStatus = 'NOTIFIED' | 'ACCEPTED' | 'DECLINED';

export interface Donor {
  id: string;
  name: string;
  blood_group: BloodGroup;
  locality: string;
  pincode: string;
  last_donation_date: string | null; // ISO string 'YYYY-MM-DD'
  phone: string; // STRICTLY PRIVATE until match acceptance
  created_at: string;
}

export interface BloodRequest {
  id: string;
  requester_name: string;
  blood_group: BloodGroup;
  locality: string;
  pincode: string;
  hospital: string;
  urgency: UrgencyLevel;
  phone: string; // STRICTLY PRIVATE until donor accepts
  status: RequestStatus;
  created_at: string;
}

export interface Match {
  id: string;
  request_id: string;
  donor_id: string;
  status: MatchStatus;
  created_at: string;
  accepted_at: string | null;
}

// Sanitized projections to enforce privacy boundaries on the server
export interface SanitizedDonor {
  id: string;
  name: string;
  blood_group: BloodGroup;
  locality: string;
  pincode: string;
  phone: string | null; // null if not accepted
  is_phone_revealed: boolean;
  match_status: MatchStatus;
  accepted_at: string | null;
}

export interface SanitizedRequest {
  id: string;
  requester_name: string;
  blood_group: BloodGroup;
  locality: string;
  pincode: string;
  hospital: string;
  urgency: UrgencyLevel;
  phone: string | null; // null if not accepted
  is_phone_revealed: boolean;
  status: RequestStatus;
  created_at: string;
}

export interface MatchedRequestForDonor {
  match_id: string;
  match_status: MatchStatus;
  accepted_at: string | null;
  request: SanitizedRequest;
  donor_eligibility: {
    is_eligible: boolean;
    days_remaining: number;
    status_label: string;
  };
}

export interface RequestWithMatches {
  request: SanitizedRequest;
  matches: Array<{
    match_id: string;
    match_status: MatchStatus;
    accepted_at: string | null;
    donor: SanitizedDonor;
  }>;
}

export interface MatchEvaluationResult {
  donorName: string;
  bloodGroup: string;
  locality: string;
  isEligible: boolean;
  exclusionReason?: string;
  matchId?: string; // Created match ID if eligible
}

export interface MatchingEngineResult {
  success: boolean;
  message?: string;
  results: MatchEvaluationResult[];
}
