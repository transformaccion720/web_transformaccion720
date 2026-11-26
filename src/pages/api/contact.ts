import type { APIRoute } from 'astro';
import { getSite } from '@/lib/content';
import { emailList, escHtml as esc, sender } from '@/lib/format';
import { secret } from '@/lib/env';
import { BodyError, clientIp, isHuman, json, rateLimited, readJson } from '@/lib/api';
import { saveLead } from '@/lib/store';

export const prerender = false;

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let data: Record<string, unknown>;
  try {
    data = await readJson(request, 20_000);
  } catch (err) {
    const status = err instanceof BodyError ? err.status : 400;
    return json({ error: status === 413 ? 'Solicitud demasiado grande.' : 'Solicitud inválida.' }, status);
  }

  // Trampa para bots: un campo oculto que una persona nunca llena
  if (data.honeypot) return json({ success: true });
  const ip = clientIp(request, clientAddress);
  // 8 envíos cada 10 minutos por IP (compartido entre instancias si hay Redis)
  if (await rateLimited(`contact:${ip}`, 8, 600))
    return json({ error: 'Demasiados envíos. Intenta en unos minutos.' }, 429);
  if (!(await isHuman(data.captcha || data['cf-turnstile-response'], ip)))
    return json({ error: 'No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.' }, 403);

  const name = clean(data.name, 120);
  const email = clean(data.email, 160);
  const phone = clean(data.phone, 40);
  const company = clean(data.company, 120);
  const service = clean(data.service, 120);
  const message = clean(data.message, 3000);
  // Origen del formulario: contacto (Conversemos), diagnostico (Centro de Diagnóstico) o descarga (Hub)
  const KINDS = {
    contacto: 'Nuevo contacto web',
    diagnostico: 'Nuevo diagnóstico',
    descarga: 'Nueva descarga',
  } as const;
  const kind = (clean(data.kind, 20) in KINDS ? clean(data.kind, 20) : 'contacto') as keyof typeof KINDS;

  if (!name || !email) return json({ error: 'Nombre y correo son obligatorios.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'El correo no parece válido.' }, 400);

  // Correos: CMS → Configuración general → Correos de los formularios (respaldo: variables de Vercel)
  const site = await getSite();
  const mail = site.mail;
  const apiKey = secret('RESEND_API_KEY');
  const to = emailList(mail.contactTo || secret('CONTACT_TO_EMAIL'));
  if (!apiKey || !to.length) {
    console.warn('[contacto] RESEND_API_KEY o CONTACT_TO_EMAIL no configurados: mensaje NO enviado');
    return json({ error: 'FORM_DISABLED' }, 503);
  }

  const from = sender(
    mail.fromName,
    mail.fromEmail,
    secret('CONTACT_FROM_EMAIL') || 'Web <onboarding@resend.dev>'
  );
  const rows = [
    ['Nombre', name],
    ['Correo', email],
    ['Teléfono', phone || '—'],
    ['Empresa / Cargo', company || '—'],
    ['Servicio de interés', service || '—'],
    ['Mensaje', message || '—'],
  ];

  const lead = { date: new Date().toISOString(), name, phone, company, service, message };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to,
      reply_to: email,
      subject: `${KINDS[kind]}: ${name}${service ? ` - ${service}` : ''}`.replace(/\s+/g, ' '),
      html: `<h2>${KINDS[kind]} desde la web</h2><table cellpadding="6">${rows
        .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>`)
        .join('')}</table><p>Responde a este correo para contestarle directamente.</p>`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('[contacto] Resend respondió', res.status, detail);
    let reason = '';
    try {
      reason = String(JSON.parse(detail).message ?? '');
    } catch {
      /* respuesta no JSON */
    }
    console.error('[contacto] Motivo:', reason);
    // Respaldo: el contacto no se pierde aunque el correo falle (tabla leads, estado "sin-enviar")
    const saved = await saveLead(kind, email, lead, 'sin-enviar').catch(() => false);
    if (saved) console.warn('[contacto] Correo falló; contacto guardado como "sin-enviar"');
    // En descargas la persona igual recibe su recurso; en el resto se le pide reintentar
    if (saved && kind === 'descarga') return json({ success: true });
    return json({ error: 'No pudimos enviar tu mensaje. Inténtalo de nuevo.' }, 502);
  }

  // Registro del contacto (base de leads); si falla, el correo ya llegó
  await saveLead(kind, email, lead, 'enviado').catch((err) =>
    console.warn('[contacto] No se pudo registrar el contacto', err)
  );

  // Confirmación para quien escribió (CMS → Correos de los formularios). Si falla, el mensaje ya llegó.
  // Máx. 2 confirmaciones por correo destino cada hora: evita usar el formulario para enviar spam a terceros
  if (
    mail.autoReply &&
    mail.autoReplyMessage.trim() &&
    !(await rateLimited(`reply:${email.toLowerCase()}`, 2, 3600))
  ) {
    const body = esc(mail.autoReplyMessage.trim())
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
    const reply = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: to[0],
        subject: mail.autoReplySubject.trim() || 'Recibimos tu mensaje',
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#1f2937"><p>Hola ${esc(name.split(/\s+/)[0])},</p>${body}</div>`,
      }),
    }).catch(() => null);
    if (!reply?.ok) console.warn('[contacto] No se pudo enviar la confirmación a quien escribió');
  }

  return json({ success: true });
};
