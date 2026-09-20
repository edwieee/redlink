import 'server-only';
import crypto from 'crypto';
import { supabaseServer } from '../supabaseServer';

const HMAC_SECRET =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  'redlink-secure-hmac-prototype-fallback';

/**
 * Creates a cryptographically signed requester token bound to a specific request ID and requester phone.
 * This guarantees that only the user who created the request (or holds this token) can view
 * the revealed contact details of an accepted match.
 */
export function createRequesterToken(requestId: string, requesterPhone: string): string {
  if (!requestId || !requesterPhone) {
    throw new Error('requestId and requesterPhone are required to generate a requester token');
  }

  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(`${requestId}:${requesterPhone}`)
    .digest('hex');
}

/**
 * Verifies that a given token is valid for the specified request ID.
 * Performs a constant-time comparison to prevent timing attacks.
 */
export async function verifyRequesterToken(
  requestId: string,
  token: string | null | undefined
): Promise<boolean> {
  if (!requestId || !token || typeof token !== 'string') {
    return false;
  }

  try {
    const { data: request, error } = await supabaseServer
      .from('requests')
      .select('id, phone')
      .eq('id', requestId)
      .single();

    if (error || !request || !request.phone) {
      return false;
    }

    const expectedToken = createRequesterToken(request.id, request.phone);

    const tokenBuf = Buffer.from(token, 'hex');
    const expectedBuf = Buffer.from(expectedToken, 'hex');

    if (tokenBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuf, expectedBuf);
  } catch (err) {
    console.error('[Tokens] Error verifying requester token:', err);
    return false;
  }
}
