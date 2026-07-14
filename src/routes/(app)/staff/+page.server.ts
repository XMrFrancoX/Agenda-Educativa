import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';
import { sendInviteEmail } from '$lib/server/invites';
import { env } from '$env/dynamic/public';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
	if (profile?.role !== 'director' && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
		throw redirect(303, '/calendario');
	}

	const adminClient = createSupabaseAdminClient();

	// Cargar todos los docentes/directores de la escuela usando adminClient para saltear RLS
	const { data: teachers, error: teacherError } = await adminClient
		.from('profiles')
		.select('id, full_name, email, role')
		.eq('school_id', profile?.school_id)
		.in('role', ['teacher', 'director', 'admin', 'superadmin']);

	if (teacherError) console.error('Teachers load error:', teacherError.message);

	// Marcar cuentas que nunca iniciaron sesión, para ofrecer "Reenviar invitación".
	let pendingIds = new Set<string>();
	if (teachers && teachers.length > 0) {
		const { data: usersPage, error: listUsersError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
		if (listUsersError) {
			console.error('listUsers error:', listUsersError.message);
		} else {
			const teacherIds = new Set(teachers.map((t) => t.id));
			pendingIds = new Set(
				usersPage.users.filter((u) => teacherIds.has(u.id) && !u.last_sign_in_at).map((u) => u.id)
			);
		}
	}
	const teachersWithStatus = (teachers ?? []).map((t) => ({ ...t, pending: pendingIds.has(t.id) }));

	// Cargar grupos con miembros usando adminClient
	const { data: groups, error: groupError } = await adminClient
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

	if (groupError) console.error('Groups load error:', groupError.message);

	return {
		teachers: teachersWithStatus,
		groups: groups ?? []
	};
};

export const actions: Actions = {
	inviteMember: async ({ request, locals: { profile } }) => {
		if (profile?.role !== 'director' && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
			return fail(403, { error: 'No autorizado.' });
		}
		if (!profile?.school_id) return fail(403, { error: 'Sin escuela asignada.' });

		const formData = await request.formData();
		const fullName = formData.get('full_name') as string;
		const email = formData.get('email') as string;
		const role = formData.get('role') as string;

		if (!fullName || !email) return fail(400, { error: 'Nombre y email son obligatorios.' });
		if (role !== 'teacher' && role !== 'director') return fail(400, { error: 'Rol inválido.' });

		const adminClient = createSupabaseAdminClient();

		const { data, error } = await adminClient.auth.admin.generateLink({
			type: 'invite',
			email,
			options: {
				redirectTo: `${env.PUBLIC_SITE_URL}/update-password`,
				data: { full_name: fullName, role }
			}
		});

		if (error || !data?.user) {
			console.error('inviteMember generateLink error:', error);
			return fail(500, { error: `No se pudo invitar: ${error?.message ?? 'error desconocido'}` });
		}

		const { error: updateError } = await adminClient
			.from('profiles')
			.update({ school_id: profile.school_id, role })
			.eq('id', data.user.id);

		if (updateError) {
			console.error('inviteMember profile update error:', updateError);
			return fail(500, { error: 'Se creó el usuario pero no se pudo asignar a la escuela.' });
		}

		const actionLink = data.properties?.action_link;
		if (actionLink) {
			const roleLabel = role === 'director' ? 'Director/a' : 'Docente';
			const sent = await sendInviteEmail(fullName, email, roleLabel, actionLink);
			if (!sent) {
				return fail(500, { error: 'Se creó la cuenta pero no se pudo enviar el mail de invitación. Probá "Reenviar invitación".' });
			}
		}

		return { success: true };
	},

	resendInvite: async ({ request, locals: { profile } }) => {
		if (profile?.role !== 'director' && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
			return fail(403, { error: 'No autorizado.' });
		}

		const formData = await request.formData();
		const email = formData.get('email') as string;
		const fullName = (formData.get('full_name') as string) || 'Usuario';
		const role = formData.get('role') as string;

		if (!email) return fail(400, { error: 'Datos incompletos.' });

		const adminClient = createSupabaseAdminClient();

		const { data, error } = await adminClient.auth.admin.generateLink({
			type: 'recovery',
			email,
			options: { redirectTo: `${env.PUBLIC_SITE_URL}/update-password` }
		});

		if (error || !data.properties?.action_link) {
			console.error('resendInvite generateLink error:', error);
			return fail(500, { error: `No se pudo reenviar: ${error?.message ?? 'error desconocido'}` });
		}

		const roleLabel = role === 'director' ? 'Director/a' : 'Docente';
		const sent = await sendInviteEmail(fullName, email, roleLabel, data.properties.action_link);
		if (!sent) {
			return fail(500, { error: 'No se pudo enviar el mail de invitación. Revisá la configuración de Resend.' });
		}

		return { success: true };
	},

	createGroup: async ({ request, locals: { supabase, profile } }) => {
		if (profile?.role !== 'director' && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
			return fail(403, { error: 'No autorizado.' });
		}
		const formData = await request.formData();
		const name = formData.get('name') as string;
		if (!name) return fail(400, { error: 'El nombre es obligatorio.' });

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('staff_groups')
			.insert({ name, school_id: profile?.school_id });

		if (error) {
			console.error('createGroup error:', error);
			return fail(500, { error: 'No se pudo crear el grupo.' });
		}
		return { success: true };
	},

	addMember: async ({ request, locals: { supabase, profile } }) => {
		const formData = await request.formData();
		const groupId = formData.get('group_id') as string;
		const userId = formData.get('user_id') as string;

		if (!groupId || !userId) return fail(400, { error: 'Datos incompletos.' });

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('staff_group_members')
			.insert({ group_id: groupId, user_id: userId });

		if (error) {
			console.error('addMember error:', error);
			return fail(500, { error: 'No se pudo agregar al miembro.' });
		}
		return { success: true };
	},

	removeMember: async ({ request, locals: { supabase, profile } }) => {
		const formData = await request.formData();
		const groupId = formData.get('group_id') as string;
		const userId = formData.get('user_id') as string;

		if (!groupId || !userId) return fail(400, { error: 'Datos incompletos.' });

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('staff_group_members')
			.delete()
			.eq('group_id', groupId)
			.eq('user_id', userId);

		if (error) {
			console.error('removeMember error:', error);
			return fail(500, { error: 'No se pudo remover al miembro.' });
		}
		return { success: true };
	}
};
