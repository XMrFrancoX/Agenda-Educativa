import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile, safeGetSession } }) => {
	const { user } = await safeGetSession();

	const { data: preferences } = await supabase
		.from('user_preferences')
		.select('*')
		.eq('user_id', user?.id ?? '')
		.single();

	return { profile, user, preferences };
};
