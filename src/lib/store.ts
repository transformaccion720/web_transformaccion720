/**
 * Almacén de datos del servidor: Libro de Reclamaciones, contactos (leads) y límite de envíos.
 * Usa Postgres (Neon en Vercel: DATABASE_URL / POSTGRES_URL) y, si no hay, Redis (REDIS_URL / Upstash).
 * Las tablas se crean solas la primera vez. Sin ninguno configurado, las funciones devuelven null.
 */
import { neon } from '@neondatabase/serverless';
import { secret } from '@/lib/env';
import { hasRedis, redis } from '@/lib/redis';

const pgUrl = () => secret('DATABASE_URL') || secret('POSTGRES_URL');

type Sql = ReturnType<typeof neon<false, false>>;
let ready: Promise<Sql> | null = null;

/** Conexión a Postgres (HTTP, ideal para funciones serverless) con las tablas listas. */
function pg(): Promise<Sql> | null {
  const url = pgUrl();
  if (!url) return null;
  ready ??= (async () => {
    const sql = neon(url);
    await sql`CREATE TABLE IF NOT EXISTS counters (name text PRIMARY KEY, value integer NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS complaints (
      number text PRIMARY KEY, year integer NOT NULL, data jsonb NOT NULL,
      mail text NOT NULL DEFAULT 'pendiente', created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS leads (
      id bigserial PRIMARY KEY, kind text NOT NULL, email text NOT NULL, data jsonb NOT NULL,
      status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, until timestamptz NOT NULL)`;
    return sql;
  })().catch((err) => {
    ready = null; // reintenta en la próxima llamada
    throw err;
  });
  return ready;
}

/** ¿Hay base de datos configurada (Postgres o Redis)? */
export const hasStore = () => Boolean(pgUrl()) || hasRedis();

/** Siguiente número correlativo (atómico). null si no hay base de datos. */
export async function nextNumber(name: string): Promise<number | null> {
  const db = pg();
  if (db) {
    const sql = await db;
    const rows = (await sql`INSERT INTO counters (name, value) VALUES (${name}, 1)
      ON CONFLICT (name) DO UPDATE SET value = counters.value + 1 RETURNING value`) as { value: number }[];
    return Number(rows[0].value);
  }
  const seq = await redis(['INCR', `counter:${name}`]);
  return typeof seq === 'number' ? seq : null;
}

/** Guarda (o actualiza) una hoja de reclamación. */
export async function saveComplaint(number: string, year: number, data: unknown, mail: string) {
  const db = pg();
  if (db) {
    const sql = await db;
    await sql`INSERT INTO complaints (number, year, data, mail) VALUES (${number}, ${year}, ${JSON.stringify(data)}, ${mail})
      ON CONFLICT (number) DO UPDATE SET mail = EXCLUDED.mail`;
    return true;
  }
  const r = await redis([
    'SET',
    `reclamacion:${number}`,
    JSON.stringify({ number, ...(data as object), mail }),
  ]);
  if (r !== null && mail === 'pendiente') await redis(['RPUSH', `reclamaciones:index:${year}`, number]);
  return r !== null;
}

/** Registra un contacto del sitio (status: enviado / sin-enviar). */
export async function saveLead(kind: string, email: string, data: unknown, status: string) {
  const db = pg();
  if (db) {
    const sql = await db;
    await sql`INSERT INTO leads (kind, email, data, status) VALUES (${kind}, ${email}, ${JSON.stringify(data)}, ${status})`;
    return true;
  }
  const r = await redis(['LPUSH', `leads:${status}`, JSON.stringify({ kind, email, ...(data as object) })]);
  return r !== null;
}

/** Cuenta un intento en la ventana (atómico). null si no hay base de datos. */
export async function hit(key: string, windowSec: number): Promise<number | null> {
  const db = pg();
  if (db) {
    const sql = await db;
    const rows = (await sql`INSERT INTO rate_limits (key, count, until)
      VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.until < now() THEN 1 ELSE rate_limits.count + 1 END,
        until = CASE WHEN rate_limits.until < now() THEN now() + make_interval(secs => ${windowSec}) ELSE rate_limits.until END
      RETURNING count`) as { count: number }[];
    // Limpieza ocasional de ventanas vencidas
    if (Math.random() < 0.02) await sql`DELETE FROM rate_limits WHERE until < now() - interval '1 day'`;
    return Number(rows[0].count);
  }
  const k = `rl:${key}`;
  const count = await redis(['INCR', k]);
  if (typeof count !== 'number') return null;
  // Si el EXPIRE inicial falló, la clave quedaría sin vencimiento: al bloquear se revisa y se repara
  if (count === 1) await redis(['EXPIRE', k, windowSec]);
  else if ((await redis(['TTL', k])) === -1) await redis(['EXPIRE', k, windowSec]);
  return count;
}
