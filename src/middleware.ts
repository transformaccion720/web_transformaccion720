import { defineMiddleware } from 'astro:middleware';
import fs from 'node:fs';

/**
 * Solo en desarrollo: al reemplazar una foto desde el CMS el archivo conserva su nombre, así que la URL
 * `/_image?href=…` no cambia y el navegador (o la vista previa del Studio) puede mostrar una copia vieja.
 * Se añade la fecha de modificación del archivo a cada URL de imagen: foto nueva = URL nueva.
 * En producción las imágenes ya llevan un hash de contenido en el nombre.
 */
const versionImageUrls = (html: string) =>
  html.replace(/\/_image\?href=([^&"'\s]+)/g, (match, href: string) => {
    try {
      const url = decodeURIComponent(href.replaceAll('+', ' ')).split('?')[0];
      const file = url.replace(/^\/@fs\//, '');
      const version = Math.round(fs.statSync(file).mtimeMs);
      return `/_image?v=${version}&href=${href}`;
    } catch {
      return match;
    }
  });

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!import.meta.env.DEV || !response.headers.get('content-type')?.includes('text/html')) return response;
  const html = versionImageUrls(await response.text());
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
});
