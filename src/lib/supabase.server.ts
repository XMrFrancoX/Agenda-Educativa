/**
 * Server-only Supabase utilities.
 * NEVER import this file from browser components or +page.svelte scripts.
 * Only use in +page.server.ts, +server.ts, and hooks.server.ts.
 */
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase admin client using the service_role key.
 * BYPASSES RLS — only use server-side for trusted operations (e.g. storage uploads).
 */
export function createSupabaseAdminClient() {
	return createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}
