import type { APIRoute } from 'astro';
import { getSite } from '@/lib/content';
import { emailList, sender } from '@/lib/format';
import { secret } from '@/lib/env';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const POST: APIRoute = async ({ request }) => {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }

  // Trampa para bots: un campo oculto que una persona nunca llena
  if (data.honeypot) return json({ success: true });

  const name = clean(data.name, 120);
  const email = clean(data.email, 160);
  const phone = clean(data.phone, 40);
  const company = clean(data.company, 120);
  const service = clean(data.service, 120);
  const message = clean(data.message, 3000);
  // Origen del formulario: contacto (Conversemos), diagnostico (Centro de Diagnóstico) o descarga (Hub)
  const KINDS = { contacto: 'Nuevo contacto web', diagnostico: 'Nuevo diagnóstico', descarga: 'Nueva descarga' } as const;
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

  const from = sender(mail.fromName, mail.fromEmail, secret('CONTACT_FROM_EMAIL') || 'Web <onboarding@resend.dev>');
  // El aviso llega como "Nombre · Web": en la bandeja se ve quién escribió, no tu propia marca
  const fromAddress = emailList(mail.fromEmail)[0];
  const notifyFrom = fromAddress ? `${name.replace(/[<>"]/g, '')} - Web <${fromAddress}>` : from;
  const rows = [
    ['Nombre', name],
    ['Correo', email],
    ['Teléfono', phone || '—'],
    ['Empresa / Cargo', company || '—'],
    ['Servicio de interés', service || '—'],
    ['Mensaje', message || '—'],
  ];

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: notifyFrom,
      to,
      reply_to: email,
      subject: `${KINDS[kind]}: ${name}${service ? ` - ${service}` : ''}`,
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
    return json({ error: 'No pudimos enviar tu mensaje. Inténtalo de nuevo.', reason }, 502);
  }

  // Confirmación para quien escribió (CMS → Correos de los formularios). Si falla, el mensaje ya llegó.
  if (mail.autoReply && mail.autoReplyMessage.trim()) {
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
