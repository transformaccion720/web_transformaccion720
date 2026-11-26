// Pruebas de humo sobre el build estático (`npm test` construye antes).
// Verifican que lo que se edita en el CMS llega a la web y que el SEO no se rompe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist/client');
const read = (p) => fs.readFileSync(path.join(DIST, p), 'utf-8');
const readJson = (p) => JSON.parse(fs.readFileSync(path.resolve(p), 'utf-8'));
const slugs = (dir, ext) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => f.slice(0, -ext.length));

const cmsPages = slugs('src/content/pages', '.json');
const site = readJson('src/content/settings/site.json');

const pages = [
  'index.html',
  ...cmsPages.filter((s) => s !== 'inicio').map((s) => `${s}/index.html`),
  ...slugs('src/content/legal', '.md').map((s) => `legal/${s}/index.html`),
  'legal/libro-de-reclamaciones/index.html',
  'blog/index.html',
  ...slugs('src/content/posts', '.md').map((s) => `blog/${s}/index.html`),
];

test('cada página del CMS genera su HTML', () => {
  for (const p of pages) assert.ok(fs.existsSync(path.join(DIST, p)), `falta ${p}`);
});

for (const page of pages) {
  test(`SEO básico y sin fuentes de Google en ${page}`, () => {
    const html = read(page);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.match(html, /<link rel="canonical"/);
    assert.match(html, /application\/ld\+json/);
    assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(html));
  });
}

test('la portada muestra el contenido del CMS y lleva marcas de vista previa', () => {
  const html = read('index.html');
  const home = readJson('src/content/pages/inicio.json');
  assert.ok(html.includes(site.brandName));
  const hero = home.sections[0].value;
  assert.ok(html.includes(hero.text));
  assert.match(html, /data-cms="pages\.sections\.0\.value\.text"/);
});

test('la portada tiene un solo h1', () => {
  assert.equal((read('index.html').match(/<h1[\s>]/g) ?? []).length, 1);
});

test('los botones de WhatsApp usan el número de la Configuración general', () => {
  const html = read('index.html');
  assert.ok(site.whatsapp, 'falta el WhatsApp en site.json');
  assert.ok(html.includes(`https://wa.me/${site.whatsapp.replace(/\D/g, '')}`));
});

test('las imágenes se sirven optimizadas desde el sitio (sin enlaces a Unsplash)', () => {
  for (const p of pages) assert.ok(!/images\.unsplash\.com/.test(read(p)), p);
});

test('el Libro de Reclamaciones tiene los campos exigidos por INDECOPI', () => {
  const html = read('legal/libro-de-reclamaciones/index.html');
  for (const name of [
    'fullName',
    'docType',
    'docNumber',
    'address',
    'phone',
    'email',
    'guardianName',
    'goodType',
    'amount',
    'goodDescription',
    'claimType',
    'detail',
    'request',
    'acceptPrivacy',
  ])
    assert.match(html, new RegExp(`name="${name}"`), name);
  assert.match(html, /RUC/);
  assert.match(html, /quince \(15\) días hábiles/);
});

test('el footer enlaza al Libro de Reclamaciones en todas las páginas', () => {
  for (const p of pages) assert.ok(read(p).includes('href="/legal/libro-de-reclamaciones"'), p);
});

test('las secciones con ancla generan su id', () => {
  const html = read('index.html');
  const home = readJson('src/content/pages/inicio.json');
  for (const s of home.sections) if (s.value.anchor) assert.match(html, new RegExp(`id="${s.value.anchor}"`));
});

test('las preguntas frecuentes se publican como FAQPage', () => {
  const html = read('index.html');
  const home = readJson('src/content/pages/inicio.json');
  const faq = home.sections.find((s) => s.discriminant === 'faq' || s.discriminant === 'faqGrid');
  if (!faq) return;
  assert.ok(html.includes('"FAQPage"'));
  for (const q of faq.value.items) assert.ok(html.includes(JSON.stringify(q.question).slice(1, -1)));
});

test('sitemap incluye las páginas públicas y excluye el CMS', () => {
  const xml = fs
    .readdirSync(DIST)
    .filter((f) => f.startsWith('sitemap-') && f !== 'sitemap-index.xml')
    .map((f) => read(f))
    .join('');
  assert.ok(!xml.includes('/keystatic'));
  assert.ok(xml.includes('/blog/'));
});

test('la página 404 no se indexa', () => {
  assert.match(read('404.html'), /noindex/);
});

test('existe el feed RSS del blog', () => {
  assert.match(read('blog/rss.xml'), /<rss version="2.0">/);
});

test('cabeceras de seguridad en vercel.json', () => {
  const headers = readJson('vercel.json').headers[0].headers.map((h) => h.key);
  for (const h of [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Content-Security-Policy',
    'Referrer-Policy',
    'Strict-Transport-Security',
  ])
    assert.ok(headers.includes(h), h);
});

test('las preguntas de Conversemos se publican como FAQPage', () => {
  const html = read('conversemos/index.html');
  assert.ok(html.includes('"FAQPage"'));
});

test('pestañas: al cargar solo se ve la primera pestaña de cada selector', () => {
  const html = read('servicios/index.html');
  assert.match(html, /<div data-panel="transformacion" role="tabpanel">/);
  assert.match(html, /<div data-panel="formacion" hidden/);
  assert.match(html, /<div data-panel="soluciones-digitales portafolio" hidden/);
  assert.match(html, /href="#soluciones-digitales"[^>]*data-tab="soluciones-digitales"/);
});

test('el menú enlaza directo a las pestañas de Servicios y Hub', () => {
  const html = read('index.html');
  for (const h of [
    '/servicios#transformacion',
    '/servicios#soluciones-digitales',
    '/servicios#formacion',
    '/hub#campus',
  ])
    assert.ok(html.includes(`href="${h}"`), h);
});

test('el Centro de Diagnóstico está en todas las páginas', () => {
  for (const p of pages) assert.ok(read(p).includes('id="diagnostic-modal"'), p);
});

test('los botones "Conversemos con servicio" preseleccionan el servicio', () => {
  assert.ok(
    read('servicios/index.html').includes('/conversemos?servicio=Web%20Corporativa%20Premium#formulario')
  );
});

test('rendimiento: el CSS va en un archivo con caché (no repetido en cada página)', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="stylesheet" href="\/_astro\/[^"]+\.css"/);
  assert.ok(html.length < 140_000, `index.html pesa ${html.length} bytes`);
});

test('rendimiento: no se publican imágenes originales gigantes', () => {
  const big = fs
    .readdirSync(path.join(DIST, '_astro'))
    .filter((f) => /\.(png|jpe?g|webp|avif)$/i.test(f))
    .filter((f) => fs.statSync(path.join(DIST, '_astro', f)).size > 900_000);
  assert.deepEqual(big, []);
});

test('al compartir, la portada usa la imagen para compartir de 1200×630', () => {
  assert.match(read('index.html'), /<meta property="og:image" content="[^"]+\.jpg"/);
});
