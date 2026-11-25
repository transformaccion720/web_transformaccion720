// El filtro de imágenes del servidor dev debe generar siempre un módulo válido,
// sin importar en qué posición esté la imagen que ya no existe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pruneMissingContentAssets } from '../tools/prune-content-assets.mjs';

const ID = '/proyecto/.astro/content-assets.mjs';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prune-'));
const file = (name) => path.join(dir, name).replaceAll('\\', '/');
for (const name of ['a.webp', 'b.webp', 'c.webp']) fs.writeFileSync(path.join(dir, name), '');

const spec = (name) => `${file(name)}?astroContentImageFlag=&importer=src%2Fcontent%2Fservices%2Fx.md`;
const symbol = (name) => `__ASTRO_IMAGE_IMPORT_${name.replace(/\W/g, '')}`;

// Mismo formato que escribe Astro en .astro/content-assets.mjs
const astroModule = (names) => `
${names.map((n) => `import ${symbol(n)} from ${JSON.stringify(spec(n))};`).join('\n')}
export default new Map([${names.map((n) => `[${JSON.stringify(spec(n))}, ${symbol(n)}]`).join(', ')}]);
\t\t`;

/** Ejecuta el módulo resultante con imports simulados y devuelve las claves del Map */
const evaluate = (code) => {
  const body = code
    .replace(/^import (\w+) from ("[^"]+");$/gm, 'const $1 = $2;')
    .replace('export default', 'return');
  return [...new Function(body)().keys()].map((k) => path.basename(k.split('?')[0]));
};

const transform = (names) => pruneMissingContentAssets().transform(astroModule(names), ID);

test('sin imágenes faltantes no modifica el módulo', () => {
  assert.equal(transform(['a.webp', 'b.webp']), null);
});

for (const [caso, names, expected] of [
  ['falta la primera', ['viejo.webp', 'a.webp', 'b.webp'], ['a.webp', 'b.webp']],
  ['falta una del medio', ['a.webp', 'viejo.webp', 'b.webp'], ['a.webp', 'b.webp']],
  ['falta la última', ['a.webp', 'b.webp', 'viejo.webp'], ['a.webp', 'b.webp']],
  ['faltan varias', ['viejo1.webp', 'a.webp', 'viejo2.webp', 'c.webp', 'viejo3.webp'], ['a.webp', 'c.webp']],
  ['faltan todas', ['viejo1.webp', 'viejo2.webp'], []],
]) {
  test(`${caso}: genera un Map válido solo con las existentes`, () => {
    assert.deepEqual(evaluate(transform(names)), expected);
  });
}

test('ignora otros módulos', () => {
  assert.equal(pruneMissingContentAssets().transform('export default 1;', '/proyecto/src/x.ts'), null);
});
