import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { Resend } from 'resend';

export const actions: Actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;

		if (!email) return fail(400, { error: 'El email es obligatorio' });

		try {
			// Usamos Service Role para saltar las validaciones estrictas de dominios de Supabase Auth
			const adminAuthClient = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || '', {
				auth: {
					autoRefreshToken: false,
					persistSession: false,
					flowType: 'implicit'
				}
			});

			const { data, error } = await adminAuthClient.auth.admin.generateLink({
				type: 'recovery',
				email,
				options: {
					redirectTo: `${url.origin}/update-password`
				}
			});

			if (error || !data.properties?.action_link) {
				console.error('generateLink error:', error);
				// Devolvemos success igual por seguridad, para no revelar qué emails existen en la BD
				return { success: true };
			}

			const actionLink = data.properties.action_link;
			const resend = new Resend(env.RESEND_API_KEY || 're_dummy_key');
			
			if (env.RESEND_API_KEY) {
				const { error: resendError } = await resend.emails.send({
					from: env.EMAIL_FROM || 'Agenda Educativa <onboarding@resend.dev>',
					to: email,
					replyTo: 'nmfsoluciones@gmail.com',
					subject: 'Recuperación de Contraseña - Agenda Educativa',
					html: `
						<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
							<h2 style="color: #111827; text-align: center;">Recuperación de Contraseña</h2>
							<p style="color: #4b5563; line-height: 1.5;">Hola,</p>
							<p style="color: #4b5563; line-height: 1.5;">Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña. <strong>Este enlace expirará en 24 horas</strong>.</p>
							<div style="text-align: center; margin: 30px 0;">
								<a href="${actionLink}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Restablecer mi contraseña</a>
							</div>
							<p style="color: #4b5563; line-height: 1.5; font-size: 14px;">Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
							<p style="color: #6366f1; word-break: break-all; font-size: 14px;">${actionLink}</p>
							<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
							<p style="color: #9ca3af; font-size: 12px; text-align: center;">Si no solicitaste este correo, puedes ignorarlo de forma segura. Tu contraseña no cambiará hasta que accedas al enlace de arriba y crees una nueva.</p>
						</div>
				`
			});

			if (resendError) {
				console.error('Resend error:', resendError);
			}
			}

			return { success: true };
		} catch (err) {
			console.error('Error in recovery flow:', err);
			// Mismo tratamiento de seguridad por error interno
			return { success: true };
		}
	}
};
