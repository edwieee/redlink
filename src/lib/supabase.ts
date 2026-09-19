import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
    'Add it to .env.local in the project root.'
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
    'Add it to .env.local in the project root.'
  );
}

/**
 * Browser-safe Supabase client for REDLINK.
 *
 * Uses the publishable (anon) key — safe for client-side code.
 * All data access is governed by Row Level Security policies.
 *
 * IMPORTANT: Never import or use a service-role/secret key here.
 * Server-side privileged access will use a separate mechanism
 * in a future step.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
