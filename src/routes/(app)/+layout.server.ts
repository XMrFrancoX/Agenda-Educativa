import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession, profile } }) => {
	const { session, user } = await safeGetSession();
	if (!user) throw redirect(303, '/login');
	return { session, user, profile };
};
