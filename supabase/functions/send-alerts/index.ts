// ══════════════════════════════════════════════════════════════════
// Agenda Educativa — Edge Function: send-alerts
// Deno runtime (Supabase Edge Functions)
// ══════════════════════════════════════════════════════════════════
//
// DEPLOY: supabase functions deploy send-alerts
// SCHEDULE: Supabase Dashboard → Integrations → Cron
//           Name: send-event-alerts
//           Schedule: 0 * * * *  (cada hora)
//           Function: send-alerts
// ══════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY      = Deno.env.get('RESEND_API_KEY')!;
const EMAIL_FROM          = Deno.env.get('EMAIL_FROM') ?? 'Agenda Educativa <noreply@agenda-educativa.com>';
const TWILIO_ACCOUNT_SID  = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN   = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM')!;

// ─── Email sender ───────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html })
  });
  if (!res.ok) console.error(`sendEmail failed for ${to}: ${res.status} ${await res.text()}`);
  return res.ok;
}

// ─── WhatsApp sender ────────────────────────────────────────────────
async function sendWhatsApp(to: string, message: string) {
  const params = new URLSearchParams();
  params.append('From', TWILIO_WHATSAPP_FROM);
  params.append('To', `whatsapp:${to}`);
  params.append('Body', message);

  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    }
  );
  return res.ok;
}

// ─── Format date in Spanish ─────────────────────────────────────────
function formatDateES(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires'
  });
}

// ─── Email HTML template ────────────────────────────────────────────
function buildEmailHtml(event: Record<string, any>, hoursAhead: number): string {
  const dateStr = formatDateES(event.starts_at);
  const urgency = hoursAhead <= 1 ? '🚨 EN 1 HORA' : '📅 MAÑANA';
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#0f0f17;font-family:'Inter',sans-serif">
      <div style="max-width:600px;margin:0 auto;padding:2rem 1rem">
        <div style="background:#16161f;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:1.5rem;text-align:center">
            <h1 style="color:white;margin:0;font-size:1.25rem">📆 Recordatorio de Evento</h1>
            <p style="color:rgba(255,255,255,.8);margin:.5rem 0 0;font-size:.875rem">${urgency}</p>
          </div>
          <div style="padding:1.5rem">
            <h2 style="color:#e2e8f0;margin:0 0 1rem;font-size:1.125rem">${event.title}</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:.4rem 0;color:#64748b;font-size:.8rem;width:80px">📅 Fecha</td>
                <td style="padding:.4rem 0;color:#94a3b8;font-size:.875rem">${dateStr}</td>
              </tr>
              ${event.location ? `<tr><td style="padding:.4rem 0;color:#64748b;font-size:.8rem">📍 Lugar</td><td style="padding:.4rem 0;color:#94a3b8;font-size:.875rem">${event.location}</td></tr>` : ''}
              ${event.description ? `<tr><td style="padding:.4rem 0;color:#64748b;font-size:.8rem">📝 Detalle</td><td style="padding:.4rem 0;color:#94a3b8;font-size:.875rem">${event.description}</td></tr>` : ''}
            </table>
          </div>
          <div style="padding:1rem 1.5rem;border-top:1px solid rgba(255,255,255,.06);text-align:center">
            <p style="color:#475569;font-size:.75rem;margin:0">Agenda Educativa — NMF Soluciones Educativas</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ─── Resolver de destinatarios ──────────────────────────────────────
// Mismo criterio que sendEventNotification() en src/lib/server/notifications.ts
// (email inmediato al crear): 'school' → todos los profiles de la escuela,
// 'group' → miembros de staff_group_members, 'course' → miembros de
// course_members, cualquier otro caso (o 'private') → solo el creador.
// El edge function anterior nunca miraba `visibility` y siempre mandaba el
// recordatorio 24h/1h solo al creador del evento, sin importar si era para
// toda la institución — por eso solo le llegaba a esa única persona.
async function resolveRecipientIds(event: Record<string, any>): Promise<string[]> {
  if (event.visibility === 'school' && event.school_id) {
    const { data, error } = await supabase.from('profiles').select('id').eq('school_id', event.school_id);
    if (error) console.error('resolveRecipientIds (school):', error);
    return data?.map((p: any) => p.id) ?? [];
  }
  if (event.visibility === 'group' && event.group_id) {
    const { data, error } = await supabase.from('staff_group_members').select('user_id').eq('group_id', event.group_id);
    if (error) console.error('resolveRecipientIds (group):', error);
    return data?.map((m: any) => m.user_id) ?? [];
  }
  if (event.visibility === 'course' && event.course_id) {
    const { data, error } = await supabase.from('course_members').select('user_id').eq('course_id', event.course_id);
    if (error) console.error('resolveRecipientIds (course):', error);
    return data?.map((m: any) => m.user_id) ?? [];
  }
  return event.created_by ? [event.created_by] : [];
}

// ─── Procesa una ventana (24h o 1h) ─────────────────────────────────
async function processWindow(
  windowStart: Date,
  windowEnd: Date,
  notifiedColumn: 'notified_24h' | 'notified_1h',
  prefsColumn: 'notify_24h' | 'notify_1h',
  hoursAhead: number
): Promise<number> {
  const { data: events, error: eventsError } = await supabase
    .from('calendar_events')
    .select('id, title, starts_at, location, description, visibility, school_id, group_id, course_id, created_by')
    .gte('starts_at', windowStart.toISOString())
    .lte('starts_at', windowEnd.toISOString())
    .eq(notifiedColumn, false);

  if (eventsError) { console.error(`events (${notifiedColumn}) query error:`, eventsError); return 0; }
  if (!events || events.length === 0) return 0;

  let processed = 0;

  for (const event of events) {
    const userIds = await resolveRecipientIds(event);

    if (userIds.length === 0) {
      await supabase.from('calendar_events').update({ [notifiedColumn]: true }).eq('id', event.id);
      continue;
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, phone, full_name, schools(whatsapp_enabled)')
      .in('id', userIds);
    if (profilesError) console.error(`profiles query error (${notifiedColumn}):`, profilesError);

    const { data: prefsRows, error: prefsError } = await supabase
      .from('user_preferences')
      .select('user_id, notify_email, notify_whatsapp, notify_24h, notify_1h')
      .in('user_id', userIds);
    if (prefsError) console.error(`user_preferences query error (${notifiedColumn}):`, prefsError);

    const prefsByUser = new Map((prefsRows ?? []).map((p: any) => [p.user_id, p]));

    const subject = hoursAhead <= 1 ? `¡En 1 hora! ${event.title}` : `Recordatorio: ${event.title} — Mañana`;
    const message = hoursAhead <= 1
      ? `🚨 ¡En 1 hora! Agenda Educativa\n\n*${event.title}*\n🕐 ${formatDateES(event.starts_at)}${event.location ? '\n📍 ' + event.location : ''}\n\n— Agenda Educativa`
      : `📅 Recordatorio Agenda Educativa\n\n*${event.title}*\n🕐 ${formatDateES(event.starts_at)}${event.location ? '\n📍 ' + event.location : ''}\n\n— Agenda Educativa`;

    let anyNotified = false;

    for (const profile of profiles ?? []) {
      const prefs = prefsByUser.get(profile.id);
      if (prefs?.[prefsColumn] === false) continue;

      if (prefs?.notify_email !== false && profile.email) {
        const ok = await sendEmail(profile.email, subject, buildEmailHtml(event, hoursAhead));
        await supabase.from('notification_log').insert({ event_id: event.id, user_id: profile.id, channel: 'email', status: ok ? 'sent' : 'failed' });
        if (ok) anyNotified = true;
        // Espaciamos los envíos para no pegarle al rate limit de Resend
        // cuando un evento "toda la institución" tiene muchos destinatarios.
        await new Promise((r) => setTimeout(r, 400));
      }
      if ((profile as any).schools?.whatsapp_enabled && prefs?.notify_whatsapp !== false && profile.phone) {
        const ok = await sendWhatsApp(profile.phone, message);
        await supabase.from('notification_log').insert({ event_id: event.id, user_id: profile.id, channel: 'whatsapp', status: ok ? 'sent' : 'failed' });
        if (ok) anyNotified = true;
      }
    }

    await supabase.from('calendar_events').update({ [notifiedColumn]: true }).eq('id', event.id);
    if (anyNotified) processed++;
  }

  return processed;
}

// ─── Main handler ───────────────────────────────────────────────────
Deno.serve(async (_req) => {
  const now = new Date();

  // Events in ~24 hours (between 23h and 25h from now)
  const processed24h = await processWindow(
    new Date(now.getTime() + 23 * 60 * 60 * 1000),
    new Date(now.getTime() + 25 * 60 * 60 * 1000),
    'notified_24h', 'notify_24h', 24
  );

  // Events in ~1 hour. Ventana de 60 min (30-90) para garantizar que,
  // corriendo por cron cada hora en punto, siempre haya al menos un tick
  // dentro de la ventana sin importar en qué minuto empiece el evento.
  const processed1h = await processWindow(
    new Date(now.getTime() + 30 * 60 * 1000),
    new Date(now.getTime() + 90 * 60 * 1000),
    'notified_1h', 'notify_1h', 1
  );

  const results = { processed24h, processed1h };
  console.log('Alert results:', results);

  return new Response(JSON.stringify({ ok: true, ...results, timestamp: now.toISOString() }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
