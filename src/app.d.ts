// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			supabase: import('@supabase/supabase-js').SupabaseClient;
			safeGetSession: () => Promise<{
				session: import('@supabase/supabase-js').Session | null;
				user: import('@supabase/supabase-js').User | null;
			}>;
			user: import('@supabase/supabase-js').User | null;
			profile: {
				id: string;
				full_name: string | null;
				role: 'teacher' | 'director' | 'admin';
				school_id: string;
				phone: string | null;
				avatar_url: string | null;
			} | null;
		}
		interface PageData {
			session: import('@supabase/supabase-js').Session | null;
			user: import('@supabase/supabase-js').User | null;
			profile: App.Locals['profile'];
		}
		interface Error {
			message: string;
			code?: string;
		}
		// interface Platform {}
	}
}

export {};
