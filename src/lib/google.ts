/**
 * Acceso de solo lectura a Google Analytics 4 y Search Console con la cuenta de servicio ("robot").
 * La llave vive solo en Vercel (GOOGLE_SERVICE_ACCOUNT_JSON); en local puede leerse de un archivo
 * fuera del repo (GOOGLE_SERVICE_ACCOUNT_FILE). Nunca entra al código.
 */
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { secret } from '@/lib/env';

type Key = { client_email: string; private_key: string };

function loadKey(): Key | null {
  // Se leen al ejecutarse, no al compilar: la llave nunca queda dentro del código publicado
  const raw = secret('GOOGLE_SERVICE_ACCOUNT_JSON');
  const file = secret('GOOGLE_SERVICE_ACCOUNT_FILE');
  try {
    const text = raw?.trim() ? raw : file ? readFileSync(file, 'utf8') : '';
    if (!text) return null;
    // Se acepta el JSON tal cual o en base64
    const json = text.trim().startsWith('{') ? text : Buffer.from(text, 'base64').toString('utf8');
    const key = JSON.parse(json);
    return key.client_email && key.private_key ? key : null;
  } catch {
    return null;
  }
}

let cached: { token: string; until: number } | null = null;

export async function googleToken(): Promise<string | null> {
  if (cached && cached.until > Date.now()) return cached.token;
  const key = loadKey();
  if (!key) return null;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: key.client_email,
    scope:
      'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error('[métricas] Google rechazó la llave', data.error);
    return null;
  }
  cached = { token: data.access_token, until: Date.now() + 50 * 60_000 };
  return cached.token;
}

export async function googleApi<T>(token: string, url: string, body?: object): Promise<T> {
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Google respondió ${res.status}`);
  return data;
}
