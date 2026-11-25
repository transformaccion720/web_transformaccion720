/**
 * Medición: un solo punto para enviar eventos. Llegan a Google Analytics solo si hay ID en el CMS
 * y el visitante aceptó las cookies (ver CookieConsent.astro); si no, no hace nada.
 */
type Params = Record<string, string | number | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function track(event: string, params: Params = {}) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') window.gtag('event', event, params);
  else window.dataLayer?.push({ event, ...params });
}
