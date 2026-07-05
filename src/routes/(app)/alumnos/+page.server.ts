import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createSupabaseAdminClient } from '$lib/supabase.server';

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
		students: students ?? [],
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
		if (actionLink && env.RESEND_API_KEY) {
			const roleLabel = role === 'student' ? 'Alumno/a' : 'Tutor/a';
			try {
				const res = await fetch('https://api.resend.com/emails', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${env.RESEND_API_KEY}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						from: env.EMAIL_FROM || 'Agenda Educativa <onboarding@resend.dev>',
						to: email,
						reply_to: 'nmfsoluciones@gmail.com',
						subject: 'Te invitaron a Agenda Educativa',
						html: `
							<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
								<h2 style="color: #111827; text-align: center;">Bienvenido/a a Agenda Educativa</h2>
								<p style="color: #4b5563; line-height: 1.5;">Hola ${fullName},</p>
								<p style="color: #4b5563; line-height: 1.5;">Te invitaron a sumarte a Agenda Educativa como <strong>${roleLabel}</strong>. Hacé clic en el siguiente botón para crear tu contraseña y acceder.</p>
								<div style="text-align: center; margin: 30px 0;">
									<a href="${actionLink}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Crear mi contraseña</a>
								</div>
								<p style="color: #4b5563; line-height: 1.5; font-size: 14px;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:</p>
								<p style="color: #6366f1; word-break: break-all; font-size: 14px;">${actionLink}</p>
							</div>
						`
					})
				});
				if (!res.ok) {
					const errText = await res.text();
					console.error('inviteMember Resend error:', res.status, errText);
				}
			} catch (err) {
				console.error('inviteMember Resend exception:', err);
			}
		}

		return { success: true };
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
