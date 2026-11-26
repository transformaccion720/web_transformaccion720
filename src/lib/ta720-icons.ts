/**
 * Íconos propios TA720 v2 (propuesta, aún no conectados al CMS). SVG vectorial: nítido a cualquier tamaño.
 * Tres capas por ícono:
 *  - `fill`: volumen con degradado (da profundidad, estilo "glass duotone").
 *  - `base`: trazo fino redondeado en el color del texto.
 *  - `accent`: detalle de marca con degradado naranja y brillo (la estela / el punto de la abeja-cohete).
 * viewBox 0 0 24 24. Los degradados se definen en renderTaIcon(); fill="A" = relleno con el degradado naranja.
 */
export interface TaIcon {
  label: string;
  fill: string;
  base: string;
  accent: string;
}

export const TA_ICONS: Record<string, TaIcon> = {
  estrategia: {
    label: 'Estrategia / Roadmap',
    fill: '<circle cx="17" cy="6" r="5"/><circle cx="5" cy="19.5" r="3"/>',
    base: '<path d="M4 20h4.5a3 3 0 0 0 0-6h-1a3 3 0 0 1 0-6H15"/><circle cx="4" cy="20" r="1.4"/>',
    accent: '<path d="M16 9V3l5 2-5 2.2" fill="A"/>',
  },
  digital: {
    label: 'Soluciones digitales',
    fill: '<rect x="3" y="4.5" width="18" height="12" rx="2.5"/>',
    base: '<rect x="3" y="4.5" width="18" height="12" rx="2.5"/><path d="M8.5 20.5h7M12 16.5v4M9 8.8l-2.1 1.95L9 12.7M15 8.8l2.1 1.95L15 12.7"/>',
    accent: '<path d="M13.1 8l-2.2 5.5" stroke-width="2"/>',
  },
  formacion: {
    label: 'Formación / Talento',
    fill: '<path d="M3.5 20a5.5 5.5 0 0 1 11 0z"/><circle cx="9" cy="8.5" r="3"/>',
    base: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M15.5 14.4a4.2 4.2 0 0 1 5 4.1"/><circle cx="17.2" cy="10.2" r="2"/>',
    accent: '<path d="M19.6 2.2l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z" fill="A"/>',
  },
  diagnostico: {
    label: 'Diagnóstico',
    fill: '<rect x="5" y="4" width="14" height="17" rx="2.5"/>',
    base: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V2.6h6V4M8.5 18h4"/>',
    accent: '<path d="M8.6 12.4l2.3 2.3 4.5-4.7" stroke-width="2.1"/>',
  },
  medida: {
    label: 'Diseño a medida',
    fill: '<rect x="3" y="4" width="18" height="16" rx="4"/>',
    base: '<path d="M6 8h12M6 12h12M6 16h12"/><circle cx="9.5" cy="8" r="1.7"/><circle cx="8.5" cy="16" r="1.7"/>',
    accent: '<circle cx="15" cy="12" r="2.3" fill="A"/>',
  },
  ejecucion: {
    label: 'Ejecución ágil',
    fill: '<path d="M13.5 3L6 13.5h5.5L10.5 21l7.5-10.5h-5.5z"/>',
    base: '<path d="M13.5 3L6 13.5h5.5L10.5 21l7.5-10.5h-5.5z"/>',
    accent: '<path d="M2.4 9.5h2.4M1.8 13.5h3M2.8 17.5h2.2" stroke-width="2"/>',
  },
  impacto: {
    label: 'Impacto medible',
    fill: '<path d="M7.5 17h2.2v-4H7.5zM11.5 17h2.2v-6h-2.2zM15.5 17h2.2V9h-2.2z"/>',
    base: '<path d="M4 3.5V20h16.5"/><rect x="7.5" y="13" width="2.2" height="4" rx=".5"/><rect x="11.5" y="11" width="2.2" height="6" rx=".5"/><rect x="15.5" y="9" width="2.2" height="8" rx=".5"/>',
    accent: '<path d="M6.5 9.5l4-4 2.5 2.5L19 2M16.6 2H19v2.4" stroke-width="2"/>',
  },
  procesos: {
    label: 'Procesos',
    fill: '<rect x="3" y="3.5" width="6.5" height="5.5" rx="1.6"/><rect x="14.5" y="15" width="6.5" height="5.5" rx="1.6"/>',
    base: '<rect x="3" y="3.5" width="6.5" height="5.5" rx="1.6"/><rect x="14.5" y="15" width="6.5" height="5.5" rx="1.6"/><path d="M9.5 6.2h4.3a3.2 3.2 0 0 1 3.2 3.2v4"/>',
    accent: '<path d="M14.6 11.6l2.4 2.6 2.4-2.6" stroke-width="2"/>',
  },
  tecnologia: {
    label: 'Tecnología / IA',
    fill: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
    base: '<rect x="6" y="6" width="12" height="12" rx="2.5"/><path d="M9.5 3v3M14.5 3v3M9.5 18v3M14.5 18v3M3 9.5h3M3 14.5h3M18 9.5h3M18 14.5h3"/>',
    accent: '<path d="M12 8.6l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="A"/>',
  },
  datos: {
    label: 'Datos',
    fill: '<path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13z"/>',
    base: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
    accent: '<circle cx="15.8" cy="17.4" r="1.5" fill="A"/>',
  },
  personas: {
    label: 'Personas / Cultura',
    fill: '<path d="M5.5 20.5a6.5 6.5 0 0 1 13 0z"/><circle cx="12" cy="7.5" r="3.2"/>',
    base: '<circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20.5a6.5 6.5 0 0 1 13 0"/>',
    accent:
      '<path d="M12 16.4c-1-.9-2.3-1.8-2.3-2.9a1.2 1.2 0 0 1 2.3-.6 1.2 1.2 0 0 1 2.3.6c0 1.1-1.3 2-2.3 2.9z" fill="A"/>',
  },
  cohete: {
    label: 'Transformación (abeja-cohete TA720)',
    // Formas del isotipo oficial recalculadas a 24 px (escala uniforme 0.375 + centrado): no se deforma
    fill: '<g transform="translate(.95 -.5) scale(1.1)"><ellipse cx="8.25" cy="9" rx="3.75" ry="2.06" transform="rotate(-24 8.25 9)"/><ellipse cx="14.25" cy="13.5" rx="3.38" ry="1.69" transform="rotate(64 14.25 13.5)"/><path d="M16.5 4.5C13.1 4.9 9 8.6 7.9 13.9 13.1 12.8 16.9 8.6 16.5 4.5Z" fill="A"/></g>',
    base: '<g transform="translate(.95 -.5) scale(1.1)" stroke-width=".62"><ellipse cx="8.25" cy="9" rx="3.75" ry="2.06" transform="rotate(-24 8.25 9)"/><ellipse cx="14.25" cy="13.5" rx="3.38" ry="1.69" transform="rotate(64 14.25 13.5)"/><path d="M16.5 4.5C13.1 4.9 9 8.6 7.9 13.9 13.1 12.8 16.9 8.6 16.5 4.5Z"/><path d="M10.1 9.4l3.8 1.9M8.6 11.6l3 1.5" stroke-width="1.05"/><path d="M16.5 4.5c-1.1.2-2.1.8-2.8 1.5l1.7 1.7c.7-.9 1.1-2 1.1-3.2z" fill="B"/><circle cx="13.3" cy="8.1" r="1.2" fill="#E0F2FE"/><path d="M15.4 4.5l.4-2.2M16.5 5.25l1.9-.75"/><circle cx="15.8" cy="2.05" r=".65" fill="B"/><circle cx="18.55" cy="4.3" r=".65" fill="B"/></g>',
    accent:
      '<g transform="translate(.95 -.5) scale(1.1)"><path d="M3.75 14.25C1.5 17.25 3 21 7.1 21c3.4 0 6-2.25 8.6-4.5" stroke-width="1.45"/></g>',
  },
};

let n = 0;
/**
 * SVG listo para insertar. `color` = trazo; `deep`/`light` = degradado del volumen; acento siempre naranja de marca.
 */
export function renderTaIcon(
  key: string,
  size = 24,
  opts: { color?: string; deep?: string; light?: string } = {}
) {
  const i = TA_ICONS[key];
  if (!i) return '';
  const id = `ta${++n}`;
  const { color = 'currentColor', deep = '#1565D8', light = '#38BDF8' } = opts;
  const tok = (t: string) =>
    t.replaceAll('fill="A"', `fill="url(#${id}a)"`).replaceAll('fill="B"', `fill="${color}"`);
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
<defs>
<linearGradient id="${id}f" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse"><stop stop-color="${light}" stop-opacity=".55"/><stop offset="1" stop-color="${deep}" stop-opacity=".18"/></linearGradient>
<linearGradient id="${id}a" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#FDE68A"/><stop offset=".45" stop-color="#F59E0B"/><stop offset="1" stop-color="#EA580C"/></linearGradient>
<filter id="${id}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<g fill="url(#${id}f)" stroke="none">${tok(i.fill)}</g>
<g stroke="${color}" stroke-width="1.6">${tok(i.base)}</g>
<g stroke="url(#${id}a)" stroke-width="1.8" filter="url(#${id}g)">${tok(i.accent)}</g>
</svg>`;
}
