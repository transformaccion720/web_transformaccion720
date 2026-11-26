/**
 * Redis compartido por los endpoints (Libro de Reclamaciones, límite de envíos).
 * Usa REDIS_URL (Vercel → Storage → Redis) o Upstash REST (KV_REST_API_URL / UPSTASH_REDIS_REST_URL).
 * Sin configuración devuelve null: quien lo use decide qué hacer.
 */
import { createClient } from 'redis';
import { secret } from '@/lib/env';

type Client = Awaited<ReturnType<typeof connect>>;

function connect(url: string) {
  const client = createClient({ url, socket: { connectTimeout: 5000 } });
  const pending = client
    .on('error', (err) => {
      console.error('[redis]', err);
      drop(pending, client); // la próxima llamada reconecta
    })
    .connect();
  return pending;
}
let tcpClient: Promise<Client> | null = null;

/** Descarta una conexión rota (solo si sigue siendo la actual: no pisa una reconexión ya iniciada). */
function drop(pending: Promise<Client> | null, client?: { destroy?: () => void }) {
  if (pending && tcpClient === pending) tcpClient = null;
  try {
    client?.destroy?.();
  } catch {
    /* ya estaba cerrada */
  }
}

/** ¿Hay Redis configurado? */
export const hasRedis = () =>
  Boolean(
    secret('REDIS_URL') ||
    ((secret('KV_REST_API_URL') || secret('UPSTASH_REDIS_REST_URL')) &&
      (secret('KV_REST_API_TOKEN') || secret('UPSTASH_REDIS_REST_TOKEN')))
  );

/** Ejecuta un comando (ej: ['INCR', 'clave']). Sin Redis devuelve null; si falla, lanza error. */
export async function redis(command: (string | number)[]): Promise<unknown> {
  const args = command.map(String);
  const redisUrl = secret('REDIS_URL');
  if (redisUrl) {
    const pending = (tcpClient ??= connect(redisUrl));
    try {
      return await (await pending).sendCommand(args);
    } catch (err) {
      drop(pending);
      throw err;
    }
  }
  const url = secret('KV_REST_API_URL') || secret('UPSTASH_REDIS_REST_URL');
  const token = secret('KV_REST_API_TOKEN') || secret('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) return null;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}
