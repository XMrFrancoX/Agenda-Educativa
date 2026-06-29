import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * Send a WhatsApp message via Twilio REST API (no SDK needed — pure fetch).
 * Works on Cloudflare Workers edge runtime.
 *
 * Body: { to: string, message: string, contentSid?: string, variables?: Record<string,string> }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const { to, message, contentSid, variables } = body;

	if (!to) return json({ error: 'El número de destino es requerido (formato E.164: +5491112345678)' }, { status: 400 });

	// Twilio credentials
	const accountSid = env.TWILIO_ACCOUNT_SID;
	const authToken  = env.TWILIO_AUTH_TOKEN;
	const from       = env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"

	// Build form-encoded body for Twilio REST API
	const params = new URLSearchParams();
	params.append('From', from);
	params.append('To', `whatsapp:${to}`);

	if (contentSid) {
		// Template message (production — needs approved template)
		params.append('ContentSid', contentSid);
		if (variables) {
			params.append('ContentVariables', JSON.stringify(variables));
		}
	} else if (message) {
		// Free-form message (only works within 24h session window or sandbox)
		params.append('Body', message);
	} else {
		return json({ error: 'Se requiere message o contentSid' }, { status: 400 });
	}

	try {
		const credentials = btoa(`${accountSid}:${authToken}`);
		const response = await fetch(
			`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
			{
				method: 'POST',
				headers: {
					'Authorization': `Basic ${credentials}`,
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: params.toString()
			}
		);

		const result = await response.json() as { sid?: string; error_message?: string; error_code?: number };

		if (!response.ok) {
			console.error('Twilio error:', result);
			return json(
				{ error: result.error_message ?? 'Error al enviar WhatsApp', code: result.error_code },
				{ status: 500 }
			);
		}

		return json({ success: true, sid: result.sid });
	} catch (err) {
		console.error('WhatsApp send exception:', err);
		return json({ error: 'Error interno al enviar WhatsApp' }, { status: 500 });
	}
};
