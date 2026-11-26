/**
 * Botón "Cancelar" en las ventanas de edición de ítems del CMS (bloques de página, listas…).
 *
 * En Keystatic lo que se escribe en esa ventana se aplica al instante y "Done" solo la cierra,
 * así que no hay forma de descartar. Este parche (aplicado al compilar, sin tocar node_modules):
 * - guarda los valores del ítem al abrir la ventana,
 * - agrega "Cancelar", que los restaura y cierra.
 * "Done", Esc o clic fuera mantienen lo editado (como siempre).
 *
 * Hecho para @keystatic/core 0.6.9 (versión fija en package.json). Si una actualización cambia el
 * código, el parche se omite con un aviso y el CMS sigue funcionando sin el botón.
 */
const TARGET = /@keystatic[\\/]core[\\/]dist[\\/]index-[0-9a-f]+\.js$/;
const MARK = '__taSnapshots';

const EDITS = [
  ['function ArrayFieldInput(props) {', `const ${MARK} = new Map();\nfunction ArrayFieldInput(props) {`],
  [
    `  let t12;
  if ($[25] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = () => {
      setModalState({`,
    `  let t12;
  if ($[25] === Symbol.for("react.memo_cache_sentinel")) {
    t12 = () => {
      ${MARK}.clear();
      setModalState({`,
  ],
  [
    `    if (modalState.state !== "edit") {
      t13 = undefined;
      break bb0;
    }
`,
    `    if (modalState.state !== "edit") {
      t13 = undefined;
      break bb0;
    }
    const __taItem = props.elements[modalState.index];
    if (__taItem && !${MARK}.has(__taItem.key)) ${MARK}.set(__taItem.key, previewPropsToValue(__taItem));
`,
  ],
  [
    `    if ($[31] === Symbol.for("react.memo_cache_sentinel")) {
      t15 = () => {
        setModalState({`,
    `    if ($[31] === Symbol.for("react.memo_cache_sentinel")) {
      t15 = () => {
        ${MARK}.clear();
        setModalState({`,
  ],
  [
    `    let t17;
    if ($[36] !== formId) {
      t17 = /*#__PURE__*/jsx(ButtonGroup, {
        children: /*#__PURE__*/jsx(Button, {
          form: formId,
          prominence: "high",
          type: "submit",
          children: "Done"
        })
      });
      $[36] = formId;
      $[37] = t17;
    } else {
      t17 = $[37];
    }`,
    `    const t17 = /*#__PURE__*/jsxs(ButtonGroup, {
      children: [/*#__PURE__*/jsx(Button, {
        onPress: () => {
          const item = props.elements[modalState.index];
          const original = item && ${MARK}.get(item.key);
          if (item && original !== undefined) setValueToPreviewProps(original, item);
          ${MARK}.clear();
          setModalState({
            state: "closed"
          });
        },
        children: "Cancelar"
      }), /*#__PURE__*/jsx(Button, {
        form: formId,
        prominence: "high",
        type: "submit",
        children: "Done"
      })]
    });`,
  ],
];

/** Aplica el parche; devuelve null si el archivo no es el esperado o ya está parcheado */
export function patchKeystatic(code) {
  if (!code.includes('function ArrayEditItemModalContent(') || code.includes(MARK)) return null;
  let out = code;
  for (const [from, to] of EDITS) {
    if (!out.includes(from)) {
      console.warn('[keystatic-cancel] Keystatic cambió: se omite el botón Cancelar');
      return null;
    }
    out = out.replace(from, to);
  }
  return out;
}

/** Plugin de Vite (build) + esbuild (pre-empaquetado de `astro dev`) */
export function keystaticCancelButton() {
  return {
    name: 'ta720-keystatic-cancel',
    enforce: 'pre',
    transform(code, id) {
      if (!TARGET.test(id.split('?')[0])) return null;
      const out = patchKeystatic(code);
      return out ? { code: out, map: null } : null;
    },
  };
}

export const keystaticCancelEsbuild = {
  name: 'ta720-keystatic-cancel',
  setup(build) {
    build.onLoad({ filter: TARGET }, async ({ path }) => {
      const { readFile } = await import('node:fs/promises');
      const code = await readFile(path, 'utf8');
      const out = patchKeystatic(code);
      return out ? { contents: out, loader: 'js' } : undefined;
    });
  },
};
