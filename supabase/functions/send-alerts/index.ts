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

// ─── Main handler ───────────────────────────────────────────────────
Deno.serve(async (_req) => {
  const now = new Date();
  const results = { processed24h: 0, processed1h: 0, errors: 0 };

  // ── Events in ~24 hours (between 23h and 25h from now) ──────────
  const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const window24hEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: events24h } = await supabase
    .from('calendar_events')
    .select('*, profiles!created_by(id, email, phone, full_name, schools(whatsapp_enabled)), user_preferences!profiles!created_by(notify_email, notify_whatsapp, notify_24h)')
    .gte('starts_at', window24hStart.toISOString())
    .lte('starts_at', window24hEnd.toISOString())
    .eq('notified_24h', false);

  for (const event of events24h ?? []) {
    const profile = (event as any).profiles;
    const prefs   = (event as any).user_preferences;
    if (!profile || prefs?.notify_24h === false) continue;

    const subject = `Recordatorio: ${event.title} — Mañana`;
    const message = `📅 Recordatorio Agenda Educativa\n\n*${event.title}*\n🕐 ${formatDateES(event.starts_at)}${event.location ? '\n📍 ' + event.location : ''}\n\n— Agenda Educativa`;

    let notified = false;
    if (prefs?.notify_email !== false && profile.email) {
      const ok = await sendEmail(profile.email, subject, buildEmailHtml(event, 24));
      await supabase.from('notification_log').insert({ event_id: event.id, user_id: profile.id, channel: 'email', status: ok ? 'sent' : 'failed' });
      if (ok) notified = true;
    }
    if (profile.schools?.whatsapp_enabled && prefs?.notify_whatsapp !== false && profile.phone) {
      const ok = await sendWhatsApp(profile.phone, message);
      await supabase.from('notification_log').insert({ event_id: event.id, user_id: profile.id, channel: 'whatsapp', status: ok ? 'sent' : 'failed' });
      if (ok) notified = true;
    }

    await supabase.from('calendar_events').update({ notified_24h: true }).eq('id', event.id);
    if (notified) results.processed24h++;
  }

  // ── Events in ~1 hour (between 45min and 75min from now) ─────────
  const window1hStart = new Date(now.getTime() + 45 * 60 * 1000);
  const window1hEnd   = new Date(now.getTime() + 75 * 60 * 1000);

  const { data: events1h } = await supabase
    .from('calendar_events')
    .select('*, profiles!created_by(id, email, phone, full_name, schools(whatsapp_enabled)), user_preferences!profiles!created_by(notify_email, notify_whatsapp, notify_1h)')
    .gte('starts_at', window1hStart.toISOString())
    .lte('starts_at', window1hEnd.toISOString())
    .eq('notified_1h', false);

  for (const event of events1h ?? []) {
    const profile = (event as any).profiles;
    const prefs   = (event as any).user_preferences;
    if (!profile || prefs?.notify_1h === false) continue;

    const subject = `¡En 1 hora! ${event.title}`;
    const message = `🚨 ¡En 1 hora! Agenda Educativa\n\n*${event.title}*\n🕐 ${formatDateES(event.starts_at)}${event.location ? '\n📍 ' + event.location : ''}\n\n— Agenda Educativa`;

    if (prefs?.notify_email !== false && profile.email) {
      const ok = await sendEmail(profile.email, subject, buildEmailHtml(event, 1));
      await supabase.from('notification_log').insert({ event_id: event.id, user_id: profile.id, channel: 'email', status: ok ? 'sent' : 'failed' });
    }
    if (profile.schools?.whatsapp_enabled && prefs?.notify_whatsapp !== false && profile.phone) {
      const ok = await sendWhatsApp(profile.phone, message);
      await supabase.from('notification_log').insert({ event_id: event.id, user_id: profile.id, channel: 'whatsapp', status: ok ? 'sent' : 'failed' });
    }

    await supabase.from('calendar_events').update({ notified_1h: true }).eq('id', event.id);
    results.processed1h++;
  }

  console.log('Alert results:', results);

  return new Response(JSON.stringify({ ok: true, ...results, timestamp: now.toISOString() }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
