import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, profile, tenant }, depends }) => {
	depends('supabase:auth');
	const { session, user } = await safeGetSession();
	return { session, user, profile, tenant };
};
