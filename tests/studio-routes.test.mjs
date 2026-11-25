// Rutas del CMS en la nube: Keystatic Cloud necesita `/keystatic/branch/main/...`; quitar la rama da "Not found".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mainBranchPath, parseEntryPath } from '../src/components/admin/routes.ts';

test('en main no se redirige nunca (evita el "Not found" al recargar)', () => {
  for (const p of [
    '/keystatic',
    '/keystatic/branch/main',
    '/keystatic/branch/main/singleton/siteSettings',
    '/keystatic/branch/main/collection/posts/item/mi-articulo',
    '/keystatic/singleton/siteSettings',
  ])
    assert.equal(mainBranchPath(p), null, p);
});

test('otra rama vuelve a la misma pantalla en main, sin perder la rama', () => {
  assert.equal(mainBranchPath('/keystatic/branch/otra-rama'), '/keystatic/branch/main');
  assert.equal(
    mainBranchPath('/keystatic/branch/otra-rama/singleton/siteSettings'),
    '/keystatic/branch/main/singleton/siteSettings'
  );
});

test('la vista previa reconoce la sección en local y en la nube', () => {
  for (const prefix of ['/keystatic', '/keystatic/branch/main']) {
    assert.deepEqual(parseEntryPath(`${prefix}/singleton/siteSettings`), {
      kind: 'singleton',
      key: 'siteSettings',
      slug: undefined,
    });
    assert.deepEqual(parseEntryPath(`${prefix}/collection/posts/item/mi-articulo`), {
      kind: 'collection',
      key: 'posts',
      slug: 'mi-articulo',
    });
  }
  assert.equal(parseEntryPath('/keystatic/branch/main'), null);
});

test('el Studio usa estas rutas y arranca en modo claro', () => {
  const studio = fs.readFileSync('src/components/admin/KeystaticStudio.tsx', 'utf-8');
  assert.match(studio, /parseEntryPath\(window\.location\.pathname\)/);
  assert.match(studio, /setItem\('keystatic-color-scheme', 'light'\)/);
  assert.match(fs.readFileSync('src/components/admin/branchLock.ts', 'utf-8'), /mainBranchPath\(/);
});
