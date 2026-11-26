/**
 * Libro de Reclamaciones Virtual (Ley N° 29571, D.S. N° 011-2011-PCM y modificatorias).
 * Lógica pura del servidor: validación de la hoja, número correlativo y correo con la constancia.
 */
import { z } from 'astro/zod';

const str = (max: number, min = 1) => z.string().trim().min(min).max(max);
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v ?? '');

export const DOC_TYPES = ['DNI', 'Carné de extranjería', 'Pasaporte', 'RUC'] as const;

export const complaintSchema = z
  .object({
    // 1. Identificación del consumidor reclamante
    fullName: str(150, 3),
    docType: z.enum(DOC_TYPES),
    docNumber: str(20, 6).regex(/^[A-Za-z0-9-]+$/, 'Número de documento inválido'),
    address: str(250, 5),
    phone: str(30, 6),
    email: z.string().trim().max(160).pipe(z.email()),
    isMinor: z.boolean().default(false),
    guardianName: optional(150),
    // 2. Identificación del bien contratado
    goodType: z.enum(['Servicio', 'Producto Digital', 'Producto']),
    amount: optional(20).refine((v) => !v || /^\d+([.,]\d{1,2})?$/.test(v), 'Monto inválido'),
    orderRef: optional(60),
    goodDescription: str(500, 3),
    // 3. Detalle de la reclamación y pedido del consumidor
    claimType: z.enum(['Reclamo', 'Queja']),
    detail: str(3000, 10),
    request: str(1500, 3),
    acceptPrivacy: z.literal(true),
  })
  .refine((d) => !d.isMinor || d.guardianName.length >= 3, {
    path: ['guardianName'],
    message: 'Indica el nombre del padre, madre o apoderado',
  });

export type Complaint = z.infer<typeof complaintSchema>;

export interface Provider {
  businessName: string;
  tradeName: string;
  ruc: string;
  address: string;
}

/** Número de hoja: 000123-2026 */
export const formatNumber = (seq: number, year: number) => `${String(seq).padStart(6, '0')}-${year}`;

/** Respaldo cuando no hay base de datos: único y ordenable por fecha (no estrictamente correlativo) */
export function fallbackNumber(date = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`;
  return `W${stamp}${Math.floor(Math.random() * 90 + 10)}`;
}

export const limaDate = (d: Date) =>
  d.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Hoja de reclamación en HTML (va al consumidor y a la empresa) */
export function complaintEmail(
  c: Complaint,
  number: string,
  date: Date,
  provider: Provider,
  responseNote: string
) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 10px;border:1px solid #e6e0f3;background:#fcfbfd;width:38%"><b>${esc(k)}</b></td><td style="padding:6px 10px;border:1px solid #e6e0f3">${esc(v || '—').replace(/\n/g, '<br>')}</td></tr>`;
  const section = (title: string, rows: string) =>
    `<h3 style="margin:22px 0 8px;font-size:14px;color:#442f5f;text-transform:uppercase;letter-spacing:.05em">${esc(title)}</h3><table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table>`;

  return `<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:680px">
<h2 style="margin:0;color:#374151">Libro de Reclamaciones Virtual</h2>
<p style="margin:4px 0 0"><b>Hoja de Reclamación N° ${esc(number)}</b> - Fecha: ${esc(limaDate(date))}</p>
${section(
  'Datos del proveedor',
  row('Razón social', provider.businessName) +
    row('Nombre comercial', provider.tradeName) +
    row('RUC', provider.ruc) +
    row('Dirección', provider.address)
)}
${section(
  '1. Identificación del consumidor reclamante',
  row('Nombre', c.fullName) +
    row('Documento', `${c.docType} ${c.docNumber}`) +
    row('Domicilio', c.address) +
    row('Teléfono', c.phone) +
    row('Correo', c.email) +
    (c.isMinor ? row('Padre, madre o apoderado (menor de edad)', c.guardianName) : '')
)}
${section(
  '2. Identificación del bien contratado',
  row('Tipo', c.goodType) +
    row('Monto reclamado', c.amount ? `S/ ${c.amount}` : '') +
    row('N° de pedido o comprobante', c.orderRef) +
    row('Descripción', c.goodDescription)
)}
${section(
  '3. Detalle de la reclamación y pedido del consumidor',
  row('Tipo', c.claimType) + row('Detalle', c.detail) + row('Pedido', c.request)
)}
${section('4. Observaciones y acciones adoptadas por el proveedor', row('Respuesta', 'Pendiente (a completar por el proveedor).'))}
<p style="font-size:12px;color:#5b5368;margin-top:18px">${esc(responseNote)}</p>
<p style="font-size:12px;color:#5b5368">* Reclamo: disconformidad relacionada a los productos o servicios. * Queja: disconformidad no relacionada a los productos o servicios; o malestar o descontento respecto a la atención al público.</p>
</div>`;
}
