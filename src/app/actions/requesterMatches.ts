'use server';

import { supabaseServer } from '../../lib/supabaseServer';
import { verifyRequesterToken } from '../../lib/auth/tokens';

export interface SanitizedMatchForRequester {
  matchId: string;
  donorId: string;
  donorName: string;
  bloodGroup: string;
  locality: string;
  pincode: string;
  matchType: string;
  matchStatus: 'pending' | 'accepted' | 'declined';
  matchedAt: string;
  acceptedAt: string | null;
  phone: string | null; // STRICTLY null unless matchStatus === 'accepted' AND requester is authorized
  isPhoneRevealed: boolean;
}

export interface RequestMatchesResult {
  success: boolean;
  message?: string;
  error?: string;
  request?: {
    id: string;
    requesterName: string;
    bloodGroup: string;
    locality: string;
    pincode: string;
    hospital: string;
    urgency: string;
    status: string;
    createdAt: string;
  };
  matches?: SanitizedMatchForRequester[];
}

/**
 * Server Action for requesters to fetch match status and revealed contact info.
 *
 * Enforces:
 * 1. Cryptographic Requester Authorization Token verification
 * 2. Strict Server-Side Zero-Leakage Privacy Boundary:
 *    - Before acceptance: phone is null on the wire
 *    - After acceptance: phone is revealed only to this authorized requester
 * 3. Prevents parameter tampering (changing request_id or donor_id)
 */
export async function getRequestMatchesAction(params: {
  requestId: string;
  token?: string | null;
}): Promise<RequestMatchesResult> {
  const { requestId, token } = params || {};

  if (!requestId || typeof requestId !== 'string') {
    return {
      success: false,
      error: 'Invalid request ID.',
    };
  }

  try {
    // 1. Authorization Check: Verify caller possesses the valid requester token
    const isAuthorized = await verifyRequesterToken(requestId, token);

    if (!isAuthorized) {
      console.warn(`[RequesterMatches] Unauthorized access attempt for request ${requestId}`);
      return {
        success: false,
        error: 'Unauthorized: You do not have permission to view contact details for this request.',
      };
    }

    // 2. Fetch the request
    const { data: request, error: reqError } = await supabaseServer
      .from('requests')
      .select('id, requester_name, blood_group, locality, pincode, hospital, urgency, status, created_at')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      return {
        success: false,
        error: 'Request not found.',
      };
    }

    // 3. Fetch all matches for this request, joining the corresponding donor details
    const { data: matches, error: matchesError } = await supabaseServer
      .from('matches')
      .select(`
        id,
        match_type,
        match_status,
        matched_at,
        accepted_at,
        donor_id,
        donors (
          id,
          name,
          blood_group,
          locality,
          pincode,
          phone
        )
      `)
      .eq('request_id', requestId)
      .order('matched_at', { ascending: false });

    if (matchesError) {
      console.error('[RequesterMatches] Error fetching matches:', matchesError);
      return {
        success: false,
        error: 'Failed to retrieve matches.',
      };
    }

    // 4. Server-Side Data Access Layer Projection (Privacy boundary enforcement)
    const sanitizedMatches: SanitizedMatchForRequester[] = (matches || []).map((m: any) => {
      const isAccepted = m.match_status === 'accepted';
      const donor = m.donors;

      return {
        matchId: m.id,
        donorId: m.donor_id,
        donorName: donor?.name || 'Anonymous Donor',
        bloodGroup: donor?.blood_group || 'Unknown',
        locality: donor?.locality || 'Unknown',
        pincode: donor?.pincode || '',
        matchType: m.match_type,
        matchStatus: m.match_status,
        matchedAt: m.matched_at,
        acceptedAt: m.accepted_at,
        // ZERO-LEAKAGE: donor phone is NEVER sent unless accepted!
        phone: isAccepted && donor?.phone ? donor.phone : null,
        isPhoneRevealed: isAccepted,
      };
    });

    return {
      success: true,
      request: {
        id: request.id,
        requesterName: request.requester_name,
        bloodGroup: request.blood_group,
        locality: request.locality,
        pincode: request.pincode,
        hospital: request.hospital,
        urgency: request.urgency,
        status: request.status,
        createdAt: request.created_at,
      },
      matches: sanitizedMatches,
    };
  } catch (err) {
    console.error('[RequesterMatches] Unexpected failure:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while retrieving request details.',
    };
  }
}
