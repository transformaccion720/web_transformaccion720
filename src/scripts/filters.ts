/**
 * Filtros por categoría (casos de éxito, portafolio, recursos), como en el mockup.
 * [data-filter-scope] contiene botones [data-filter="clave"] y tarjetas [data-filter-item="clave"].
 * La clave "todos" muestra todo.
 */
document.querySelectorAll<HTMLElement>('[data-filter-scope]').forEach((scope) => {
  const buttons = [...scope.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const items = [...scope.querySelectorAll<HTMLElement>('[data-filter-item]')];
  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const key = btn.dataset.filter!;
      buttons.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      items.forEach((it) => (it.hidden = key !== 'todos' && it.dataset.filterItem !== key));
    })
  );
});
