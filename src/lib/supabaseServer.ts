import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseServer: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (_supabaseServer) {
    return _supabaseServer;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This is required for server-side matching operations that bypass RLS.'
    );
  }

  _supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _supabaseServer;
}

/**
 * Server-only Supabase client for REDLINK.
 *
 * Uses the service_role key to bypass Row Level Security.
 * This is STRICTLY for internal matching engine operations and MUST NOT
 * be used in ways that expose private data to unauthorized users.
 */
export const supabaseServer = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseServer();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
