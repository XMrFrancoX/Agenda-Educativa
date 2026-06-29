import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
	// Verificar que el usuario tenga rol 'superadmin'
	if (profile?.role !== 'superadmin') {
		throw redirect(303, '/calendario');
	}

	// Obtener la lista completa de escuelas
	const { data: schools } = await supabase
		.from('schools')
		.select('*')
		.order('name');

	// Obtener la lista de todos los perfiles en la base de datos
	const { data: profiles } = await supabase
		.from('profiles')
		.select(`
			id,
			full_name,
			email,
			role,
			school_id,
			schools ( name )
		`)
		.order('created_at', { ascending: false });

	return {
		schools: schools ?? [],
		profiles: profiles ?? []
	};
};

export const actions: Actions = {
	createSchool: async ({ request, locals: { supabase, profile } }) => {
		if (profile?.role !== 'superadmin') return fail(403, { error: 'No autorizado' });

		const formData = await request.formData();
		const name = formData.get('name') as string;
		
		if (!name || name.trim() === '') {
			return fail(400, { error: 'El nombre de la escuela es obligatorio.' });
		}

		const { error } = await supabase
			.from('schools')
			.insert({ name });

		if (error) {
			console.error('Error creating school:', error);
			return fail(500, { error: 'No se pudo crear la escuela.' });
		}
		
		return { success: true };
	},

	updateUser: async ({ request, locals: { supabase, profile } }) => {
		if (profile?.role !== 'superadmin') return fail(403, { error: 'No autorizado' });

		const formData = await request.formData();
		const targetUserId = formData.get('user_id') as string;
		const role = formData.get('role') as string;
		let schoolId = formData.get('school_id') as string | null;

		if (!targetUserId) return fail(400, { error: 'ID de usuario requerido.' });
		
		// Si se seleccionó "Ninguna" (vacío), enviamos null a la BD
		if (schoolId === '') {
			schoolId = null;
		}

		const { error } = await supabase
			.from('profiles')
			.update({ role, school_id: schoolId })
			.eq('id', targetUserId);

		if (error) {
			console.error('Error updating user:', error);
			return fail(500, { error: 'No se pudo actualizar el usuario.' });
		}

		return { success: true };
	},

	uploadLogo: async ({ request, locals: { supabase, profile } }) => {
		if (profile?.role !== 'superadmin') return fail(403, { error: 'No autorizado' });

		const formData = await request.formData();
		const schoolId = formData.get('school_id') as string;
		const file = formData.get('logo') as File;

		if (!schoolId || !file || file.size === 0) {
			return fail(400, { error: 'Faltan datos o archivo inválido.' });
		}

		// Validar extensión
		const ext = file.name.split('.').pop()?.toLowerCase();
		if (!['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext ?? '')) {
			return fail(400, { error: 'Formato de imagen no soportado.' });
		}

		const fileName = `${schoolId}-${Date.now()}.${ext}`;

		const { data: uploadData, error: uploadError } = await supabase.storage
			.from('school_logos')
			.upload(fileName, file, {
				cacheControl: '3600',
				upsert: false
			});

		if (uploadError) {
			console.error('Error subiendo logo:', uploadError);
			return fail(500, { error: 'No se pudo subir la imagen.' });
		}

		const { data: publicUrlData } = supabase.storage
			.from('school_logos')
			.getPublicUrl(fileName);

		const { error: updateError } = await supabase
			.from('schools')
			.update({ logo_url: publicUrlData.publicUrl })
			.eq('id', schoolId);

		if (updateError) {
			return fail(500, { error: 'No se pudo vincular el logo a la escuela.' });
		}

		return { success: true };
	},

	toggleSchoolStatus: async ({ request, locals: { supabase, profile } }) => {
		if (profile?.role !== 'superadmin') return fail(403, { error: 'No autorizado' });

		const formData = await request.formData();
		const schoolId = formData.get('school_id') as string;
		const currentStatus = formData.get('current_status') as string;

		if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });

		const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';

		const { error } = await supabase
			.from('schools')
			.update({ status: newStatus })
			.eq('id', schoolId);

		if (error) {
			return fail(500, { error: 'No se pudo cambiar el estado de la escuela.' });
		}

		return { success: true };
	},

	deleteSchool: async ({ request, locals: { supabase, profile } }) => {
		if (profile?.role !== 'superadmin') return fail(403, { error: 'No autorizado' });

		const formData = await request.formData();
		const schoolId = formData.get('school_id') as string;

		if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });

		// La base de datos debe estar configurada con ON DELETE CASCADE
		const { error } = await supabase
			.from('schools')
			.delete()
			.eq('id', schoolId);

		if (error) {
			console.error('Error eliminando escuela:', error);
			return fail(500, { error: 'No se pudo eliminar la escuela. Verifique que no haya datos huérfanos.' });
		}

		return { success: true };
	},

	updateColor: async ({ request, locals: { supabase, profile } }) => {
		if (profile?.role !== 'superadmin') return fail(403, { error: 'No autorizado' });

		const formData = await request.formData();
		const schoolId = formData.get('school_id') as string;
		const color = formData.get('color') as string;

		if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });

		const { error } = await supabase
			.from('schools')
			.update({ primary_color: color || null })
			.eq('id', schoolId);

		if (error) {
			return fail(500, { error: 'No se pudo actualizar el color.' });
		}

		return { success: true };
	},

	updateDomain: async ({ request, locals: { supabase, profile } }) => {
		if (profile?.role !== 'superadmin') return fail(403, { error: 'No autorizado' });

		const formData = await request.formData();
		const schoolId = formData.get('school_id') as string;
		let domain = formData.get('domain') as string;

		if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });

		// Limpiar el dominio (quitar https://, espacios, etc)
		if (domain) {
			domain = domain.trim().toLowerCase();
			domain = domain.replace(/^https?:\/\//, '');
			domain = domain.replace(/\/$/, '');
		}

		const { error } = await supabase
			.from('schools')
			.update({ custom_domain: domain || null })
			.eq('id', schoolId);

		if (error) {
			if (error.code === '23505') {
				return fail(400, { error: 'Este dominio ya está registrado por otra escuela.' });
			}
			return fail(500, { error: 'No se pudo actualizar el dominio.' });
		}

		return { success: true };
	}
};
