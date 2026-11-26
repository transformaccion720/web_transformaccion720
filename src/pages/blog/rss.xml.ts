import type { APIRoute } from 'astro';
import { getPosts, getSite } from '@/lib/content';

import { escHtml as esc } from '@/lib/format';

export const GET: APIRoute = async ({ site: siteUrl }) => {
  const site = await getSite();
  const posts = await getPosts();
  const items = posts
    .map((p) => {
      const url = new URL(`/blog/${p.id}`, siteUrl).toString();
      return `<item><title>${esc(p.data.title)}</title><link>${url}</link><guid>${url}</guid><pubDate>${p.data.publishedAt.toUTCString()}</pubDate><description>${esc(p.data.excerpt)}</description></item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(site.brandName)}</title><link>${siteUrl}</link><description>${esc(site.siteDescription)}</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
