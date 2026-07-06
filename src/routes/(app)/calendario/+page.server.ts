import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { sendEventNotification } from '$lib/server/notifications';

const TASK_PRIORITY_COLOR: Record<string, string> = {
	low: '#10b981',
	medium: '#f59e0b',
	high: '#ef4444'
};

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
	// Load events — RLS handles visibility automatically based on role.
	// school_id se filtra explícitamente para que, al cambiar de colegio,
	// no aparezcan eventos privados/propios creados en un colegio anterior.
	const { data: events, error } = await supabase
		.from('calendar_events')
		.select(`
			id, title, description, starts_at, ends_at, all_day,
			location, visibility, category_id, created_by,
			group_id, course_id, meeting_id,
			event_categories ( id, name, color, icon ),
			profiles!created_by ( id, full_name, role )
		`)
		.eq('school_id', profile?.school_id)
		.order('starts_at', { ascending: true });

	if (error) console.error('Calendar load error:', error.message);

	// Reflejar en el calendario las tareas propias con fecha límite — privadas:
	// solo las ve quien las creó o a quien están asignadas (nunca otros usuarios).
	let taskEvents: Record<string, any>[] = [];
	if (profile?.id) {
		const { data: tasks, error: tasksError } = await supabase
			.from('tasks')
			.select('id, title, description, due_date, status, priority, created_by')
			.eq('school_id', profile.school_id)
			.not('due_date', 'is', null)
			.or(`created_by.eq.${profile.id},assigned_to.eq.${profile.id}`);

		if (tasksError) console.error('Calendar tasks load error:', tasksError.message);

		taskEvents = (tasks ?? []).map((t) => ({
			id: `task-${t.id}`,
			task_id: t.id,
			title: t.title,
			description: t.description,
			starts_at: t.due_date,
			ends_at: null,
			all_day: true,
			visibility: 'private',
			created_by: t.created_by,
			status: t.status,
			priority: t.priority,
			event_categories: { name: 'Tarea', color: TASK_PRIORITY_COLOR[t.priority] ?? '#2563eb' }
		}));
	}

	// Load user preferences (for director toggle)
	const { data: preferences } = await supabase
		.from('user_preferences')
		.select('show_teacher_events, notify_email, notify_whatsapp, notify_24h, notify_1h')
		.eq('user_id', profile?.id ?? '')
		.single();

	// Load event categories for the form dropdown
	const { data: categories } = await supabase
		.from('event_categories')
		.select('id, name, color, icon')
		.order('name');

	const { data: groups } = await supabase
		.from('staff_groups')
		.select('id, name')
		.eq('school_id', profile?.school_id)
		.order('name');

	// Los docentes solo pueden targetear los cursos donde el director los asignó
	// como profesor responsable (course_members); director/admin/superadmin ven todos.
	let courses: { id: string; name: string }[] = [];
	if (profile?.role === 'teacher') {
		const { data: memberships } = await supabase
			.from('course_members')
			.select('courses ( id, name )')
			.eq('user_id', profile.id);
		courses = (memberships ?? [])
			.map((m: any) => m.courses)
			.filter((c: any): c is { id: string; name: string } => !!c);
	} else {
		const { data } = await supabase
			.from('courses')
			.select('id, name')
			.eq('school_id', profile?.school_id)
			.order('name');
		courses = data ?? [];
	}

	return {
		events: [...(events ?? []), ...taskEvents],
		preferences: preferences ?? {
			show_teacher_events: false,
			notify_email: true,
			notify_whatsapp: true,
			notify_24h: true,
			notify_1h: true
		},
		categories: categories ?? [],
		groups: groups ?? [],
		courses: courses ?? [],
		profile
	};
};

export const actions: Actions = {
	createEvent: async ({ request, locals: { supabase, profile } }) => {
		const formData = await request.formData();

		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const starts_at = formData.get('starts_at') as string;
		const ends_at = formData.get('ends_at') as string;
		const all_day = formData.get('all_day') === 'on' || formData.get('all_day') === 'true';
		const location = formData.get('location') as string;
		const category_id = formData.get('category_id') as string;
		const visibility = (formData.get('visibility') as string) || 'private';

		const group_id = formData.get('group_id') as string;
		const course_id = formData.get('course_id') as string;

		if (!title || !starts_at) {
			return fail(400, { error: 'El título y la fecha de inicio son requeridos.' });
		}

		// Un docente solo puede crear eventos de curso para cursos donde el
		// director lo haya asignado como profesor responsable.
		if (profile?.role === 'teacher' && visibility === 'course') {
			if (!course_id) return fail(400, { error: 'Seleccioná un curso.' });
			const { data: membership } = await supabase
				.from('course_members')
				.select('course_id')
				.eq('course_id', course_id)
				.eq('user_id', profile.id)
				.maybeSingle();
			if (!membership) return fail(403, { error: 'No sos profesor responsable de ese curso.' });
		}

		const { data: event, error } = await supabase
			.from('calendar_events')
			.insert({
				title,
				description: description || null,
				starts_at,
				ends_at: ends_at || null,
				all_day,
				location: location || null,
				category_id: category_id || null,
				visibility,
				group_id: visibility === 'group' && group_id ? group_id : null,
				course_id: visibility === 'course' && course_id ? course_id : null,
				school_id: profile?.school_id,
				created_by: profile?.id
			})
			.select()
			.single();

		if (error) {
			console.error('Create event error:', error);
			return fail(500, { error: `No se pudo crear el evento: ${error.message} (Code: ${error.code})` });
		}

		// Disparar notificaciones en segundo plano si es para un grupo, un curso o toda la escuela
		if ((visibility === 'group' || visibility === 'course' || visibility === 'school') && profile?.school_id) {
			let dateStr = starts_at.split('T')[0]; // simple date formatting
			if (!all_day && starts_at.includes('T')) {
				const timeStr = starts_at.split('T')[1].slice(0, 5);
				dateStr += ` a las ${timeStr} hs`;
				
				if (ends_at && ends_at.includes('T')) {
					const endTimeStr = ends_at.split('T')[1].slice(0, 5);
					const endDateStr = ends_at.split('T')[0];
					if (endDateStr === starts_at.split('T')[0]) {
						dateStr += ` hasta las ${endTimeStr} hs`;
					} else {
						dateStr += ` hasta el ${endDateStr} a las ${endTimeStr} hs`;
					}
				}
			} else if (all_day && ends_at) {
				const endDateStr = ends_at.split('T')[0];
				if (endDateStr !== starts_at.split('T')[0]) {
					dateStr += ` hasta el ${endDateStr}`;
				}
			}
			
			await sendEventNotification({
				title,
				message: `${description ? description + '\n\n' : ''}Fecha programada: ${dateStr}`,
				schoolId: profile.school_id,
				groupId: group_id,
				courseId: course_id,
				visibility: visibility as 'group' | 'course' | 'school'
			});
		}

		return { success: true, event };
	},

	updateEvent: async ({ request, locals: { supabase, profile } }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const starts_at = formData.get('starts_at') as string;
		const ends_at = formData.get('ends_at') as string;
		const all_day = formData.get('all_day') === 'true';
		const location = formData.get('location') as string;
		const category_id = formData.get('category_id') as string;
		const visibility = formData.get('visibility') as string;
		const group_id = formData.get('group_id') as string;
		const course_id = formData.get('course_id') as string;

		if (!id || !title || !starts_at) {
			return fail(400, { error: 'Datos incompletos.' });
		}

		if (profile?.role === 'teacher' && visibility === 'course') {
			if (!course_id) return fail(400, { error: 'Seleccioná un curso.' });
			const { data: membership } = await supabase
				.from('course_members')
				.select('course_id')
				.eq('course_id', course_id)
				.eq('user_id', profile.id)
				.maybeSingle();
			if (!membership) return fail(403, { error: 'No sos profesor responsable de ese curso.' });
		}

		const { error } = await supabase
			.from('calendar_events')
			.update({
				title,
				description: description || null,
				starts_at,
				ends_at: ends_at || null,
				all_day,
				location: location || null,
				category_id: category_id || null,
				visibility,
				group_id: visibility === 'group' && group_id ? group_id : null,
				course_id: visibility === 'course' && course_id ? course_id : null,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.eq('created_by', profile?.id); // extra safety: only owner can update

		if (error) return fail(500, { error: 'No se pudo actualizar el evento.' });
		return { success: true };
	},

	deleteEvent: async ({ request, locals: { supabase, profile } }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { error: 'ID de evento requerido.' });

		const { error } = await supabase
			.from('calendar_events')
			.delete()
			.eq('id', id)
			.eq('created_by', profile?.id);

		if (error) return fail(500, { error: 'No se pudo eliminar el evento.' });
		return { success: true };
	},

	toggleTeacherEvents: async ({ request, locals: { supabase, profile } }) => {
		const formData = await request.formData();
		const show = formData.get('show_teacher_events') === 'true';

		const { error } = await supabase
			.from('user_preferences')
			.upsert({
				user_id: profile?.id,
				show_teacher_events: show,
				updated_at: new Date().toISOString()
			});

		if (error) return fail(500, { error: 'No se pudo guardar la preferencia.' });
		return { success: true };
	},

	createCategory: async ({ request, locals: { supabase, profile } }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const color = formData.get('color') as string;

		if (!name || !color) return fail(400, { error: 'Nombre y color son requeridos.' });

		const { data, error } = await supabase
			.from('event_categories')
			.insert({ name, color })
			.select()
			.single();

		if (error) {
			console.error('Create category error:', error);
			return fail(500, { error: 'No se pudo crear la categoría.' });
		}
		return { success: true, category: data };
	}
};
