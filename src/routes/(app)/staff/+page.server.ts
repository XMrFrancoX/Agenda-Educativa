import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
	if (profile?.role !== 'director' && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
		throw redirect(303, '/calendario');
	}

	// Cargar todos los docentes de la escuela
	const { data: teachers } = await supabase
		.from('profiles')
		.select('id, full_name, email, role')
		.eq('school_id', profile?.school_id)
		.in('role', ['teacher', 'director']);

	// Cargar grupos
	const { data: groups } = await supabase
		.from('staff_groups')
		.select(`
			id, name,
			staff_group_members (
				user_id,
				profiles ( full_name, avatar_url )
			)
		`)
		.eq('school_id', profile?.school_id)
		.order('name');

	return {
		teachers: teachers ?? [],
		groups: groups ?? []
	};
};

export const actions: Actions = {
	createGroup: async ({ request, locals: { supabase, profile } }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		if (!name) return fail(400, { error: 'El nombre es obligatorio.' });

		const { error } = await supabase
			.from('staff_groups')
			.insert({ name, school_id: profile?.school_id });

		if (error) return fail(500, { error: 'No se pudo crear el grupo.' });
		return { success: true };
	},

	addMember: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const groupId = formData.get('group_id') as string;
		const userId = formData.get('user_id') as string;
		
		if (!groupId || !userId) return fail(400, { error: 'Datos incompletos.' });

		const { error } = await supabase
			.from('staff_group_members')
			.insert({ group_id: groupId, user_id: userId });

		if (error) return fail(500, { error: 'No se pudo agregar al miembro.' });
		return { success: true };
	},

	removeMember: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const groupId = formData.get('group_id') as string;
		const userId = formData.get('user_id') as string;

		if (!groupId || !userId) return fail(400, { error: 'Datos incompletos.' });

		const { error } = await supabase
			.from('staff_group_members')
			.delete()
			.eq('group_id', groupId)
			.eq('user_id', userId);

		if (error) return fail(500, { error: 'No se pudo remover al miembro.' });
		return { success: true };
	}
};
