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

interface NotifyResult {
	sent: number;
	failed: number;
}

/**
 * Envía Email y WhatsApp a una lista concreta de usuarios. Loggea conteos y
 * causas de fallo (key faltante, dominio no verificado, etc.) porque estos
 * errores no llegan a la UI y solo se ven en los logs de Cloudflare Pages.
 */
async function notifyUsers(userIds: string[], title: string, message: string, kind: 'event' | 'meeting' = 'event'): Promise<NotifyResult> {
	if (userIds.length === 0) return { sent: 0, failed: 0 };

	if (!env.RESEND_API_KEY) {
		console.error('notifyUsers: RESEND_API_KEY no está configurada en este entorno, no se pueden enviar emails.');
	}

	const { data: profiles, error: profilesError } = await adminClient
		.from('profiles')
		.select('id, full_name, phone')
		.in('id', userIds);

	if (profilesError) {
		console.error('notifyUsers: error cargando profiles:', profilesError.message);
		return { sent: 0, failed: userIds.length };
	}
	if (!profiles || profiles.length === 0) return { sent: 0, failed: 0 };

	// Cargar preferencias para filtrar notificaciones
	const { data: preferences } = await adminClient
		.from('user_preferences')
		.select('user_id, notify_email, notify_whatsapp')
		.in('user_id', userIds);

	const prefMap = new Map(preferences?.map(p => [p.user_id, p]) ?? []);

	const subject = kind === 'meeting' ? `Nueva Reunión: ${title}` : `Nuevo Evento: ${title}`;
	const heading = kind === 'meeting'
		? 'Se ha programado una nueva reunión en tu Agenda Educativa:'
		: 'Se ha programado un nuevo evento en tu Agenda Educativa:';
	const footer = kind === 'meeting' ? 'Puedes revisar los detalles entrando a Reuniones.' : 'Puedes revisar los detalles entrando al Calendario.';

	let sent = 0;
	let failed = 0;

	for (const profile of profiles) {
		const userPrefs = prefMap.get(profile.id) ?? { notify_email: true, notify_whatsapp: false };

		// 1. Enviar Email (By-pass de userPrefs temporalmente por bug reportado)
		const { data: userAuth, error: authError } = await adminClient.auth.admin.getUserById(profile.id);
		if (authError) console.error(`notifyUsers: error obteniendo email de usuario ${profile.id}:`, authError.message);
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
						reply_to: 'nmfsoluciones@gmail.com',
						subject,
						html: `
							<div style="font-family: sans-serif; padding: 20px;">
								<h2>Hola, ${profile.full_name || 'Usuario'}</h2>
								<p>${heading}</p>
								<div style="background: #f3f4f6; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0;">
									<h3 style="margin: 0 0 10px 0; color: #111827;">${title}</h3>
									<p style="margin: 0; color: #4b5563;">${message}</p>
								</div>
								<p>${footer}</p>
							</div>
						`
					})
				});
				if (!res.ok) {
					const errData = await res.text();
					console.error(`notifyUsers: Resend API respondió ${res.status} al enviar a ${email}:`, errData);
					failed++;
				} else {
					sent++;
				}
			} catch (err) {
				console.error('notifyUsers: excepción enviando email a', email, err);
				failed++;
			}
		} else if (!email) {
			console.warn(`notifyUsers: usuario ${profile.id} no tiene email en auth.users, se omite.`);
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
			const body = `*Agenda Educativa*\n\nHola ${profile.full_name || ''}, hay ${kind === 'meeting' ? 'una nueva reunión programada' : 'un nuevo evento programado'}:\n\n*${title}*\n${message}\n\nRevisa la plataforma para más detalles.`;

			await sendWhatsApp(phone, body).catch(err => console.error('Error enviando WhatsApp a', phone, err));
		}
	}

	console.log(`notifyUsers[${kind}]: ${sent} enviados, ${failed} fallidos de ${profiles.length} destinatarios.`);
	return { sent, failed };
}

/**
 * Envía notificaciones por Email y WhatsApp a los destinatarios de un evento
 * de calendario, resueltos por escuela o por grupo según su visibilidad.
 */
export async function sendEventNotification({ title, message, schoolId, groupId, visibility }: NotificationParams): Promise<NotifyResult> {
	let userIds: string[] = [];

	try {
		if (visibility === 'school') {
			const { data: users, error } = await adminClient
				.from('profiles')
				.select('id')
				.eq('school_id', schoolId);
			if (error) console.error('sendEventNotification: error cargando profiles de la escuela:', error.message);
			userIds = users?.map(u => u.id) ?? [];
		} else if (visibility === 'group' && groupId) {
			const { data: members, error } = await adminClient
				.from('staff_group_members')
				.select('user_id')
				.eq('group_id', groupId);
			if (error) console.error('sendEventNotification: error cargando miembros del grupo:', error.message);
			userIds = members?.map(m => m.user_id) ?? [];
		} else {
			return { sent: 0, failed: 0 };
		}
	} catch (error) {
		console.error('sendEventNotification: error resolviendo destinatarios:', error);
		return { sent: 0, failed: 0 };
	}

	return notifyUsers(userIds, title, message, 'event');
}

/**
 * Envía notificaciones por Email y WhatsApp a una lista concreta de
 * participantes (usado por reuniones, donde los destinatarios ya están
 * resueltos de antemano y no dependen de school_id/group_id).
 */
export async function sendMeetingNotification(title: string, message: string, userIds: string[]): Promise<NotifyResult> {
	return notifyUsers(userIds, title, message, 'meeting');
}
