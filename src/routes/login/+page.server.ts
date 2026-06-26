import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	login: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, { error: 'Completá todos los campos.' });
		}

		const { error } = await supabase.auth.signInWithPassword({ email, password });

		if (error) {
			console.error('Login error:', error.message);
			if (error.message.includes('Invalid login credentials')) {
				return fail(400, { error: 'Email o contraseña incorrectos.' });
			}
			if (error.message.includes('Email not confirmed')) {
				return fail(400, { error: 'Confirmá tu email antes de ingresar.' });
			}
			return fail(400, { error: 'No se pudo iniciar sesión. Intentá de nuevo.' });
		}

		throw redirect(303, '/calendario');
	}
};
