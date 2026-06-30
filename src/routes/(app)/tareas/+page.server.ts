import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
	if (!profile?.id) return { tasks: [], profile };

	const adminClient = createSupabaseAdminClient();

	// Cargar tareas de la escuela del usuario (las creadas por él o asignadas a él)
	const { data: tasks, error } = await adminClient
		.from('tasks')
		.select(`
			id, title, description, due_date, status, priority,
			created_by, assigned_to,
			profiles!assigned_to ( id, full_name, role )
		`)
		.eq('school_id', profile.school_id)
		.or(`created_by.eq.${profile.id},assigned_to.eq.${profile.id}`)
		.order('created_at', { ascending: false });

	if (error) console.error('Tasks load error:', error.message);

	return { tasks: tasks ?? [], profile };
};

export const actions: Actions = {
	createTask: async ({ request, locals: { supabase, profile } }) => {
		const fd = await request.formData();
		const title = fd.get('title') as string;
		const description = fd.get('description') as string;
		const due_date = fd.get('due_date') as string;
		const priority = (fd.get('priority') as string) ?? 'medium';

		if (!title) return fail(400, { error: 'El título es requerido.' });
		if (!profile?.school_id) return fail(400, { error: 'Sin escuela asignada.' });

		const { error } = await supabase.from('tasks').insert({
			title,
			description: description || null,
			due_date: due_date || null,
			priority,
			status: 'pending',
			school_id: profile?.school_id,
			created_by: profile?.id,
			assigned_to: profile?.id
		});

		if (error) {
			console.error('createTask error:', error);
			return fail(500, { error: `No se pudo crear la tarea: ${error.message}` });
		}
		return { success: true };
	},

	updateStatus: async ({ request, locals: { supabase, profile } }) => {
		const fd = await request.formData();
		const id = fd.get('id') as string;
		const status = fd.get('status') as string;

		if (!id || !status) return fail(400, { error: 'Datos incompletos.' });

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('tasks')
			.update({ status })
			.eq('id', id);

		if (error) return fail(500, { error: 'No se pudo actualizar el estado.' });
		return { success: true };
	},

	deleteTask: async ({ request, locals: { supabase, profile } }) => {
		const fd = await request.formData();
		const id = fd.get('id') as string;

		const adminClient = createSupabaseAdminClient();
		const { error } = await adminClient
			.from('tasks')
			.delete()
			.eq('id', id)
			.eq('created_by', profile?.id);

		if (error) return fail(500, { error: 'No se pudo eliminar la tarea.' });
		return { success: true };
	}
};
