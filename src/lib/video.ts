/** Utilidades de video compartidas (modal de la portada y bloque de redes) */

export function youtubeId(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1) || null;
    if (host.endsWith('youtube.com'))
      return u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? null;
  } catch {
    // URL inválida
  }
  return null;
}

export function tiktokId(raw: string): string | null {
  try {
    return new URL(raw).pathname.match(/\/video\/(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

export const youtubeEmbed = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

// Reproductor oficial de TikTok (v1): ligero y vertical
export const tiktokEmbed = (id: string) =>
  `https://www.tiktok.com/player/v1/${id}?autoplay=1&description=1&music_info=1&rel=0`;

// hqdefault existe siempre; se recorta a 16:9 con object-cover (quita las bandas negras)
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const titleCache = new Map<string, Promise<string>>();

/** Título del video de YouTube vía oEmbed (sin API key). Se resuelve al construir la web. */
export function youtubeTitle(url: string): Promise<string> {
  if (!titleCache.has(url)) {
    titleCache.set(
      url,
      fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, {
        signal: AbortSignal.timeout(5000),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => (j?.title as string) ?? '')
        .catch(() => '')
    );
  }
  return titleCache.get(url)!;
}
