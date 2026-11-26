/**
 * POST /api/reclamaciones — registra una Hoja de Reclamación.
 * 1) Valida en el servidor.  2) Asigna número correlativo (Redis: REDIS_URL o Upstash).
 * 3) Guarda el registro (Redis, se conserva al menos 2 años).  4) Envía la hoja por correo
 *    a la empresa y una copia al consumidor (Resend). Sin correo configurado no se registra nada.
 */
import type { APIRoute } from 'astro';
import { createClient } from 'redis';
import { getComplaintsBook, getSite } from '@/lib/content';
import { emailList, sender } from '@/lib/format';
import { complaintEmail, complaintSchema, fallbackNumber, formatNumber } from '@/lib/complaints';
import { secret } from '@/lib/env';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Límite simple por IP (por instancia): 5 hojas cada 10 minutos
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const env = secret;

/** Redis Cloud (Vercel → Storage → Redis): conexión por REDIS_URL, reutilizada entre envíos */
const connect = (url: string) =>
  createClient({ url, socket: { connectTimeout: 5000 } })
    .on('error', (err) => console.error('[reclamaciones] Redis', err))
    .connect();
let tcpClient: ReturnType<typeof connect> | null = null;
function tcp(url: string) {
  tcpClient ??= connect(url);
  return tcpClient;
}

async function redis(command: string[]) {
  const redisUrl = env('REDIS_URL');
  if (redisUrl) {
    try {
      return await (await tcp(redisUrl)).sendCommand(command);
    } catch (err) {
      tcpClient = null; // reintenta la conexión en el próximo envío
      throw err;
    }
  }
  // Upstash (API REST)
  const url = env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL');
  const token = env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) return null;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

async function sendMail(apiKey: string, payload: Record<string, unknown>) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400);
  }
  if (raw.honeypot) return json({ success: true, number: '—' });
  if (limited(clientAddress ?? 'anon'))
    return json({ error: 'Demasiados envíos. Intenta en unos minutos.' }, 429);

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
  ).join(',');
  if (!apiKey || !to) {
    console.error('[reclamaciones] Falta RESEND_API_KEY o COMPLAINTS_TO_EMAIL: la hoja NO se registró');
    return json({ error: 'FORM_DISABLED' }, 503);
  }

  const book = await getComplaintsBook();
  const date = new Date();
  const year = Number(date.toLocaleString('en-US', { timeZone: 'America/Lima', year: 'numeric' }));

  let number: string;
  try {
    const seq = await redis(['INCR', `reclamaciones:${year}`]);
    number = typeof seq === 'number' ? formatNumber(seq, year) : fallbackNumber(date);
    if (typeof seq === 'number')
      await redis([
        'SET',
        `reclamacion:${number}`,
        JSON.stringify({ number, date: date.toISOString(), ...c }),
      ]);
    else console.warn('[reclamaciones] Sin Redis: número no correlativo', number);
  } catch (err) {
    console.error('[reclamaciones] Redis falló, se usa número de respaldo', err);
    number = fallbackNumber(date);
  }

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

  try {
    await sendMail(apiKey, {
      from,
      to: to.split(',').map((t) => t.trim()),
      reply_to: c.email,
      subject: `[Libro de Reclamaciones] ${c.claimType} N° ${number} — ${c.fullName}`,
      html,
    });
    await sendMail(apiKey, {
      from,
      to: [c.email],
      subject: `Constancia de tu Hoja de Reclamación N° ${number} — ${book.tradeName}`,
      html,
    });
  } catch (err) {
    console.error('[reclamaciones] Error al enviar correos', err);
    return json({ error: 'No pudimos registrar tu hoja. Inténtalo de nuevo.' }, 502);
  }

  return json({ success: true, number });
};
