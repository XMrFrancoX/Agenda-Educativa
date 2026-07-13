import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
	// Verificar que el usuario tenga rol 'admin' o 'superadmin'
	if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
		throw redirect(303, '/calendario');
	}

	const schoolId = profile.school_id;

	const adminClient = createSupabaseAdminClient();
	const { data: profiles } = await adminClient
		.from('profiles')
		.select(`
			id,
			full_name,
			email,
			role,
			extra_roles,
			school_id,
			schools ( name )
		`)
		.eq('school_id', schoolId)
		.order('created_at', { ascending: false });

	return {
		schools: [],
		profiles: profiles ?? []
	};
};

export const actions: Actions = {
	updateUser: async ({ request, locals: { supabase, profile } }) => {
		if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
			return fail(403, { error: 'No autorizado' });
		}

		const formData = await request.formData();
		const targetUserId = formData.get('user_id') as string;
		const role = formData.get('role') as string;
		// Roles adicionales: solo cambian qué ve el usuario en el sidebar
		// (ver Sidebar.svelte), no otorgan permisos nuevos a nivel de RLS.
		const extraRoles = formData.getAll('extra_roles') as string[];

		if (!targetUserId) return fail(400, { error: 'ID de usuario requerido.' });
		if (role === 'superadmin') return fail(403, { error: 'No autorizado a otorgar rol superadmin' });

		// El admin solo puede modificar usuarios de su propia escuela.
		// Forzamos la actualización asegurando que target coincida con su school_id.
		const { error } = await supabase
			.from('profiles')
			.update({ role, extra_roles: extraRoles.filter((r) => r !== role) })
			.eq('id', targetUserId)
			.eq('school_id', profile.school_id); // Security: only update if user belongs to same school

		if (error) {
			console.error('Error updating user:', error);
			return fail(500, { error: 'No se pudo actualizar el usuario.' });
		}

		return { success: true };
	}
};
