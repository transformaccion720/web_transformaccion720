import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';

export type Site = CollectionEntry<'site'>['data'];
export type Page = CollectionEntry<'pages'>;
export type Section = Page['data']['sections'][number];
export type SectionOf<K extends Section['discriminant']> = Extract<Section, { discriminant: K }>['value'];
export type Post = CollectionEntry<'posts'>;
export type Diagnostic = CollectionEntry<'diagnostic'>['data'];

export const HOME_SLUG = 'inicio';

/** Ruta fija del Libro de Reclamaciones (no es una página legal en Markdown) */
export const COMPLAINTS_SLUG = 'libro-de-reclamaciones';

/** Lee un "singleton" (archivo único de ajustes). Falla el build si falta: así nunca sale una web a medias. */
async function single<K extends CollectionKey>(key: K, file: string) {
  const [entry] = await getCollection(key);
  if (!entry) throw new Error(`Falta src/content/settings/${file}.json (${key})`);
  return entry.data as CollectionEntry<K>['data'];
}

export const getSite = () => single('site', 'site');
export const getDiagnostic = () => single('diagnostic', 'diagnostic');
export const getBlogSettings = () => single('blogSettings', 'blog');
export const getComplaintsBook = () => single('complaintsBook', 'complaints');

export const getPages = () => getCollection('pages');

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export async function getLegalPages() {
  const pages = await getCollection('legal', (p) => p.id !== COMPLAINTS_SLUG);
  return pages.sort(byOrder);
}

/** Nombre de cada categoría del blog por su identificador, en el orden elegido en el CMS */
export async function getBlogCategories(): Promise<Record<string, string>> {
  const cats = (await getCollection('blogCategories')).sort(
    (a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name, 'es')
  );
  return Object.fromEntries(cats.map((c) => [c.id, c.data.name]));
}

/** Nombre visible de la categoría de un artículo; vacía o borrada del CMS = "General" */
export const categoryName = (names: Record<string, string>, key: string) => names[key] ?? 'General';

/** Artículos publicados (sin borradores), del más reciente al más antiguo */
export async function getPosts() {
  const posts = await getCollection('posts', (p) => !p.data.draft);
  return posts.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}

export const readingMinutes = (text = '') =>
  Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));

export const formatDate = (d: Date) =>
  d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Fecha corta como en el diseño: "10 Nov, 2026" */
export function shortDate(d: Date) {
  const month = d.toLocaleDateString('es-PE', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${d.getUTCFullYear()}`;
}

/** Fecha como en el mockup de Novedades: "19 nov. 2026" */
export const newsDate = (d: Date) =>
  d
    .toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .replace(/\bde\b\s?/g, '');

/** Etiqueta de duración de un artículo: la del CMS o "N min de lectura" */
export const readLabel = (post: Post) => post.data.readLabel || `${readingMinutes(post.body)} min de lectura`;
