import { json, type RequestHandler } from '@sveltejs/kit';

export const PUT: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();

	const allowed = ['show_teacher_events', 'notify_email', 'notify_whatsapp', 'notify_24h', 'notify_1h'];
	const updates: Record<string, boolean> = {};
	for (const key of allowed) {
		if (key in body && typeof body[key] === 'boolean') {
			updates[key] = body[key];
		}
	}

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No hay datos válidos para actualizar' }, { status: 400 });
	}

	const { error } = await locals.supabase
		.from('user_preferences')
		.upsert({
			user_id: user.id,
			...updates,
			updated_at: new Date().toISOString()
		});

	if (error) return json({ error: 'No se pudieron guardar las preferencias' }, { status: 500 });
	return json({ success: true, updated: updates });
};

export const GET: RequestHandler = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { data, error } = await locals.supabase
		.from('user_preferences')
		.select('*')
		.eq('user_id', user.id)
		.single();

	if (error && error.code !== 'PGRST116') {
		return json({ error: 'No se pudieron cargar las preferencias' }, { status: 500 });
	}

	return json(data ?? {
		show_teacher_events: false,
		notify_email: true,
		notify_whatsapp: true,
		notify_24h: true,
		notify_1h: true
	});
};
