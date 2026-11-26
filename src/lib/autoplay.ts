/**
 * Avance automático que solo corre mientras el elemento está en pantalla y la pestaña del navegador
 * está visible (carruseles, recorridos). Fuera de vista no gasta CPU ni batería.
 */
export function autoplay(el: Element, step: () => void, ms: number) {
  let timer: ReturnType<typeof setInterval> | undefined;
  let inView = false;
  let paused = false;
  const sync = () => {
    clearInterval(timer);
    timer = undefined;
    if (inView && !paused && !document.hidden) timer = setInterval(step, ms);
  };
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    sync();
  }).observe(el);
  document.addEventListener('visibilitychange', sync);
  return {
    /** Reinicia la cuenta (tras un clic manual) */
    restart: sync,
    pause: () => ((paused = true), sync()),
    resume: () => ((paused = false), sync()),
  };
}
