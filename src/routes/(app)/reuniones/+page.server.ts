import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
	if (!profile?.id) throw redirect(303, '/login');

	const adminClient = createSupabaseAdminClient();
	const schoolId = profile.school_id;

	// Cargar reuniones de la escuela
	const { data: meetings, error: meetingsError } = await adminClient
		.from('meetings')
		.select(`
			id, title, description, date, duration_min, location, status, minutes,
			created_by,
			profiles!created_by ( full_name ),
			meeting_participants (
				user_id, status,
				profiles ( full_name )
			)
		`)
		.eq('school_id', schoolId)
		.order('date', { ascending: false });

	if (meetingsError) console.error('Meetings load error:', meetingsError.message);

	// Cargar personal de la escuela para invitar
	const { data: staff } = await adminClient
		.from('profiles')
		.select('id, full_name, role')
		.eq('school_id', schoolId)
		.in('role', ['teacher', 'director', 'admin', 'superadmin']);

	return {
		meetings: meetings ?? [],
		staff: staff ?? [],
		profile
	};
};

export const actions: Actions = {
	createMeeting: async ({ request, locals: { supabase, profile } }) => {
		if (!profile?.school_id) return fail(403, { error: 'Sin escuela asignada.' });

		const fd = await request.formData();
		const title       = fd.get('title') as string;
		const description = fd.get('description') as string;
		const date        = fd.get('date') as string;
		const duration    = parseInt(fd.get('duration_min') as string) || 60;
		const location    = fd.get('location') as string;
		const participants = fd.getAll('participants') as string[];

		if (!title) return fail(400, { error: 'El título es requerido.' });
		if (!date)  return fail(400, { error: 'La fecha es requerida.' });

		const adminClient = createSupabaseAdminClient();

		const { data: meeting, error } = await adminClient
			.from('meetings')
			.insert({
				title,
				description: description || null,
				date,
				duration_min: duration,
				location: location || null,
				school_id: profile.school_id,
				created_by: profile.id,
				status: 'scheduled'
			})
			.select('id')
			.single();

		if (error) {
			console.error('createMeeting error:', error);
			return fail(500, { error: 'No se pudo crear la reunión.' });
		}

		// Agregar participantes (incluyendo al creador)
		const allParticipants = Array.from(new Set([profile.id, ...participants]));
		if (allParticipants.length > 0) {
			await adminClient.from('meeting_participants').insert(
				allParticipants.map(uid => ({
					meeting_id: meeting.id,
					user_id: uid,
					status: uid === profile.id ? 'confirmed' : 'invited'
				}))
			);
		}

		return { success: true };
	},

	updateMinutes: async ({ request, locals: { supabase, profile } }) => {
		const fd = await request.formData();
		const meetingId = fd.get('meeting_id') as string;
		const minutes   = fd.get('minutes') as string;

		if (!meetingId) return fail(400, { error: 'ID de reunión requerido.' });

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('meetings')
			.update({ minutes: minutes || null })
			.eq('id', meetingId);

		if (error) return fail(500, { error: 'No se pudo guardar el acta.' });
		return { success: true };
	},

	updateStatus: async ({ request, locals: { supabase, profile } }) => {
		const fd = await request.formData();
		const meetingId = fd.get('meeting_id') as string;
		const status    = fd.get('status') as string;

		if (!meetingId || !status) return fail(400, { error: 'Datos incompletos.' });

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('meetings')
			.update({ status })
			.eq('id', meetingId);

		if (error) return fail(500, { error: 'No se pudo actualizar el estado.' });
		return { success: true };
	},

	updateMeeting: async ({ request, locals: { profile } }) => {
		if (!profile?.school_id) return fail(403, { error: 'Sin escuela asignada.' });

		const fd = await request.formData();
		const meetingId = fd.get('meeting_id') as string;
		const title     = fd.get('title') as string;
		const description = fd.get('description') as string;
		const date      = fd.get('date') as string;
		const duration  = parseInt(fd.get('duration_min') as string) || 60;
		const location  = fd.get('location') as string;

		if (!meetingId || !title || !date) return fail(400, { error: 'Datos incompletos.' });

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('meetings')
			.update({
				title,
				description: description || null,
				date,
				duration_min: duration,
				location: location || null
			})
			.eq('id', meetingId);

		if (error) {
			console.error('updateMeeting error:', error);
			return fail(500, { error: 'No se pudo actualizar la reunión.' });
		}
		return { success: true };
	},

	deleteMeeting: async ({ request, locals: { profile } }) => {
		const fd = await request.formData();
		const meetingId = fd.get('meeting_id') as string;

		if (!meetingId) return fail(400, { error: 'ID requerido.' });

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('meetings')
			.delete()
			.eq('id', meetingId)
			.eq('created_by', profile?.id);

		if (error) return fail(500, { error: 'No se pudo eliminar la reunión.' });
		return { success: true };
	}
};
