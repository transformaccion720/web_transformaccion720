// Utilidades HTTP de los endpoints: lectura acotada del cuerpo, IP real y respuestas JSON.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BodyError, clientIp, json, readJson } from '../src/lib/http.ts';

const req = (body, headers = {}) =>
  new Request('http://x/api', { method: 'POST', body, headers, duplex: 'half' });

test('readJson: lee un objeto JSON válido', async () => {
  assert.deepEqual(await readJson(req('{"a":1}')), { a: 1 });
});

test('readJson: rechaza JSON inválido, arrays y cuerpos vacíos (400)', async () => {
  for (const body of ['{no', '[1,2]', 'null', ''])
    await assert.rejects(readJson(req(body)), (e) => e instanceof BodyError && e.status === 400, body);
});

test('readJson: corta cuerpos grandes aunque no declaren tamaño (413)', async () => {
  const big = new ReadableStream({
    start(c) {
      for (let i = 0; i < 10; i++) c.enqueue(new TextEncoder().encode('x'.repeat(5000)));
      c.close();
    },
  });
  await assert.rejects(readJson(req(big), 20_000), (e) => e.status === 413);
  await assert.rejects(readJson(req('{}', { 'content-length': '999999' }), 1000), (e) => e.status === 413);
});

test('clientIp: usa la IP del proxy de Vercel', () => {
  assert.equal(
    clientIp(new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } })),
    '1.2.3.4'
  );
  assert.equal(clientIp(new Request('http://x', { headers: { 'x-real-ip': '5.6.7.8' } })), '5.6.7.8');
  assert.equal(clientIp(new Request('http://x'), '9.9.9.9'), '9.9.9.9');
});

test('json: respuestas sin caché', async () => {
  const r = json({ ok: true }, 201);
  assert.equal(r.status, 201);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await r.json(), { ok: true });
});
