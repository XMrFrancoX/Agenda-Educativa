import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile, safeGetSession } }) => {
	const { user } = await safeGetSession();

	const { data: preferences } = await supabase
		.from('user_preferences')
		.select('*')
		.eq('user_id', user?.id ?? '')
		.single();

	const { data: categories } = await supabase
		.from('event_categories')
		.select('*')
		.order('name');

	return { profile, user, preferences, categories: categories ?? [] };
};

export const actions = {
	deleteCategory: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		if (!id) return;
		const { error } = await supabase.from('event_categories').delete().eq('id', id);
		if (error) {
			console.error('Delete category error:', error);
			return { success: false, error: 'No se pudo eliminar la categoría.' };
		}
		return { success: true };
	},
	createCategory: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const color = formData.get('color') as string;
		if (!name || !color) return { success: false, error: 'Faltan datos.' };
		
		const { error } = await supabase.from('event_categories').insert({ name, color });
		if (error) {
			console.error('Create category error:', error);
			return { success: false, error: 'No se pudo crear la categoría.' };
		}
		return { success: true };
	}
};
