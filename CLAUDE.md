# Web oficial TransformAcción720 — contexto para agentes IA

Responde al dueño en **español**, breve y simple.

## Qué es
Web principal de TransformAcción720 (consultoría, soluciones digitales, formación). Copia de `../CMS_Starter`
(**Astro 7 + Keystatic 0.6 + Tailwind 4 + Vercel**) con el diseño exacto de `mockup/Web_TA720_vf3.html`.
El mockup es la referencia visual y de comportamiento: no se publica, no se borra.

## Arquitectura (Component-Driven + bloques del CMS + islas)
- `components/ui` (átomos) → `components/molecules` → `components/blocks` (un bloque = una sección del CMS)
  → `layouts` → `pages`. Los componentes reciben datos por props; solo las páginas leen `astro:content`.
- Bloque nuevo = `keystatic.config.ts` + `src/content.config.ts` (mismo nombre de campo) + componente +
  registro en `SectionRenderer.astro`.
- Lógica pura y probada en `src/lib` (`diagnostic.ts`, `actions.ts`, `tones.ts`, `format.ts`…).
- JS solo en islas: `src/scripts/tabs.ts` (pestañas por #hash), `filters.ts`, `modal.ts` y el script de cada bloque.

## Convenciones propias de TA720
- Las vistas del mockup son rutas reales: `/`, `/nosotros`, `/servicios`, `/hub`, `/blog`, `/conversemos`,
  `/legal/libro-de-reclamaciones`. Sus sub-pestañas se eligen con el hash (`/servicios#soluciones-digitales`).
- Pestañas: el bloque `pageHero`/`segmentTabs` define claves; cada bloque elige su pestaña en el campo
  "Pestaña donde aparece" (`panel`). Varias claves separadas por espacio = pestaña dentro de pestaña.
- Botones con acción (`actions.ts`): enlace, Conversemos con servicio preseleccionado (`?servicio=`),
  diagnóstico (horas/costos) o video. Modales globales en `BaseLayout`: video y Centro de Diagnóstico.
- Colores: tokens `brand-navy/deep/blue/cyan/teal/orange/amber/cream` (global.css) y tonos del CMS (`tones.ts`).
  Modo oscuro por clase `.dark` (elección guardada o automático de 7 pm a 6 am). Efectos en `styles/effects.css`.
- Formularios → `/api/contact` con `kind`: `contacto`, `diagnostico`, `descarga` (Resend).

## Pendiente (acordado con el dueño)
- **Recursos descargables con email** (fase final): hoy la descarga es inmediata y el aviso llega por correo.
  Falta almacén de leads (adaptador sheets|resend|redis) y enlace firmado. Subir los archivos en el CMS.
- **Campus LMS**: solo informativo; al tener TA720Academy, poner su enlace en el bloque Campus LMS.
- Fotos de personas, logos de clientes y enlaces de LinkedIn/Skool/YouTube son de ejemplo: reemplazar en el CMS.

## Reglas
- Todo texto o imagen visible debe ser editable desde el CMS.
- Commit y push solo cuando el dueño lo pida. No tocar `../CMS_Starter` desde aquí.
- Antes de entregar: `npm test`, `npm run lint`, `npx astro check`.
