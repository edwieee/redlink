'use server';

import { findMatchesForRequest } from '../../lib/matching/matchingEngine';
import type { MatchingEngineResult } from '../../lib/types';

/**
 * Server Action to trigger the matching engine for a specific request.
 *
 * This acts as the secure bridge between the client UI and the privileged
 * server-side matching orchestrator.
 */
export async function findMatchesAction(requestId: string): Promise<MatchingEngineResult> {
  if (!requestId || typeof requestId !== 'string') {
    return {
      success: false,
      message: 'Invalid request ID.',
      results: [],
    };
  }

  // Find matches safely on the server
  const result = await findMatchesForRequest(requestId);
  
  return result;
}
