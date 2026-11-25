import type { APIRoute } from 'astro';
import { getSite } from '@/lib/content';
import { THEME_COLOR } from '@/lib/format';

/** Manifest para "Agregar a pantalla de inicio": nombre desde el CMS, íconos de `npm run icons` */
export const GET: APIRoute = async () => {
  const site = await getSite();
  return new Response(
    JSON.stringify({
      name: site.brandName,
      short_name: site.brandName.slice(0, 12),
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
      theme_color: THEME_COLOR,
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } }
  );
};
