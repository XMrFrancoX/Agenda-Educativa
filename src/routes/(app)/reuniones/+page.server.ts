import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';
import { sendMeetingNotification } from '$lib/server/notifications';

// `date` llega como datetime-local ("YYYY-MM-DDTHH:mm") sin zona horaria. Se
// calcula el fin aproximado con aritmética UTC pura (sin involucrar la zona
// horaria del servidor) y se devuelve en el mismo formato naive, para
// insertarlo en calendar_events.ends_at igual que se guarda starts_at.
function computeEndLocalString(date: string, durationMin: number): string | null {
	if (!date.includes('T')) return null;
	const [datePart, timePart] = date.split('T');
	const [year, month, day] = datePart.split('-').map(Number);
	const [hour, minute] = timePart.slice(0, 5).split(':').map(Number);
	const startUTC = Date.UTC(year, month - 1, day, hour, minute);
	const end = new Date(startUTC + durationMin * 60000);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}T${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}`;
}

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

		// Reflejar la reunión en el Calendario para que los participantes la vean ahí
		const { data: meetingCategory } = await adminClient
			.from('event_categories')
			.select('id')
			.eq('name', 'Reunión General')
			.limit(1)
			.maybeSingle();

		await adminClient.from('calendar_events').insert({
			title,
			description: description || null,
			starts_at: date,
			ends_at: computeEndLocalString(date, duration),
			all_day: false,
			location: location || null,
			category_id: meetingCategory?.id ?? null,
			visibility: 'private',
			school_id: profile.school_id,
			created_by: profile.id,
			meeting_id: meeting.id
		});

		// Notificar a todos los participantes (incluye al creador si se agregó como participante)
		if (allParticipants.length > 0) {
			// Formateo por string, igual que en Calendario: `date` es un datetime-local
			// ("YYYY-MM-DDTHH:mm") sin zona horaria, así que parsearlo con `new Date()`
			// depende de la zona horaria del servidor y desfasa el horario mostrado.
			let dateStr = date;
			if (date.includes('T')) {
				const [datePart, timePart] = date.split('T');
				const [year, month, day] = datePart.split('-').map(Number);
				const [hour, minute] = timePart.slice(0, 5).split(':').map(Number);
				dateStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year} de ${timePart.slice(0, 5)} hs`;

				// Hora aprox. de fin = inicio + duración. Se calcula con Date.UTC/getUTC*
				// (aritmética pura sobre los números, sin tocar zona horaria del servidor).
				const startUTC = Date.UTC(year, month - 1, day, hour, minute);
				const end = new Date(startUTC + duration * 60000);
				const endTimeStr = `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}`;

				if (end.getUTCDate() === day && end.getUTCMonth() === month - 1 && end.getUTCFullYear() === year) {
					dateStr += ` a ${endTimeStr} hs (aprox.)`;
				} else {
					dateStr += ` hasta el ${String(end.getUTCDate()).padStart(2, '0')}/${String(end.getUTCMonth() + 1).padStart(2, '0')}/${end.getUTCFullYear()} a las ${endTimeStr} hs (aprox.)`;
				}
			}
			const message = `${description ? description + '\n\n' : ''}Fecha: ${dateStr}${location ? `\nLugar: ${location}` : ''}`;

			await sendMeetingNotification(title, message, allParticipants);
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

		// Mantener sincronizado el evento reflejado en el Calendario
		await adminClient
			.from('calendar_events')
			.update({
				title,
				description: description || null,
				starts_at: date,
				ends_at: computeEndLocalString(date, duration),
				location: location || null,
				updated_at: new Date().toISOString()
			})
			.eq('meeting_id', meetingId);

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
			.eq('school_id', profile?.school_id);

		if (error) return fail(500, { error: 'No se pudo eliminar la reunión.' });
		return { success: true };
	}
};
