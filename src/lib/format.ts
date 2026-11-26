/**
 * Utilidades puras (sin Astro): se usan en el servidor y en el navegador, y tienen pruebas.
 */

/** Precio con dos decimales: 349 → "349.00" */
export const price = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

/** Precio con descuento: (349, 20) → 279.2 */
export const discounted = (n: number, percent = 0) =>
  Math.round(n * (1 - Math.min(90, Math.max(0, percent)) / 100) * 100) / 100;

/** Descuento vigente de un producto, o null. Texto de la cinta: el del CMS o "20% OFF". */
export function saleOf(sale?: { active: boolean; percent: number; label: string }) {
  if (!sale?.active || !(sale.percent > 0)) return null;
  return { percent: sale.percent, label: sale.label.trim() || `${sale.percent}% OFF` };
}

/** Reemplaza {variables} de los textos del CMS. Las que no existen se dejan tal cual. */
export const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));

/** Enlace a WhatsApp con mensaje pre-armado. Sin número devuelve '' (el botón no se muestra). */
export function waLink(phone: string, message = '') {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** Iniciales para avatares: "Valeria Mendoza" → "VM" */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/**
 * Títulos con palabra destacada: "¿Por qué elegir *Marca*?" →
 * [{ text: '¿Por qué elegir ', mark: false }, { text: 'Marca', mark: true }, { text: '?', mark: false }]
 */
export function highlight(text: string) {
  return text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('*') && part.endsWith('*') && part.length > 2
        ? { text: part.slice(1, -1), mark: true }
        : { text: part, mark: false }
    );
}

/** JSON seguro para incrustar en <script type="application/json"> (no puede cerrar la etiqueta) */
export const safeJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

/** Quita los asteriscos de resaltado (para atributos alt, title, SEO) */
export const plain = (text: string) => text.replace(/\*([^*]+)\*/g, '$1');

/** Lista de correos escrita en el CMS ("a@x.com, b@y.com") → solo los válidos */
export const emailList = (v: string) =>
  v
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

/** Remitente "Nombre <correo>" desde el CMS; si falta el correo se usa el respaldo */
export function sender(name: string, email: string, fallback: string) {
  const ok = emailList(email)[0];
  if (!ok) return fallback;
  return name.trim() ? `${name.trim().replace(/[<>"]/g, '')} <${ok}>` : ok;
}

/** Color de la barra del navegador en celulares (azul noche del menú TA720) */
export const THEME_COLOR = '#071528';

/** Escapa texto para incrustarlo en HTML (correos, RSS). */
export const escHtml = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
