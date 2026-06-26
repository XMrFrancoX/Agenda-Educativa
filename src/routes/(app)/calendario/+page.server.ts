import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
	// Load events — RLS handles visibility automatically based on role
	const { data: events, error } = await supabase
		.from('calendar_events')
		.select(`
			id, title, description, starts_at, ends_at, all_day,
			location, visibility, category_id, created_by,
			event_categories ( id, name, color, icon ),
			profiles!created_by ( id, full_name, role )
		`)
		.order('starts_at', { ascending: true });

	if (error) console.error('Calendar load error:', error.message);

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

	return {
		events: events ?? [],
		preferences: preferences ?? {
			show_teacher_events: false,
			notify_email: true,
			notify_whatsapp: true,
			notify_24h: true,
			notify_1h: true
		},
		categories: categories ?? [],
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
		const all_day = formData.get('all_day') === 'true';
		const location = formData.get('location') as string;
		const category_id = formData.get('category_id') as string;
		const visibility = (formData.get('visibility') as string) || 'private';

		if (!title || !starts_at) {
			return fail(400, { error: 'El título y la fecha de inicio son requeridos.' });
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
				school_id: profile?.school_id,
				created_by: profile?.id
			})
			.select()
			.single();

		if (error) {
			console.error('Create event error:', error);
			return fail(500, { error: 'No se pudo crear el evento.' });
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

		if (!id || !title || !starts_at) {
			return fail(400, { error: 'Datos incompletos.' });
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

		await supabase
			.from('user_preferences')
			.upsert({
				user_id: profile?.id,
				show_teacher_events: show,
				updated_at: new Date().toISOString()
			});

		return { success: true };
	}
};
