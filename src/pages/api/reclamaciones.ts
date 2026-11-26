/**
 * POST /api/reclamaciones — registra una Hoja de Reclamación.
 * 1) Valida en el servidor.  2) Asigna número correlativo y guarda el registro en la base de datos — Neon/Postgres o Redis (obligatoria en
 *    producción: sin base de datos no se registra nada).  3) Avisa a la empresa y envía copia al consumidor.
 * Una vez guardada, la hoja nunca se reporta como fallida (evita duplicados y saltos de numeración):
 * si un correo falla, queda marcado en el registro y el consumidor ve su número para imprimir.
 */
import type { APIRoute } from 'astro';
import { getComplaintsBook, getSite } from '@/lib/content';
import { emailList, sender } from '@/lib/format';
import { complaintEmail, complaintSchema, fallbackNumber, formatNumber } from '@/lib/complaints';
import { secret as env } from '@/lib/env';
import { hasStore, nextNumber, saveComplaint } from '@/lib/store';
import { BodyError, clientIp, isHuman, json, rateLimited, readJson } from '@/lib/api';

export const prerender = false;

async function sendMail(apiKey: string, payload: Record<string, unknown>) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let raw: Record<string, unknown>;
  try {
    raw = await readJson(request, 30_000);
  } catch (err) {
    const status = err instanceof BodyError ? err.status : 400;
    return json({ error: status === 413 ? 'Solicitud demasiado grande.' : 'Solicitud inválida.' }, status);
  }
  if (raw.honeypot) return json({ success: true, number: '—' });
  const ip = clientIp(request, clientAddress);
  // 5 hojas cada 10 minutos por IP
  if (await rateLimited(`complaint:${ip}`, 5, 600))
    return json({ error: 'Demasiados envíos. Intenta en unos minutos.' }, 429);
  if (!(await isHuman(raw.captcha || raw['cf-turnstile-response'], ip)))
    return json({ error: 'No pudimos verificar que eres una persona. Recarga e inténtalo de nuevo.' }, 403);

  const parsed = complaintSchema.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path.join('.') ?? '';
    return json({ error: 'Revisa los campos obligatorios.', field }, 400);
  }
  const c = parsed.data;

  const apiKey = env('RESEND_API_KEY');
  // Correos: CMS → Configuración general → Correos de los formularios (respaldo: variables de Vercel)
  const mail = (await getSite()).mail ?? { contactTo: '', complaintsTo: '', fromName: '', fromEmail: '' };
  const to = emailList(
    mail.complaintsTo || mail.contactTo || env('COMPLAINTS_TO_EMAIL') || env('CONTACT_TO_EMAIL') || ''
  );
  // En producción la hoja debe quedar guardada: sin correo o sin base de datos no se registra
  if (!apiKey || !to.length || (import.meta.env.PROD && !hasStore())) {
    console.error(
      '[reclamaciones] Falta RESEND_API_KEY, correo destino o base de datos: la hoja NO se registró'
    );
    return json({ error: 'FORM_DISABLED' }, 503);
  }

  const book = await getComplaintsBook();
  const date = new Date();
  const year = Number(date.toLocaleString('en-US', { timeZone: 'America/Lima', year: 'numeric' }));

  // 1) Número correlativo + registro
  let number: string;
  const record = { date: date.toISOString(), ...c };
  try {
    const seq = await nextNumber(`reclamaciones:${year}`);
    if (seq !== null) {
      const n = formatNumber(seq, year);
      number = n;
      const save = () => saveComplaint(n, year, record, 'pendiente');
      // Un reintento breve: el número ya se asignó, se evita perderlo por un fallo momentáneo
      await save().catch(async () => {
        await new Promise((r) => setTimeout(r, 300));
        return save();
      });
    } else {
      // Solo en desarrollo (en producción se exige base de datos arriba)
      number = fallbackNumber(date);
      console.warn('[reclamaciones] Sin base de datos (desarrollo): número no correlativo', number);
    }
  } catch (err) {
    console.error('[reclamaciones] Base de datos falló: la hoja NO se registró', err);
    return json({ error: 'No pudimos registrar tu hoja. Inténtalo de nuevo en unos minutos.' }, 503);
  }

  // 2) Correos: la hoja ya está registrada, así que un fallo aquí no se informa como error
  const provider = {
    businessName: book.businessName,
    tradeName: book.tradeName,
    ruc: book.ruc,
    address: book.address,
  };
  const html = complaintEmail(c, number, date, provider, book.responseNote);
  const from = sender(
    mail.fromName ? `${mail.fromName} - Libro de Reclamaciones` : '',
    mail.fromEmail,
    env('CONTACT_FROM_EMAIL') || 'Libro de Reclamaciones <onboarding@resend.dev>'
  );
  const [company, copy] = await Promise.allSettled([
    sendMail(apiKey, {
      from,
      to,
      reply_to: c.email,
      subject: `[Libro de Reclamaciones] ${c.claimType} N° ${number} — ${c.fullName}`,
      html,
    }),
    sendMail(apiKey, {
      from,
      to: [c.email],
      subject: `Constancia de tu Hoja de Reclamación N° ${number} — ${book.tradeName}`,
      html,
    }),
  ]);
  const status = `empresa:${company.status === 'fulfilled' ? 'ok' : 'error'} consumidor:${copy.status === 'fulfilled' ? 'ok' : 'error'}`;
  if (company.status === 'rejected')
    console.error(`[reclamaciones] ${number}: aviso a la empresa falló`, company.reason);
  if (copy.status === 'rejected')
    console.error(`[reclamaciones] ${number}: copia al consumidor falló`, copy.reason);
  await saveComplaint(number, year, record, status).catch((err) =>
    console.error('[reclamaciones] No se pudo guardar el estado de envío', err)
  );

  return json({ success: true, number, copySent: copy.status === 'fulfilled' });
};
