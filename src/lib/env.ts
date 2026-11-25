/**
 * Claves secretas (Resend, Redis, Google…): se leen al ejecutarse, nunca al compilar.
 * `import.meta.env.X` copia el valor dentro del código publicado; `getSecret` no.
 * En local salen del archivo .env; en producción, de Vercel → Settings → Environment Variables.
 */
import { getSecret } from 'astro:env/server';

export const secret = (key: string): string => (getSecret(key) as string | undefined)?.trim() || '';
