import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';
import { sendInviteEmail } from '$lib/server/invites';

export const load: PageServerLoad = async ({ locals: { profile } }) => {
	if (profile?.role !== 'director' && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
		throw redirect(303, '/calendario');
	}

	const adminClient = createSupabaseAdminClient();

	// Cargar alumnos/tutores de la escuela usando adminClient para saltear RLS
	const { data: students, error: studentsError } = await adminClient
		.from('profiles')
		.select('id, full_name, email, role')
		.eq('school_id', profile?.school_id)
		.in('role', ['student', 'tutor']);

	if (studentsError) console.error('Students load error:', studentsError.message);

	// Marcar cuentas que nunca iniciaron sesión (invitación pendiente, típicamente
	// porque el mail nunca llegó) para poder ofrecer "Reenviar invitación".
	let pendingIds = new Set<string>();
	if (students && students.length > 0) {
		const { data: usersPage, error: listUsersError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
		if (listUsersError) {
			console.error('listUsers error:', listUsersError.message);
		} else {
			const studentIds = new Set(students.map((s) => s.id));
			pendingIds = new Set(
				usersPage.users.filter((u) => studentIds.has(u.id) && !u.last_sign_in_at).map((u) => u.id)
			);
		}
	}
	const studentsWithStatus = (students ?? []).map((s) => ({ ...s, pending: pendingIds.has(s.id) }));

	// Cargar docentes de la escuela (para asignarlos como profesores responsables de un curso)
	const { data: teachers, error: teachersError } = await adminClient
		.from('profiles')
		.select('id, full_name, email, role')
		.eq('school_id', profile?.school_id)
		.eq('role', 'teacher');

	if (teachersError) console.error('Teachers load error:', teachersError.message);

	// Cargar cursos con miembros
	const { data: courses, error: coursesError } = await adminClient
		.from('courses')
		.select(`
			id, name,
			course_members (
				user_id,
				profiles ( full_name, role, avatar_url )
			)
		`)
		.eq('school_id', profile?.school_id)
		.order('name');

	if (coursesError) console.error('Courses load error:', coursesError.message);

	return {
		students: studentsWithStatus,
		teachers: teachers ?? [],
		courses: courses ?? []
	};
};

export const actions: Actions = {
	createCourse: async ({ request, locals: { profile } }) => {
		if (profile?.role !== 'director' && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
			return fail(403, { error: 'No autorizado.' });
		}
		const formData = await request.formData();
		const name = formData.get('name') as string;
		if (!name) return fail(400, { error: 'El nombre es obligatorio.' });

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('courses')
			.insert({ name, school_id: profile?.school_id });

		if (error) {
			console.error('createCourse error:', error);
			return fail(500, { error: 'No se pudo crear el curso.' });
		}
		return { success: true };
	},

	inviteMember: async ({ request, url, locals: { profile } }) => {
		if (profile?.role !== 'director' && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
			return fail(403, { error: 'No autorizado.' });
		}
		if (!profile?.school_id) return fail(403, { error: 'Sin escuela asignada.' });

		const formData = await request.formData();
		const fullName = formData.get('full_name') as string;
		const email = formData.get('email') as string;
		const role = formData.get('role') as string;
		const courseId = formData.get('course_id') as string;

		if (!fullName || !email) return fail(400, { error: 'Nombre y email son obligatorios.' });
		if (role !== 'student' && role !== 'tutor') return fail(400, { error: 'Rol inválido.' });

		const adminClient = createSupabaseAdminClient();

		const { data, error } = await adminClient.auth.admin.generateLink({
			type: 'invite',
			email,
			options: {
				redirectTo: `${url.origin}/update-password`,
				data: { full_name: fullName, role }
			}
		});

		if (error || !data?.user) {
			console.error('inviteMember generateLink error:', error);
			return fail(500, { error: `No se pudo invitar: ${error?.message ?? 'error desconocido'}` });
		}

		const userId = data.user.id;

		const { error: updateError } = await adminClient
			.from('profiles')
			.update({ school_id: profile.school_id, role })
			.eq('id', userId);

		if (updateError) {
			console.error('inviteMember profile update error:', updateError);
			return fail(500, { error: 'Se creó el usuario pero no se pudo asignar a la escuela.' });
		}

		if (courseId) {
			const { error: memberError } = await adminClient
				.from('course_members')
				.insert({ course_id: courseId, user_id: userId });
			if (memberError) console.error('inviteMember course_members error:', memberError.message);
		}

		const actionLink = data.properties?.action_link;
		if (actionLink) {
			const roleLabel = role === 'student' ? 'Alumno/a' : 'Tutor/a';
			const sent = await sendInviteEmail(fullName, email, roleLabel, actionLink);
			if (!sent) {
				return fail(500, { error: 'Se creó la cuenta pero no se pudo enviar el mail de invitación. Probá "Reenviar invitación".' });
			}
		}

		return { success: true };
	},

	resendInvite: async ({ request, url, locals: { profile } }) => {
		if (profile?.role !== 'director' && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
			return fail(403, { error: 'No autorizado.' });
		}

		const formData = await request.formData();
		const userId = formData.get('user_id') as string;
		const email = formData.get('email') as string;
		const fullName = (formData.get('full_name') as string) || 'Usuario';
		const role = formData.get('role') as string;

		if (!userId || !email) return fail(400, { error: 'Datos incompletos.' });

		const adminClient = createSupabaseAdminClient();

		// La cuenta ya existe (se creó en la invitación original) — 'recovery'
		// genera un link válido para setear contraseña sin volver a crear el
		// usuario ni requerir que el invite original siga sin usarse.
		const { data, error } = await adminClient.auth.admin.generateLink({
			type: 'recovery',
			email,
			options: { redirectTo: `${url.origin}/update-password` }
		});

		if (error || !data.properties?.action_link) {
			console.error('resendInvite generateLink error:', error);
			return fail(500, { error: `No se pudo reenviar: ${error?.message ?? 'error desconocido'}` });
		}

		const roleLabel = role === 'student' ? 'Alumno/a' : 'Tutor/a';
		const sent = await sendInviteEmail(fullName, email, roleLabel, data.properties.action_link);
		if (!sent) {
			return fail(500, { error: 'No se pudo enviar el mail de invitación. Revisá la configuración de Resend.' });
		}

		return { success: true, resent: true };
	},

	addMember: async ({ request, locals: { profile } }) => {
		if (profile?.role !== 'director' && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
			return fail(403, { error: 'No autorizado.' });
		}
		const formData = await request.formData();
		const courseId = formData.get('course_id') as string;
		const userId = formData.get('user_id') as string;

		if (!courseId || !userId) return fail(400, { error: 'Datos incompletos.' });

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('course_members')
			.insert({ course_id: courseId, user_id: userId });

		if (error) {
			console.error('addMember error:', error);
			return fail(500, { error: 'No se pudo agregar al miembro.' });
		}
		return { success: true };
	},

	removeMember: async ({ request, locals: { profile } }) => {
		if (profile?.role !== 'director' && profile?.role !== 'admin' && profile?.role !== 'superadmin') {
			return fail(403, { error: 'No autorizado.' });
		}
		const formData = await request.formData();
		const courseId = formData.get('course_id') as string;
		const userId = formData.get('user_id') as string;

		if (!courseId || !userId) return fail(400, { error: 'Datos incompletos.' });

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('course_members')
			.delete()
			.eq('course_id', courseId)
			.eq('user_id', userId);

		if (error) {
			console.error('removeMember error:', error);
			return fail(500, { error: 'No se pudo remover al miembro.' });
		}
		return { success: true };
	}
};
