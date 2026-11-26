/**
 * Utilidades HTTP puras de los endpoints (sin Astro ni Redis): se prueban directo con node.
 */
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export class BodyError extends Error {
  status: 400 | 413;
  constructor(status: 400 | 413) {
    super(status === 413 ? 'Solicitud demasiado grande.' : 'Solicitud inválida.');
    this.status = status;
  }
}

/** Lee el cuerpo como JSON sin pasar de maxBytes (no confía en content-length). */
export async function readJson(request: Request, maxBytes = 20_000): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes) throw new BodyError(413);
  const reader = request.body?.getReader();
  if (!reader) throw new BodyError(400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new BodyError(413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data as Record<string, unknown>;
  } catch {
    throw new BodyError(400);
  }
}

/** IP real del visitante (Vercel la pone en x-forwarded-for / x-real-ip). */
export function clientIp(request: Request, fallback?: string) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || fallback || 'anon';
}
