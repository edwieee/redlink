import 'server-only';
import { supabaseServer } from '../supabaseServer';
import { isBloodCompatible } from './bloodCompatibility';
import { isLocationMatch } from './location';
import { checkDonationEligibility } from './interval';
import { DbDonor, DbRequest } from '../database.types';
import type { MatchEvaluationResult, MatchingEngineResult } from '../types';

export type { MatchEvaluationResult, MatchingEngineResult };

/**
 * Core Matching Engine Orchestrator
 *
 * Requirements (Step 5 MVP):
 * 1. Blood Group Compatibility
 * 2. Location Match (Exact Pincode)
 * 3. Donation Interval (120 days)
 *
 * This function bypasses RLS using the server role key to safely evaluate donors.
 * It NEVER returns private phone numbers.
 */
export async function findMatchesForRequest(requestId: string): Promise<MatchingEngineResult> {
  try {
    // 1. Fetch the request
    const { data: request, error: reqError } = await supabaseServer
      .from('requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      console.error('[MatchingEngine] Request fetch failed:', reqError);
      return { success: false, message: 'Request not found.', results: [] };
    }

    const req = request as DbRequest;

    // 2. Fetch ALL donors in the same pincode
    // In a massive system, we'd filter by blood group in SQL.
    // For MVP transparency, we pull local donors to show *why* they were excluded.
    const { data: donors, error: donorsError } = await supabaseServer
      .from('donors')
      .select('*')
      .eq('pincode', req.pincode);

    if (donorsError || !donors) {
      console.error('[MatchingEngine] Donors fetch failed:', donorsError);
      return { success: false, message: 'Failed to find donors.', results: [] };
    }

    // 3. Fetch existing matches for this request (to prevent duplicates)
    const { data: existingMatches, error: matchesError } = await supabaseServer
      .from('matches')
      .select('donor_id')
      .eq('request_id', requestId);

    if (matchesError) {
      console.error('[MatchingEngine] Existing matches fetch failed:', matchesError);
      return { success: false, message: 'Failed to verify existing matches.', results: [] };
    }

    const existingDonorIds = new Set(existingMatches?.map((m) => m.donor_id) || []);
    const evaluationResults: MatchEvaluationResult[] = [];
    let newMatchesCount = 0;

    // 4. Evaluate each donor
    for (const donor of (donors as DbDonor[])) {
      const result: MatchEvaluationResult = {
        donorName: donor.name,
        bloodGroup: donor.blood_group,
        locality: donor.locality,
        isEligible: false,
      };

      // Rule 1: Blood Compatibility
      if (!isBloodCompatible(donor.blood_group, req.blood_group)) {
        result.exclusionReason = 'Incompatible blood group';
        evaluationResults.push(result);
        continue;
      }

      // Rule 2: Location Match (already filtered by pincode in SQL, but verify exact local tier)
      const locMatch = isLocationMatch(donor.locality, donor.pincode, req.locality, req.pincode);
      if (locMatch.tier !== 'EXACT_PINCODE' && locMatch.tier !== 'LOCALITY') {
        result.exclusionReason = 'Different location';
        evaluationResults.push(result);
        continue;
      }

      // Rule 3: Donation Interval
      const eligibility = checkDonationEligibility(donor.last_donation_date);
      if (!eligibility.isEligible) {
        result.exclusionReason = `Donation interval not met (${eligibility.statusLabel})`;
        evaluationResults.push(result);
        continue;
      }

      // Passed all rules!
      result.isEligible = true;

      // 5. Create Match Record (if not already matched)
      if (existingDonorIds.has(donor.id)) {
        result.exclusionReason = 'Already matched';
        result.isEligible = false; // Set to false to exclude from new match UI list
      } else {
        const { data: newMatch, error: insertError } = await supabaseServer
          .from('matches')
          .insert([
            {
              request_id: req.id,
              donor_id: donor.id,
              match_type: 'exact',
              match_status: 'pending',
            },
          ])
          .select('id')
          .single();

        if (insertError) {
          console.error(`[MatchingEngine] Failed to create match for donor ${donor.id}:`, insertError);
          result.exclusionReason = 'System error creating match';
          result.isEligible = false;
        } else {
          result.matchId = newMatch.id;
          newMatchesCount++;
          existingDonorIds.add(donor.id); // Prevent duplicate in same run if edge case arises
        }
      }

      evaluationResults.push(result);
    }

    // 6. Update Request Status if new matches were found
    if (newMatchesCount > 0 && req.status === 'pending') {
      const { error: updateError } = await supabaseServer
        .from('requests')
        .update({ status: 'matched' })
        .eq('id', req.id);

      if (updateError) {
        console.error('[MatchingEngine] Failed to update request status:', updateError);
      }
    }

    return {
      success: true,
      results: evaluationResults,
    };
  } catch (error) {
    console.error('[MatchingEngine] Unexpected error:', error);
    return { success: false, message: 'Internal matching engine error.', results: [] };
  }
}
