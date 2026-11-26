/**
 * Pausa las animaciones CSS continuas (aurora, marquesina, brillos, órbitas) de las secciones que no
 * están en pantalla. Al volver a verlas siguen donde quedaron: misma apariencia, menos CPU y batería.
 */
const sections = document.querySelectorAll<HTMLElement>('main section, footer');
if ('IntersectionObserver' in window && sections.length) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting)),
    { rootMargin: '200px 0px' }
  );
  sections.forEach((s) => io.observe(s));
}
