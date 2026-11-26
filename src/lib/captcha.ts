/**
 * Anti-bot (Cloudflare Turnstile) cargado bajo demanda: el script solo se descarga cuando la persona
 * empieza a llenar un formulario que lo tiene (no pesa en el resto de la web). Cada token sirve una vez.
 */
type Turnstile = {
  render: (el: Element, opts: Record<string, unknown>) => string;
  reset: (el?: Element | null) => void;
};
const api = () => (window as unknown as { turnstile?: Turnstile }).turnstile;

let loading: Promise<void> | null = null;
function load() {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Turnstile no cargó'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Pinta el widget del formulario (una vez). */
async function mount(widget: HTMLElement) {
  if (widget.dataset.mounted) return;
  widget.dataset.mounted = '1';
  try {
    await load();
    api()?.render(widget, {
      sitekey: widget.dataset.sitekey,
      appearance: 'interaction-only',
      size: 'flexible',
    });
  } catch {
    delete widget.dataset.mounted;
  }
}

/**
 * Escucha global: se prepara la verificación al abrir una ventana con formulario (diagnóstico, descargas),
 * al enfocar cualquier campo de un formulario, o cuando el formulario aparece en pantalla (Conversemos).
 */
export function initCaptcha() {
  const widgets = () => [...document.querySelectorAll<HTMLElement>('.cf-turnstile')];
  if (!widgets().length) return;
  document.addEventListener('focusin', (e) => {
    const widget = (e.target as HTMLElement).closest('form')?.querySelector<HTMLElement>('.cf-turnstile');
    if (widget) void mount(widget);
  });
  document.addEventListener('modal:open', (e) => {
    (e.target as HTMLElement).querySelectorAll<HTMLElement>('.cf-turnstile').forEach((w) => void mount(w));
  });
  const io = new IntersectionObserver((entries) =>
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      void mount(en.target as HTMLElement);
    })
  );
  widgets()
    .filter((w) => !w.closest('[data-modal]'))
    .forEach((w) => io.observe(w));
}

/** Token del formulario; si la verificación aún está cargando, espera hasta 4 s antes de enviar. */
export async function waitCaptcha(form: HTMLFormElement) {
  const widget = form.querySelector<HTMLElement>('.cf-turnstile');
  if (!widget) return '';
  void mount(widget);
  for (let i = 0; i < 20 && !captchaToken(form); i++) await new Promise((r) => setTimeout(r, 200));
  return captchaToken(form);
}

export const captchaToken = (form: HTMLFormElement) =>
  (form.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]')?.value ?? '').trim();

export function resetCaptcha(form: HTMLFormElement) {
  const widget = form.querySelector('.cf-turnstile');
  if (widget && (widget as HTMLElement).dataset.mounted) api()?.reset(widget);
}
