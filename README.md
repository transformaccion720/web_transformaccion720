# Web oficial TransformAcción720

Sitio de TransformAcción720 construido sobre CMS Starter: **Astro 7 · Keystatic · Tailwind 4 · Vercel**.
Diseño y comportamiento fieles a `mockup/Web_TA720_vf3.html`. Todo el contenido se edita en el CMS.

## Empezar

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev     # web: http://localhost:4321 · CMS: http://localhost:4321/keystatic (o /centrodemando)
```

| Comando         | Qué hace                                   |
| --------------- | ------------------------------------------ |
| `npm run dev`   | Servidor local                             |
| `npm run build` | Verifica tipos y genera el sitio           |
| `npm test`      | Construye y ejecuta las pruebas (`tests/`) |
| `npm run lint`  | ESLint                                     |

## Páginas

| Ruta | Contenido (CMS → Páginas) |
| --- | --- |
| `/` | Portada con video, propuesta de valor (cohete), servicios 3D, banda de diagnóstico, experiencias/partners, testimonios, barra flotante |
| `/nosotros` | Pestañas: Quiénes somos · Metodología (Ikigai, Pilares, CORE) · Casos de éxito |
| `/servicios` | Pestañas: Transformación · Soluciones Digitales (Qué hacemos / Planes y portafolio) · Formación |
| `/hub` | Pestañas: Herramientas (descargas) · Certificaciones · Campus LMS · Ecosistema |
| `/blog` | Novedades: buscador, categorías, destacado y lector en ventana (+ página por artículo) |
| `/conversemos` | Canales + formulario (Resend) + 6 preguntas frecuentes |
| `/legal/…` | Términos, Privacidad y Libro de Reclamaciones (INDECOPI + Redis) |

Las pestañas se abren desde cualquier enlace con `#clave`: `/servicios#soluciones-digitales`, `/hub#campus`.

**Centro de Diagnóstico** (CMS → 🧮 Diagnóstico): dos calculadoras (horas perdidas y ahorro en costos) que se
abren desde cualquier botón con la acción "Abrir diagnóstico"; el resultado llega por correo.

**Botones con acción:** en el CMS cada botón elige qué hace: ir a un enlace, llevar a Conversemos con el
servicio ya elegido, abrir el diagnóstico o abrir un video de YouTube.

## Estructura

```
mockup/                        Diseño de referencia (no se publica)
keystatic.config.ts            Campos del CMS + bloques TA720
src/content.config.ts          Validación (Zod), campo por campo igual al CMS
src/content/                   Contenido (pages, posts, legal, settings)
src/components/ui/             Átomos: ActionButton, Icon, LogoMark, Rich, Highlight…
src/components/molecules/      SegmentedTabs
src/components/blocks/         Un componente por bloque + SectionRenderer (pestañas)
src/components/modals/         Video y Centro de Diagnóstico (globales)
src/components/layout/         Header, footer, tema claro/oscuro, toast, cookies
src/scripts/                   Islas JS: tabs, filters, modal
src/lib/                       Lógica pura con pruebas: diagnostic, actions, tones, format, complaints…
src/styles/                    global.css (tokens TA720) + effects.css (aurora, glass, 3D, marquee)
```

## Publicar

Igual que CMS Starter (ver `.env.example`): en Vercel definir `RESEND_API_KEY`, Redis para el Libro de
Reclamaciones y, si se usa CMS en la nube, `PUBLIC_KEYSTATIC_CLOUD_PROJECT`. Los correos de destino se
configuran en CMS → Configuración general → Correos de los formularios.

**Seguridad del CMS:** mientras no se configure `PUBLIC_KEYSTATIC_CLOUD_PROJECT`, en producción `/keystatic` y
`/api/keystatic` responden 404 (el modo local no tiene login). Para editar en línea, conectar Keystatic Cloud.

**Rendimiento:** las imágenes se optimizan solas (WebP en varios tamaños); aun así, sube fotos de máx. ~1800 px de
ancho. El CSS va en un archivo con caché de 1 año. Mide en producción con PageSpeed Insights.

## Pendiente

- Recursos descargables con captura de leads y enlace firmado (fase final).
- Enlace del Campus LMS a TA720Academy.
- Reemplazar fotos, logos y enlaces de ejemplo (LinkedIn, Skool, video de YouTube) por los reales.
