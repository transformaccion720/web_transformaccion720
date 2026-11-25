import type { APIRoute } from 'astro';

// Se genera con el dominio de astro.config.mjs para no repetirlo
export const GET: APIRoute = ({ site }) =>
  new Response(
    `User-agent: *
Allow: /
Disallow: /keystatic/
Disallow: /api/

Sitemap: ${new URL('sitemap-index.xml', site)}
`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
