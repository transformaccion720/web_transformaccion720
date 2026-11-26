/**
 * Utilidades comunes de los endpoints /api: respuesta JSON, lectura acotada del cuerpo,
 * IP del visitante, límite de envíos (Redis si existe; si no, memoria) y verificación anti-bot opcional.
 */
import { redis } from '@/lib/redis';
import { secret } from '@/lib/env';

export { BodyError, clientIp, json, readJson } from './http';

// Respaldo en memoria (desarrollo o sin Redis), con limpieza de entradas vencidas
const memory = new Map<string, { count: number; until: number }>();

/** true si la clave superó `max` intentos en `windowSec` segundos. */
export async function rateLimited(key: string, max: number, windowSec: number) {
  try {
    const k = `rl:${key}`;
    const count = await redis(['INCR', k]);
    if (typeof count === 'number') {
      // Si el EXPIRE inicial falló, la clave quedaría sin vencimiento: al bloquear se revisa y se repara
      // (nunca queda un bloqueo para siempre)
      if (count === 1) await redis(['EXPIRE', k, windowSec]);
      else if (count > max && (await redis(['TTL', k])) === -1) await redis(['EXPIRE', k, windowSec]);
      return count > max;
    }
  } catch (err) {
    console.warn('[api] Límite con Redis no disponible, se usa memoria', err);
  }
  const now = Date.now();
  if (memory.size > 5000) for (const [k, v] of memory) if (v.until < now) memory.delete(k);
  const entry = memory.get(key);
  if (!entry || entry.until < now) {
    memory.set(key, { count: 1, until: now + windowSec * 1000 });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

/**
 * Cloudflare Turnstile (anti-bot invisible). Opcional: solo se exige si TURNSTILE_SECRET_KEY está
 * configurada (y PUBLIC_TURNSTILE_SITE_KEY para mostrar el widget en los formularios).
 */
let warned = false;
export async function isHuman(token: unknown, ip: string) {
  const key = secret('TURNSTILE_SECRET_KEY');
  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;
  // Las dos claves van juntas: con una sola, los formularios no tendrían widget o no se validaría
  if (!key || !siteKey) {
    if ((key || siteKey) && !warned) {
      warned = true;
      console.error(
        '[api] Turnstile mal configurado: define PUBLIC_TURNSTILE_SITE_KEY y TURNSTILE_SECRET_KEY juntas. Verificación desactivada.'
      );
    }
    return true;
  }
  if (typeof token !== 'string' || !token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: key, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    return Boolean(((await res.json()) as { success?: boolean }).success);
  } catch (err) {
    console.error('[api] Turnstile no respondió', err);
    return false;
  }
}
