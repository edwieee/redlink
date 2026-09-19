import { describe, it, expect } from 'vitest';

/**
 * Supabase connection verification test.
 *
 * This test verifies that the Supabase client can be created
 * when environment variables are present. It does NOT:
 *   - Expose keys, phone numbers, or sensitive data
 *   - Perform anonymous SELECT queries on protected tables
 *   - Create a public endpoint
 *   - Weaken RLS policies
 *
 * Tests that require live env vars are skipped in CI or when
 * .env.local is not loaded into the test runner.
 */

const hasEnvVars =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  (
    (typeof process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === 'string' &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.length > 0) ||
    (typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'string' &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0)
  );

describe('Supabase Connection', () => {
  it('should export a createClient-compatible module from supabase.ts', async () => {
    // Verify the module structure without requiring live env vars.
    // We import the raw source to check it exports correctly when
    // env vars are present. If they are missing, we verify that
    // the module throws a descriptive error rather than silently
    // returning an undefined client.
    if (hasEnvVars) {
      const { supabase } = await import('../lib/supabase');
      expect(supabase).toBeDefined();
      expect(supabase).not.toBeNull();
      expect(typeof supabase.from).toBe('function');
    } else {
      // Without env vars, the module should throw a clear error
      await expect(import('../lib/supabase')).rejects.toThrow(
        /Missing NEXT_PUBLIC_SUPABASE/
      );
    }
  });

  it('should not expose service-role or secret keys in NEXT_PUBLIC_ variables', () => {
    // Scan all NEXT_PUBLIC_ env vars to ensure no secret/service-role
    // key has been accidentally added as a public variable.
    const publicVars = Object.keys(process.env).filter((key) =>
      key.startsWith('NEXT_PUBLIC_')
    );

    for (const key of publicVars) {
      const lower = key.toLowerCase();
      expect(lower).not.toContain('service_role');
      expect(lower).not.toContain('secret');
    }
  });
});
