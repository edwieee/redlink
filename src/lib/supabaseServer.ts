import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
    'This is required for server-side matching operations that bypass RLS.'
  );
}

/**
 * Server-only Supabase client for REDLINK.
 *
 * Uses the service_role key to bypass Row Level Security.
 * This is STRICTLY for internal matching engine operations and MUST NOT
 * be used in ways that expose private data to unauthorized users.
 */
export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey);
