/**
 * Ventanas emergentes accesibles: abrir/cerrar, Escape, clic en el fondo y devolver el foco.
 * Marcado: <div data-modal id="…" hidden> con [data-modal-close] dentro.
 */
let lastFocus: HTMLElement | null = null;
const closers = new Map<HTMLElement, () => void>();

export function openModal(modal: HTMLElement, onClose?: () => void) {
  lastFocus = document.activeElement as HTMLElement | null;
  modal.hidden = false;
  document.documentElement.style.overflow = 'hidden';
  if (onClose) closers.set(modal, onClose);
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

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll<HTMLElement>('[data-modal]:not([hidden])').forEach(closeModal);
});
