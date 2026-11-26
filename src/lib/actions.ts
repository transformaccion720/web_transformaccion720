/**
 * Botones con acción (lógica pura, con pruebas). En el mockup los botones hacen cosas distintas:
 * ir a una página, abrir el diagnóstico, abrir un video o llevar a Conversemos con el servicio elegido.
 * El CMS guarda { text, action, value } y aquí se traduce a atributos HTML.
 */
export const ACTIONS = ['link', 'contact', 'diagnosticHours', 'diagnosticCosts', 'video'] as const;
export type Action = (typeof ACTIONS)[number];

export const ACTION_OPTIONS = [
  { value: 'link', label: 'Ir a un enlace (escribe la dirección)' },
  { value: 'contact', label: 'Ir a Conversemos con un servicio elegido (escribe el servicio)' },
  { value: 'diagnosticHours', label: 'Abrir diagnóstico: horas perdidas' },
  { value: 'diagnosticCosts', label: 'Abrir diagnóstico: ahorro en costos' },
  { value: 'video', label: 'Abrir video (escribe el enlace de YouTube)' },
];

/** Página del formulario de contacto */
export const CONTACT_PATH = '/conversemos';

export interface ActionButton {
  text: string;
  action: Action;
  value: string;
}

/** Enlace a Conversemos con el servicio preseleccionado en el formulario */
export const contactHref = (service: string) =>
  service.trim()
    ? `${CONTACT_PATH}?servicio=${encodeURIComponent(service.trim())}#formulario`
    : `${CONTACT_PATH}#formulario`;

/**
 * Atributos del botón. Los enlaces son <a>; el diagnóstico y el video son <button> que escuchan
 * los modales globales (DiagnosticModal y VideoModal en BaseLayout).
 */
export function actionAttrs(btn: Pick<ActionButton, 'action' | 'value'>, videoTitle = '') {
  const value = btn.value.trim();
  switch (btn.action) {
    case 'contact':
      return { tag: 'a', attrs: { href: contactHref(value) } } as const;
    case 'diagnosticHours':
      return { tag: 'button', attrs: { type: 'button', 'data-open-diagnostic': 'horas' } } as const;
    case 'diagnosticCosts':
      return { tag: 'button', attrs: { type: 'button', 'data-open-diagnostic': 'costos' } } as const;
    case 'video':
      return {
        tag: 'button',
        attrs: { type: 'button', 'data-video': value, 'data-video-title': videoTitle },
      } as const;
    default: {
      if (/^\s*(javascript|data|vbscript):/i.test(value)) return { tag: 'a', attrs: { href: '#' } } as const;
      const external = /^https?:\/\//i.test(value);
      return {
        tag: 'a',
        attrs: {
          href: value || '#',
          ...(external && { target: '_blank', rel: 'noopener noreferrer' }),
        },
      } as const;
    }
  }
}
