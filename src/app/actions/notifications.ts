'use server';

import { supabaseServer } from '../../lib/supabaseServer';

export interface DonorNotification {
  matchId: string;
  requestId: string;
  bloodGroup: string;
  locality: string;
  urgency: string;
  matchType: string;
  matchedAt: string;
}

export interface NotificationsResult {
  success: boolean;
  message?: string;
  notifications: DonorNotification[];
  donorName?: string;
}

/**
 * Server Action to fetch notifications (pending matches) for a specific donor.
 *
 * Uses the server-only client to safely read the matches table and join with
 * the requests table. Critically, it does NOT return the requester's phone
 * number or personal name to the donor at this stage (Step 6).
 */
export async function getDonorNotificationsAction(donorId: string): Promise<NotificationsResult> {
  if (!donorId || typeof donorId !== 'string') {
    return { success: false, message: 'Invalid donor ID.', notifications: [] };
  }

  try {
    // 1. Verify donor exists and get name for UI
    const { data: donor, error: donorError } = await supabaseServer
      .from('donors')
      .select('name')
      .eq('id', donorId)
      .single();

    if (donorError || !donor) {
      return { success: false, message: 'Donor not found.', notifications: [] };
    }

    // 2. Fetch pending matches for this donor, including safely joined request data
    const { data: matches, error: matchError } = await supabaseServer
      .from('matches')
      .select(`
        id,
        match_type,
        matched_at,
        request_id,
        requests (
          blood_group,
          locality,
          urgency
        )
      `)
      .eq('donor_id', donorId)
      .eq('match_status', 'pending')
      .order('matched_at', { ascending: false });

    if (matchError) {
      console.error('[Notifications] Error fetching matches:', matchError);
      return { success: false, message: 'Failed to fetch notifications.', notifications: [] };
    }

    const notifications: DonorNotification[] = (matches || []).map((m: any) => ({
      matchId: m.id,
      requestId: m.request_id,
      matchType: m.match_type,
      matchedAt: m.matched_at,
      bloodGroup: m.requests?.blood_group || 'Unknown',
      locality: m.requests?.locality || 'Unknown',
      urgency: m.requests?.urgency || 'normal',
    }));

    return {
      success: true,
      notifications,
      donorName: donor.name,
    };
  } catch (error) {
    console.error('[Notifications] Unexpected error:', error);
    return { success: false, message: 'Internal server error.', notifications: [] };
  }
}
