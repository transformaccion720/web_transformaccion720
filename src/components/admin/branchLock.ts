/**
 * Producción (Keystatic Cloud): quien edita el contenido trabaja siempre en `main`.
 * Se oculta de la interfaz todo lo relacionado con ramas, para que nadie cree ramas, las borre o abra
 * pull requests sin querer. Es una medida de interfaz (no de seguridad): el refuerzo real es que
 * Vercel solo construye `main`.
 *
 * Se identifica por los textos que muestra Keystatic (más estables que su estructura interna).
 */

import { mainBranchPath } from './routes';

const BRANCH_MENU_ITEMS = /^(new branch|delete branch|create pull request|github repo)/i;

const norm = (t: string | null) => (t ?? '').replace(/\s+/g, ' ').trim();

/** Dashboard: bloque "Current branch" con su tarjeta y el botón "New branch…" */
function hideDashboardBranchBlock(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('button, a').forEach((el) => {
    if (!/^new branch/i.test(norm(el.textContent))) return;
    el.style.display = 'none';
    // Sube mientras el contenedor sea pequeño (solo el bloque de rama, no todo el dashboard)
    let block: HTMLElement = el;
    while (block.parentElement && norm(block.parentElement.textContent).length < 80)
      block = block.parentElement;
    if (block !== el) block.style.display = 'none';
  });
}

/** Menú de acciones y selector de ramas (barra lateral) */
function hideBranchControls(root: ParentNode) {
  hideDashboardBranchBlock(root);
  // 1) Entradas del menú de ramas (se pintan en un popover fuera de la barra lateral)
  root.querySelectorAll<HTMLElement>('[role="menuitem"]').forEach((item) => {
    if (BRANCH_MENU_ITEMS.test((item.textContent ?? '').trim())) item.style.display = 'none';
  });

  // 2) Selector de rama + botón "…" : fila superior de la barra lateral
  const sidebar = root.querySelector<HTMLElement>('[data-split-pane]');
  if (!sidebar) return;
  sidebar.querySelectorAll<HTMLElement>('button[aria-haspopup="listbox"]').forEach((picker) => {
    let row: HTMLElement = picker;
    while (row.parentElement && row.parentElement !== sidebar) {
      row = row.parentElement;
      // La fila correcta es la primera que también contiene el botón del menú de acciones
      if (row.querySelector('button[aria-haspopup="menu"], button[aria-haspopup="true"]')) break;
    }
    row.style.display = 'none';
  });
}

/** Si la URL apunta a otra rama (/keystatic/branch/xyz/...), vuelve a la misma pantalla en `main` */
export function leaveOtherBranches(location: Pick<Location, 'pathname' | 'search' | 'hash' | 'replace'>) {
  const target = mainBranchPath(location.pathname);
  if (!target) return false;
  location.replace(`${target}${location.search}${location.hash}`);
  return true;
}

/**
 * Enlaces al repositorio (ícono de GitHub en la barra de cada entrada, "View on GitHub", avatar del repo…).
 * Quien edita no necesita GitHub: se ocultan con una regla CSS que también cubre lo que se pinte después.
 */
export const REPO_LINK_CSS =
  'a[href*="github.com"],a[href*="github.dev"],[role="menuitem"][href*="github"]{display:none!important}';

function hideRepoLinks(doc: Document) {
  if (doc.getElementById('cms-hide-repo')) return;
  const style = doc.createElement('style');
  style.id = 'cms-hide-repo';
  style.textContent = REPO_LINK_CSS;
  doc.head.appendChild(style);
}

export function installBranchLock(doc: Document = document, loc: Location = window.location) {
  if (leaveOtherBranches(loc)) return () => {};
  hideRepoLinks(doc);
  const run = () => hideBranchControls(doc);
  run();
  // Agrupa las mutaciones de React en una sola pasada por cuadro (no en cada cambio del DOM)
  let frame = 0;
  const observer = new MutationObserver(() => {
    if (!frame) frame = requestAnimationFrame(() => ((frame = 0), run()));
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
  };
}
