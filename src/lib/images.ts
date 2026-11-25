import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

/**
 * Imagen para compartir (Open Graph): JPG de 1200 px. Los SVG no se convierten (se usan tal cual),
 * así un logo o ilustración vectorial no rompe el build.
 */
export async function shareImage(img: ImageMetadata | null | undefined) {
  if (!img) return undefined;
  if (img.format === 'svg') return img.src;
  return (await getImage({ src: img, width: 1200, format: 'jpg' })).src;
}
