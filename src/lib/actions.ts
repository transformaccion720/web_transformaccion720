/**
 * Botones con acción (lógica pura, con pruebas). En el mockup los botones hacen cosas distintas:
 * ir a una página, abrir el diagnóstico, abrir un video o llevar a Conversemos con el servicio elegido.
 * El CMS guarda { text, action, value } y aquí se traduce a atributos HTML.
 */
export const ACTIONS = [
  'link',
  'contact',
  'diagnosticHours',
  'diagnosticCosts',
  'video',
  'whatsapp',
] as const;
export type Action = (typeof ACTIONS)[number];

export const ACTION_OPTIONS = [
  { value: 'link', label: 'Ir a un enlace (escribe la dirección)' },
  { value: 'contact', label: 'Ir a Conversemos con un servicio elegido (escribe el servicio)' },
  { value: 'diagnosticHours', label: 'Abrir diagnóstico: horas perdidas' },
  { value: 'diagnosticCosts', label: 'Abrir diagnóstico: ahorro en costos' },
  { value: 'video', label: 'Abrir video (escribe el enlace de YouTube)' },
  { value: 'whatsapp', label: 'Abrir WhatsApp (escribe el mensaje o pega el link de un grupo)' },
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
export function actionAttrs(btn: Pick<ActionButton, 'action' | 'value'>, videoTitle = '', phone = '') {
  const value = btn.value.trim();
  switch (btn.action) {
    case 'whatsapp': {
      // Link de grupo (https://chat.whatsapp.com/…) tal cual; si no, chat con el número del sitio y el mensaje
      const digits = phone.replace(/\D/g, '');
      const href = /^https:\/\//i.test(value)
        ? value
        : digits
          ? `https://wa.me/${digits}${value ? `?text=${encodeURIComponent(value)}` : ''}`
          : contactHref('');
      return { tag: 'a', attrs: { href, target: '_blank', rel: 'noopener noreferrer' } } as const;
    }
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
