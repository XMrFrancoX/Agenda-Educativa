import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createBrowserClient, createServerClient } from '@supabase/ssr';

/**
 * Create a Supabase client for use in the browser.
 * Uses the ANON key — all queries are subject to RLS.
 */
export function createSupabaseBrowserClient() {
	return createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Create a Supabase client for use in SvelteKit server hooks/load functions.
 * Reads and writes auth cookies automatically.
 */
export function createSupabaseServerClient(
	fetch: typeof globalThis.fetch,
	getAll: () => { name: string; value: string }[],
	setAll: (cookies: { name: string; value: string; options: Record<string, unknown> }[]) => void
) {
	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: { getAll, setAll },
		global: { fetch }
	});
}
