/**
 * Pestañas de página (como las del mockup): Nosotros, Servicios, Hub y sub-pestañas.
 * - Grupo: [data-tab-group] con enlaces [data-tab="clave"] (href="#clave").
 * - Paneles: [data-panel="clave1 clave2"] → visible si todas sus claves conocidas están activas.
 * - El #hash de la URL elige la pestaña (ej: /servicios#soluciones-digitales), así los menús enlazan directo.
 */
const groups = [...document.querySelectorAll<HTMLElement>('[data-tab-group]')];
const keyToGroup = new Map<string, HTMLElement>();
const active = new Map<HTMLElement, string>();

for (const g of groups) {
  const keys = [...g.querySelectorAll<HTMLElement>('[data-tab]')].map((b) => b.dataset.tab!);
  keys.forEach((k) => keyToGroup.set(k, g));
  if (keys[0]) active.set(g, keys[0]);
}

const panels = [...document.querySelectorAll<HTMLElement>('[data-panel]')];

function render() {
  const on = new Set(active.values());
  for (const g of groups) {
    const key = active.get(g);
    g.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) => {
      const isOn = b.dataset.tab === key;
      b.classList.toggle('active', isOn);
      b.setAttribute('aria-selected', String(isOn));
    });
  }
  for (const p of panels) {
    const keys = (p.dataset.panel || '').split(/\s+/).filter((k) => keyToGroup.has(k));
    p.hidden = !keys.every((k) => on.has(k));
  }
  document.dispatchEvent(new CustomEvent('tabs:change'));
}

/** Activa una clave y, si su grupo vive dentro de otro panel, también la pestaña padre */
function activate(key: string, depth = 0): boolean {
  const g = keyToGroup.get(key);
  if (!g || depth > 5) return false;
  active.set(g, key);
  const parent = g.closest<HTMLElement>('[data-panel]');
  parent?.dataset.panel
    ?.split(/\s+/)
    .filter((k) => keyToGroup.has(k))
    .forEach((k) => activate(k, depth + 1));
  return true;
}

function fromHash(scroll: boolean) {
  const key = decodeURIComponent(location.hash.slice(1));
  if (!key || !activate(key)) return;
  render();
  if (scroll) {
    const g = keyToGroup.get(key)!;
    // Sub-pestaña: se lleva la vista al selector; pestaña principal: arriba de la página
    if (g.closest('[data-panel]')) g.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

if (groups.length) {
  fromHash(false);
  render();

  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname) return;
    const key = decodeURIComponent(url.hash.slice(1));
    if (!keyToGroup.has(key)) return;
    e.preventDefault();
    activate(key);
    render();
    history.replaceState(null, '', `#${key}`);
    // Botón fuera del selector (ej: "Ver Portafolio →"): se lleva la vista al selector
    if (!a.closest('[data-tab-group]'))
      keyToGroup.get(key)!.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  window.addEventListener('hashchange', () => fromHash(true));
}
document.documentElement.classList.remove('tabs-pending');
