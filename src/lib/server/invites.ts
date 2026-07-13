import { env } from '$env/dynamic/private';

/**
 * Mail de invitación/reenvío compartido entre /alumnos y /staff — mismo
 * template, solo cambia el destinatario/rol/link.
 */
export async function sendInviteEmail(fullName: string, email: string, roleLabel: string, actionLink: string) {
	if (!env.RESEND_API_KEY) {
		console.error('sendInviteEmail: RESEND_API_KEY no configurada, no se envía mail.');
		return;
	}
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
							<a href="${actionLink}" style="display: inline-block; padding: 12px 24px; background-color: #0a3055; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Crear mi contraseña</a>
						</div>
						<p style="color: #4b5563; line-height: 1.5; font-size: 14px;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:</p>
						<p style="color: #0a3055; word-break: break-all; font-size: 14px;">${actionLink}</p>
					</div>
				`
			})
		});
		if (!res.ok) {
			console.error('sendInviteEmail Resend error:', res.status, await res.text());
		}
	} catch (err) {
		console.error('sendInviteEmail exception:', err);
	}
}
