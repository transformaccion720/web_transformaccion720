/**
 * Ventanas emergentes accesibles: abrir/cerrar, Escape, clic en el fondo, foco atrapado y devolver el foco.
 * Marcado: <div data-modal id="…" hidden> con [data-modal-close] dentro.
 */
let lastFocus: HTMLElement | null = null;
const closers = new Map<HTMLElement, () => void>();

export function openModal(modal: HTMLElement, onClose?: () => void) {
  lastFocus = document.activeElement as HTMLElement | null;
  modal.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  if (onClose) closers.set(modal, onClose);
  modal.dispatchEvent(new CustomEvent('modal:open', { bubbles: true }));
  requestAnimationFrame(() =>
    modal
      .querySelector<HTMLElement>('[data-autofocus], input, button, [href]')
      ?.focus({ preventScroll: true })
  );
}

export function closeModal(modal: HTMLElement) {
  if (modal.hidden) return;
  modal.hidden = true;
  document.documentElement.style.overflow = '';
  closers.get(modal)?.();
  closers.delete(modal);
  lastFocus?.focus({ preventScroll: true });
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const modal = t.closest<HTMLElement>('[data-modal]');
  if (!modal) return;
  if (t === modal || t.closest('[data-modal-close]')) closeModal(modal);
});

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

document.addEventListener('keydown', (e) => {
  const open = [...document.querySelectorAll<HTMLElement>('[data-modal]:not([hidden])')];
  if (!open.length) return;
  if (e.key === 'Escape') return open.forEach(closeModal);
  if (e.key !== 'Tab') return;
  // El foco no sale de la ventana abierta (Tab / Shift+Tab dan la vuelta)
  const modal = open[open.length - 1];
  const items = [...modal.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.getClientRects().length > 0 || el === document.activeElement
  );
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  const inside = modal.contains(document.activeElement);
  if (e.shiftKey && (document.activeElement === first || !inside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
    e.preventDefault();
    first.focus();
  }
});
