import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import twilio from 'twilio';

const adminClient = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || '', {
	auth: { persistSession: false, autoRefreshToken: false }
});

const resend = new Resend(env.RESEND_API_KEY || 're_dummy_key_to_prevent_crash_during_build');
// Initialize Twilio only if keys are present (to avoid crashing if they haven't configured it yet)
const twilioClient = (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) 
	? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN) 
	: null;

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
			// A toda la escuela (docentes y directores por defecto, o todos según la política)
			// Para no saturar, podemos notificar a todos los que tengan rol.
			const { data: users } = await adminClient
				.from('profiles')
				.select('id')
				.eq('school_id', schoolId);
			if (users) userIds = users.map(u => u.id);
		} else if (visibility === 'group' && groupId) {
			// A un grupo específico
			const { data: members } = await adminClient
				.from('staff_group_members')
				.select('user_id')
				.eq('group_id', groupId);
			if (members) userIds = members.map(m => m.user_id);
		} else {
			// Si es privado o no hay grupo, no notificamos a nadie más
			return;
		}

		if (userIds.length === 0) return;

		// Buscar correos y teléfonos de los usuarios (email no está en public.profiles)
		const { data: profiles } = await adminClient
			.from('profiles')
			.select('id, full_name, phone')
			.in('id', userIds);

		if (!profiles) return;

		for (const profile of profiles) {
			// 1. Enviar Email
			const { data: userAuth } = await adminClient.auth.admin.getUserById(profile.id);
			const email = userAuth?.user?.email;

			if (email && env.RESEND_API_KEY) {
				await resend.emails.send({
					from: env.EMAIL_FROM || 'Agenda Educativa <onboarding@resend.dev>',
					to: email,
					replyTo: 'nmfsoluciones@gmail.com',
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
				}).catch(err => console.error('Error enviando email a', email, err));
			}

			if (profile.phone && twilioClient && env.TWILIO_WHATSAPP_FROM) {
				// Formatear el teléfono para Argentina (Twilio requiere +549 seguido de la característica y número sin el 15)
				let phoneStr = profile.phone.replace(/\D/g, ''); // Limpiar cualquier espacio o guión
				
				if (!phoneStr.startsWith('549')) {
					if (phoneStr.startsWith('54')) {
						phoneStr = phoneStr.replace(/^54/, '549'); // Le falta el 9 de celular
					} else {
						phoneStr = `549${phoneStr}`; // Asumimos número local como '1169462905'
					}
				}
				
				const phone = `+${phoneStr}`;
				
				await twilioClient.messages.create({
					body: `*Agenda Educativa*\n\nHola ${profile.full_name || ''}, hay un nuevo evento programado:\n\n*${title}*\n${message}\n\nRevisa la plataforma para más detalles.`,
					from: env.TWILIO_WHATSAPP_FROM,
					to: `whatsapp:${phone}`
				}).catch(err => console.error('Error enviando WhatsApp a', phone, err));
			}
		}

	} catch (error) {
		console.error('Error general en sendEventNotification:', error);
	}
}
