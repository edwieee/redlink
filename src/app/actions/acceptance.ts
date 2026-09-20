'use server';

import { supabaseServer } from '../../lib/supabaseServer';

export interface AcceptMatchParams {
  matchId: string;
  donorId: string;
}

export interface AcceptMatchResult {
  success: boolean;
  message?: string;
  error?: string;
  matchId?: string;
  accepted_at?: string | null;
}

/**
 * Server Action for a matched donor to accept a blood request.
 *
 * Enforces:
 * 1. Verification of match record existence
 * 2. Strict donor authorization (the donorId MUST match matches.donor_id)
 * 3. State machine constraints: pending -> accepted
 * 4. Idempotent acceptance: re-accepting an already accepted match is safe and returns existing state
 * 5. Updates request status to 'accepted'
 * 6. Never exposes raw database errors
 */
export async function acceptMatchAction(params: AcceptMatchParams): Promise<AcceptMatchResult> {
  const { matchId, donorId } = params || {};

  if (!matchId || typeof matchId !== 'string' || !donorId || typeof donorId !== 'string') {
    return {
      success: false,
      error: 'Invalid acceptance parameters. Match ID and Donor ID are required.',
    };
  }

  try {
    // 1. Fetch match record
    const { data: match, error: fetchError } = await supabaseServer
      .from('matches')
      .select('id, request_id, donor_id, match_status, accepted_at')
      .eq('id', matchId)
      .single();

    if (fetchError || !match) {
      return {
        success: false,
        error: 'This request is no longer available.',
      };
    }

    // 2. Strict authorization: Donor must match the match record
    if (match.donor_id !== donorId) {
      console.warn(`[AcceptMatch] Unauthorized attempt: donor ${donorId} tried to accept match ${matchId} owned by ${match.donor_id}`);
      return {
        success: false,
        error: 'Unauthorized: You are not authorized to accept this match.',
      };
    }

    // 3. Idempotent acceptance: If already accepted, return gracefully
    if (match.match_status === 'accepted') {
      return {
        success: true,
        message: 'Request already accepted.',
        matchId: match.id,
        accepted_at: match.accepted_at,
      };
    }

    // 4. Verify match is pending
    if (match.match_status !== 'pending') {
      return {
        success: false,
        error: 'This request is no longer available for acceptance.',
      };
    }

    // 5. Verify request exists and is valid
    const { data: request, error: reqError } = await supabaseServer
      .from('requests')
      .select('id, status')
      .eq('id', match.request_id)
      .single();

    if (reqError || !request || request.status === 'cancelled') {
      return {
        success: false,
        error: 'This request is no longer active.',
      };
    }

    const acceptedAt = new Date().toISOString();

    // 6. Update match status to accepted with accepted_at timestamp
    const { error: updateMatchError } = await supabaseServer
      .from('matches')
      .update({
        match_status: 'accepted',
        accepted_at: acceptedAt,
      })
      .eq('id', matchId)
      .eq('match_status', 'pending');

    if (updateMatchError) {
      console.error('[AcceptMatch] Error updating match status:', updateMatchError);
      return {
        success: false,
        error: 'Unable to accept this request. Please try again.',
      };
    }

    // 7. Update corresponding request status to 'accepted'
    const { error: updateReqError } = await supabaseServer
      .from('requests')
      .update({
        status: 'accepted',
      })
      .eq('id', match.request_id);

    if (updateReqError) {
      console.error('[AcceptMatch] Error updating request status:', updateReqError);
      // Non-fatal if match succeeded, but logged
    }

    return {
      success: true,
      message: 'Request successfully accepted.',
      matchId: match.id,
      accepted_at: acceptedAt,
    };
  } catch (err) {
    console.error('[AcceptMatch] Unexpected failure:', err);
    return {
      success: false,
      error: 'Unable to accept this request. Please try again.',
    };
  }
}
