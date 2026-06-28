import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request, locals }) => {
	// Only allow authenticated requests
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const { to, subject, html, text } = body;

	if (!to || !subject || (!html && !text)) {
		return json({ error: 'Faltan campos requeridos: to, subject, html/text' }, { status: 400 });
	}

	try {
		// Use Resend API (fetch-based, works on Cloudflare edge)
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: env.EMAIL_FROM || 'Agenda Educativa <noreply@agenda-educativa.com>',
				to: Array.isArray(to) ? to : [to],
				subject,
				html: html ?? undefined,
				text: text ?? undefined
			})
		});

		const result = await response.json() as { id?: string; error?: { message: string } };

		if (!response.ok) {
			console.error('Resend error:', result);
			return json({ error: result.error?.message ?? 'Error al enviar email' }, { status: 500 });
		}

		return json({ success: true, messageId: result.id });
	} catch (err) {
		console.error('Email send exception:', err);
		return json({ error: 'Error interno al enviar email' }, { status: 500 });
	}
};
