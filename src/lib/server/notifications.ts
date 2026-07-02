import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
const adminClient = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || '', {
	auth: { persistSession: false, autoRefreshToken: false }
});

/**
 * Envía un WhatsApp usando la API REST de Twilio con fetch nativo.
 * Compatible con Cloudflare Workers (no usa el paquete twilio que requiere Node.js).
 */
async function sendWhatsApp(to: string, body: string) {
	const accountSid = env.TWILIO_ACCOUNT_SID;
	const authToken = env.TWILIO_AUTH_TOKEN;
	const from = env.TWILIO_WHATSAPP_FROM;

	if (!accountSid || !authToken || !from) return;

	const credentials = btoa(`${accountSid}:${authToken}`);
	const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

	const formData = new URLSearchParams();
	formData.append('From', from);
	formData.append('To', `whatsapp:${to}`);
	formData.append('Body', body);

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Authorization': `Basic ${credentials}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: formData.toString()
	});

	if (!response.ok) {
		const errText = await response.text();
		console.error('Twilio API error:', response.status, errText);
	} else {
		const data = await response.json() as { sid: string };
		console.log('WhatsApp enviado, SID:', data.sid);
	}
}

interface NotificationParams {
	title: string;
	message: string;
	schoolId: string;
	groupId?: string | null;
	visibility?: 'private' | 'group' | 'school';
}

/**
 * Envía notificaciones por Email y WhatsApp a los usuarios correspondientes.
 */
export async function sendEventNotification({ title, message, schoolId, groupId, visibility }: NotificationParams) {
	try {
		let userIds: string[] = [];

		if (visibility === 'school') {
			const { data: users } = await adminClient
				.from('profiles')
				.select('id')
				.eq('school_id', schoolId);
			if (users) userIds = users.map(u => u.id);
		} else if (visibility === 'group' && groupId) {
			const { data: members } = await adminClient
				.from('staff_group_members')
				.select('user_id')
				.eq('group_id', groupId);
			if (members) userIds = members.map(m => m.user_id);
		} else {
			return;
		}

		if (userIds.length === 0) return;

		const { data: profiles } = await adminClient
			.from('profiles')
			.select('id, full_name, phone')
			.in('id', userIds);

		if (!profiles) return;

		// Cargar preferencias para filtrar notificaciones
		const { data: preferences } = await adminClient
			.from('user_preferences')
			.select('user_id, notify_email, notify_whatsapp')
			.in('user_id', userIds);
			
		const prefMap = new Map(preferences?.map(p => [p.user_id, p]) ?? []);

		for (const profile of profiles) {
			const userPrefs = prefMap.get(profile.id) ?? { notify_email: true, notify_whatsapp: false };

			// 1. Enviar Email
			if (userPrefs.notify_email) {
				const { data: userAuth } = await adminClient.auth.admin.getUserById(profile.id);
				const email = userAuth?.user?.email;

				if (email && env.RESEND_API_KEY) {
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
								subject: `Nuevo Evento: ${title}`,
								html: `
									<div style="font-family: sans-serif; padding: 20px;">
										<h2>Hola, ${profile.full_name || 'Usuario'}</h2>
										<p>Se ha programado un nuevo evento en tu Agenda Educativa:</p>
										<div style="background: #f3f4f6; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0;">
											<h3 style="margin: 0 0 10px 0; color: #111827;">${title}</h3>
											<p style="margin: 0; color: #4b5563;">${message}</p>
										</div>
										<p>Puedes revisar los detalles entrando al Calendario.</p>
									</div>
								`
							})
						});
						if (!res.ok) {
							const errData = await res.text();
							console.error('Error Resend API:', errData);
						}
					} catch(err) {
						console.error('Error enviando email a', email, err);
					}
				}
			}

			// 2. Enviar WhatsApp (usando fetch nativo, compatible con Cloudflare)
			if (userPrefs.notify_whatsapp && profile.phone && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM) {
				let phoneStr = profile.phone.replace(/\D/g, '');

				if (!phoneStr.startsWith('549')) {
					if (phoneStr.startsWith('54')) {
						phoneStr = phoneStr.replace(/^54/, '549');
					} else {
						phoneStr = `549${phoneStr}`;
					}
				}

				const phone = `+${phoneStr}`;
				const body = `*Agenda Educativa*\n\nHola ${profile.full_name || ''}, hay un nuevo evento programado:\n\n*${title}*\n${message}\n\nRevisa la plataforma para más detalles.`;

				await sendWhatsApp(phone, body).catch(err => console.error('Error enviando WhatsApp a', phone, err));
			}
		}

	} catch (error) {
		console.error('Error general en sendEventNotification:', error);
	}
}
