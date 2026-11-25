/**
 * Rutas del CMS. En local Keystatic usa `/keystatic/singleton/…`; en la nube (Keystatic Cloud) toda ruta
 * de edición lleva la rama: `/keystatic/branch/main/singleton/…`. Sin la rama, Keystatic Cloud responde
 * "Not found", así que nunca se debe quitar.
 */

export const MAIN_BRANCH = 'main';

const BRANCH_PATH = /^\/keystatic\/branch\/([^/]+)(\/.*)?$/;

/**
 * Si la URL apunta a una rama distinta de `main`, devuelve la misma pantalla en `main`.
 * Devuelve null cuando no hay que redirigir (ya está en `main` o la ruta no lleva rama).
 */
export function mainBranchPath(pathname: string) {
  const m = pathname.match(BRANCH_PATH);
  if (!m || decodeURIComponent(m[1]) === MAIN_BRANCH) return null;
  return `/keystatic/branch/${MAIN_BRANCH}${m[2] ?? ''}`;
}

/** Qué entrada del CMS se edita según la URL, con o sin el prefijo de rama */
export function parseEntryPath(pathname: string) {
  const m = pathname.match(
    /^\/keystatic(?:\/branch\/[^/]+)?\/(singleton|collection)\/([^/]+)(?:\/item\/([^/]+))?/
  );
  if (!m) return null;
  const [, kind, key, slug] = m;
  return { kind: kind as 'singleton' | 'collection', key, slug: slug ? decodeURIComponent(slug) : undefined };
}
