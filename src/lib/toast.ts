/** Muestra el aviso flotante del layout (componente Toast.astro) durante 4 segundos */
let timer: ReturnType<typeof setTimeout> | undefined;

export function showToast(message: string) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toast-message');
  if (!toast || !text) return;
  text.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('flex');
  clearTimeout(timer);
  timer = setTimeout(() => {
    toast.classList.add('hidden');
    toast.classList.remove('flex');
  }, 4000);
}
