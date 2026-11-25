/**
 * Genera todos los íconos de la web (pestaña del navegador, iPhone, Android) desde public/logo.svg.
 * Uso: reemplaza public/logo.svg por el logo del cliente (cuadrado) y ejecuta `npm run icons`.
 * Opcional: public/favicon-source.png (cuadrado, mínimo 512 px) si el logo no es SVG.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const pub = new URL('../public/', import.meta.url);
const source = ['favicon-source.png', 'logo.svg'].map((f) => new URL(f, pub)).find((u) => existsSync(u));
if (!source) {
  console.error('Falta public/logo.svg (o public/favicon-source.png).');
  process.exit(1);
}

const input = readFileSync(source);
const png = (size, pad = 0) =>
  sharp(input, { density: 512 })
    .resize(size - pad * 2, size - pad * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

const out = {
  'favicon-16x16.png': await png(16),
  'favicon-32x32.png': await png(32),
  'icon-192.png': await png(192),
  'icon-512.png': await png(512),
};
// iPhone no admite transparencia: fondo blanco y un margen para que no se corte
out['apple-touch-icon.png'] = await sharp(await png(180, 14))
  .flatten({ background: '#ffffff' })
  .png()
  .toBuffer();

// favicon.ico con una imagen PNG de 48 px dentro (formato que aceptan todos los navegadores)
const ico48 = await png(48);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reservado
header.writeUInt16LE(1, 2); // tipo: ícono
header.writeUInt16LE(1, 4); // una imagen
header.writeUInt8(48, 6); // ancho
header.writeUInt8(48, 7); // alto
header.writeUInt16LE(1, 10); // planos
header.writeUInt16LE(32, 12); // bits por píxel
header.writeUInt32LE(ico48.length, 14); // tamaño de la imagen
header.writeUInt32LE(22, 18); // dónde empieza la imagen
out['favicon.ico'] = Buffer.concat([header, ico48]);

for (const [name, buf] of Object.entries(out)) {
  writeFileSync(new URL(name, pub), buf);
  console.log(`✓ public/${name}`);
}
console.log('Listo. El nombre de la app y el color salen del CMS (site.webmanifest).');
