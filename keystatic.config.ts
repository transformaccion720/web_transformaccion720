import { config, fields, collection, singleton } from '@keystatic/core';
import { ICON_OPTIONS } from './src/lib/block-icons';
import { TONE_OPTIONS } from './src/lib/tones';
import { ACTION_OPTIONS } from './src/lib/actions';

// Con PUBLIC_KEYSTATIC_CLOUD_PROJECT (ej: "mi-equipo/mi-proyecto") el CMS guarda en la nube: cada cambio
// se vuelve un commit en GitHub y Vercel publica solo. Sin la variable (tu PC) guarda en el disco.
const cloudProject = import.meta.env?.PUBLIC_KEYSTATIC_CLOUD_PROJECT as string | undefined;

// ----------------------------------------------------
// Campos reutilizables
// ----------------------------------------------------
const text = (label: string, description?: string, defaultValue?: string) =>
  fields.text({ label, description, defaultValue });

const longText = (label: string, description?: string) =>
  fields.text({ label, description, multiline: true });

const HIGHLIGHT_HINT = 'Encierra palabras entre *asteriscos* para destacarlas en color.';
const BOLD_HINT = 'Encierra palabras entre **dobles asteriscos** para ponerlas en negrita.';

/** Imagen guardada dentro de src/assets (Astro la optimiza: AVIF/WebP, tamaños, carga diferida) */
const imageIn = (folder: string) => (label: string, description?: string) =>
  fields.image({
    label,
    description,
    directory: `src/assets/images/${folder}`,
    publicPath: `@/assets/images/${folder}/`,
  });

const pageImage = imageIn('pages');

const iconField = (label = 'Ícono', defaultValue = 'none') =>
  fields.select({ label, options: ICON_OPTIONS, defaultValue });

const toneField = (label = 'Color', defaultValue = 'blue') =>
  fields.select({ label, options: TONE_OPTIONS, defaultValue });

const strings = (label: string, itemLabel = 'Elemento') =>
  fields.array(fields.text({ label: itemLabel }), { label, itemLabel: (p) => p.value || itemLabel });

/** Botón con acción: enlace, Conversemos con servicio, diagnóstico o video */
const actionButton = (label: string, defaultAction = 'link') =>
  fields.object(
    {
      text: fields.text({ label: 'Texto del botón', description: 'Vacío = no se muestra el botón.' }),
      action: fields.select({
        label: '¿Qué hace al hacer clic?',
        options: ACTION_OPTIONS,
        defaultValue: defaultAction,
      }),
      value: fields.text({
        label: 'Enlace / servicio / video',
        description:
          'Enlace: /servicios#soluciones-digitales - Servicio: "Web Corporativa Premium" (se preselecciona en el formulario) - Video: enlace de YouTube. En diagnóstico déjalo vacío.',
      }),
    },
    { label }
  );

const buttonsList = (label = 'Botones') =>
  fields.array(
    fields.object({
      text: fields.text({ label: 'Texto del botón' }),
      action: fields.select({
        label: '¿Qué hace al hacer clic?',
        options: ACTION_OPTIONS,
        defaultValue: 'link',
      }),
      value: fields.text({ label: 'Enlace / servicio / video' }),
    }),
    { label, itemLabel: (p) => p.fields.text.value || 'Botón' }
  );

const anchor = fields.text({
  label: 'Ancla (opcional)',
  description: 'Ej: servicios ➡️ se puede enlazar a /#servicios. Sin espacios ni tildes.',
});

const panel = fields.text({
  label: 'Pestaña donde aparece (opcional)',
  description:
    'Si la página tiene pestañas (en la portada interior o en un selector), escribe la clave de la pestaña. Ej: metodologia. Para pestañas dentro de pestañas, varias claves separadas por espacio: "soluciones-digitales portafolio". Vacío = siempre visible.',
});

const placement = { anchor, panel };

const tabsField = (label = 'Pestañas') =>
  fields.array(
    fields.object({
      label: text('Texto de la pestaña'),
      key: text(
        'Clave',
        'Sin espacios ni tildes. Ej: quienes-somos. Se usa en el enlace /nosotros#quienes-somos.'
      ),
    }),
    { label, itemLabel: (p) => p.fields.label.value || 'Pestaña' }
  );

const filtersField = () =>
  fields.array(fields.object({ key: text('Clave', 'Ej: banca'), label: text('Texto del filtro') }), {
    label: 'Filtros',
    itemLabel: (p) => p.fields.label.value || 'Filtro',
  });

const metricsField = (label = 'Cifras') =>
  fields.array(
    fields.object({
      value: text('Cifra', 'Ej: +45, -38%, 3x'),
      label: text('Descripción'),
      tone: toneField('Color de la cifra', 'navy'),
    }),
    { label, itemLabel: (p) => `${p.fields.value.value} ${p.fields.label.value}`.trim() || 'Cifra' }
  );

const heading = {
  kicker: fields.text({ label: 'Antetítulo', description: 'Texto pequeño sobre el título. Opcional.' }),
  title: fields.text({ label: 'Título' }),
  subtitle: fields.text({ label: 'Subtítulo', multiline: true }),
};

const common = {
  anchor,
  panel,
  background: fields.select({
    label: 'Fondo de la sección',
    options: [
      { label: 'Blanco', value: 'light' },
      { label: 'Crema suave', value: 'muted' },
      { label: 'Azul noche', value: 'dark' },
      { label: 'Degradado de marca', value: 'brand' },
    ],
    defaultValue: 'light',
  }),
};

const button = (label: string) =>
  fields.object(
    {
      text: fields.text({ label: 'Texto del botón', description: 'Vacío = no se muestra el botón.' }),
      href: fields.text({ label: 'Enlace del botón', description: 'Ej: /conversemos, /servicios' }),
    },
    { label }
  );

const titled = (fallback: string) => (props: { fields: { title: { value: string } } }) =>
  props.fields.title.value ? `${fallback}: ${props.fields.title.value}` : fallback;

// ----------------------------------------------------
// Bloques TA720 (diseño del mockup oficial)
// ----------------------------------------------------
const ta720Blocks = {
  heroVideo: {
    label: '★ Portada principal con video',
    itemLabel: titled('Portada con video'),
    schema: fields.object({
      badge: text('Etiqueta superior'),
      title: longText('Título', HIGHLIGHT_HINT),
      text: longText('Texto'),
      primary: actionButton('Botón principal', 'diagnosticHours'),
      secondary: actionButton('Botón secundario'),
      stats: metricsField('Cifras de confianza (3)'),
      video: fields.object(
        {
          image: pageImage('Imagen de la tarjeta de video', 'Horizontal, mínimo 1200 px.'),
          imageAlt: text('Texto alternativo'),
          url: text('Enlace de YouTube'),
          label: text('Etiqueta sobre la imagen', 'Ej: Video Explicativo - TA720 (02:15)'),
          caption: text('Frase bajo la etiqueta'),
          modalTitle: text('Título de la ventana del video'),
        },
        { label: 'Tarjeta de video (derecha)' }
      ),
      ...placement,
    }),
  },

  valueJourney: {
    label: '★ Propuesta de valor (barra del cohete)',
    itemLabel: titled('Propuesta de valor'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      text: longText('Texto a la derecha'),
      stepLabel: text('Prefijo de cada paso', 'Ej: PASO ➡️ PASO 01', 'PASO'),
      steps: fields.array(
        fields.object({
          title: text('Título'),
          desc: longText('Descripción'),
          icon: iconField(),
          tone: toneField(),
        }),
        { label: 'Pasos (se numeran solos)', itemLabel: (p) => p.fields.title.value || 'Paso' }
      ),
      ...placement,
    }),
  },

  serviceCards: {
    label: '★ Resumen de servicios (tarjetas 3D)',
    itemLabel: titled('Resumen de servicios'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título', HIGHLIGHT_HINT),
      linkText: text('Enlace a la derecha', undefined, 'Ver todos los servicios ➡️'),
      linkHref: text('Dirección del enlace', undefined, '/servicios'),
      cards: fields.array(
        fields.object({
          image: pageImage('Imagen'),
          imageAlt: text('Texto alternativo'),
          icon: iconField(),
          title: text('Título'),
          desc: longText('Descripción'),
          href: text('Enlace', 'Ej: /servicios#transformacion'),
          linkText: text('Texto del enlace', undefined, 'Conocer más ➡️'),
        }),
        { label: 'Tarjetas', itemLabel: (p) => p.fields.title.value || 'Tarjeta' }
      ),
      ...placement,
    }),
  },

  ctaBand: {
    label: '★ Banda de llamado a la acción',
    itemLabel: titled('Banda de llamado'),
    schema: fields.object({
      style: fields.select({
        label: 'Estilo',
        options: [
          { label: 'Impacto (degradado, botones grandes)', value: 'impact' },
          { label: 'Azul marino (al pie de un servicio)', value: 'navy' },
        ],
        defaultValue: 'navy',
      }),
      kicker: text('Etiqueta superior (opcional)', 'Ej: Diagnóstico gratuito en 2 minutos'),
      icon: iconField('Ícono (opcional)', 'rocket'),
      title: text('Título'),
      text: longText('Texto (opcional)'),
      buttons: buttonsList('Botones (1 o 2)'),
      ...placement,
    }),
  },

  trustLogos: {
    label: '★ Experiencias corporativas y partners',
    itemLabel: titled('Experiencias y partners'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      logos: fields.array(
        fields.object({
          name: text('Nombre'),
          logo: pageImage('Logo (opcional)', 'Vacío = se muestra el nombre en texto, como en el diseño.'),
        }),
        {
          label: 'Organizaciones (cinta en movimiento)',
          itemLabel: (p) => p.fields.name.value || 'Organización',
        }
      ),
      partnersKicker: text('Partners: antetítulo'),
      partnersTitle: text('Partners: título'),
      partnersText: longText('Partners: texto'),
      partnerLabel: text('Etiqueta del partner', undefined, 'Partner oficial'),
      alliesLabel: text('Etiqueta de aliados', undefined, 'Aliados estratégicos'),
      partners: fields.array(
        fields.object({
          name: text('Nombre'),
          logo: pageImage('Logo'),
          note: text('Nota corta (opcional)', 'Ej: Certificación internacional'),
          type: fields.select({
            label: 'Tipo',
            options: [
              { label: 'Partner (se destaca)', value: 'partner' },
              { label: 'Aliado estratégico', value: 'ally' },
            ],
            defaultValue: 'ally',
          }),
        }),
        {
          label: 'Partners y aliados (con logo)',
          itemLabel: (p) =>
            `${p.fields.name.value} (${p.fields.type.value === 'partner' ? 'partner' : 'aliado'})`,
        }
      ),
      ...placement,
    }),
  },

  testimonialsCarousel: {
    label: '★ Testimonios (carrusel de 3)',
    itemLabel: titled('Testimonios'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      items: fields.array(
        fields.object({
          avatar: pageImage('Foto'),
          name: text('Nombre'),
          role: text('Cargo | Sector'),
          quote: longText('Testimonio'),
        }),
        { label: 'Testimonios', itemLabel: (p) => p.fields.name.value || 'Testimonio' }
      ),
      ...placement,
    }),
  },

  costStrip: {
    label: '★ Franja de cifras con barras (costo de no transformarse)',
    itemLabel: titled('Franja de cifras'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      source: text('Fuente (letra pequeña)'),
      items: fields.array(
        fields.object({
          value: text('Cifra', 'Ej: 52%. El número llena la barra y se anima al aparecer.'),
          label: text('Descripción'),
          tone: toneField('Color', 'orange'),
        }),
        {
          label: 'Cifras (3 o 4)',
          itemLabel: (p) => `${p.fields.value.value} ${p.fields.label.value}`.trim() || 'Cifra',
        }
      ),
      ...placement,
    }),
  },

  scrollDock: {
    label: '★ Barra flotante de navegación (portada)',
    itemLabel: () => 'Barra flotante',
    schema: fields.object({
      startLabel: text('Texto inicial', undefined, 'Inicio'),
      items: fields.array(
        fields.object({ label: text('Texto'), anchor: text('Ancla de la sección', 'Ej: inicio-propuesta') }),
        { label: 'Atajos', itemLabel: (p) => p.fields.label.value || 'Atajo' }
      ),
      button: actionButton('Botón destacado', 'diagnosticHours'),
    }),
  },

  pageHero: {
    label: '★ Portada interior (aurora + pestañas)',
    itemLabel: titled('Portada interior'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      text: longText('Texto'),
      tabs: tabsField('Pestañas (opcional)'),
      anchor,
    }),
  },

  founders: {
    label: '★ Quiénes somos + fundadores',
    itemLabel: titled('Quiénes somos'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      body: longText('Texto', BOLD_HINT),
      stats: metricsField('Cifras (3)'),
      founders: fields.array(
        fields.object({
          photo: pageImage('Foto', 'Cuadrada, mínimo 400 px.'),
          role: text('Cargo'),
          tone: toneField('Color'),
          name: text('Nombre'),
          linkedin: text('Enlace de LinkedIn'),
          bio: longText('Descripción'),
          quote: longText('Frase'),
          chips: strings('Especialidades', 'Especialidad'),
        }),
        { label: 'Fundadores', itemLabel: (p) => p.fields.name.value || 'Fundador' }
      ),
      ...placement,
    }),
  },

  teamGrid: {
    label: '★ Equipo especialista',
    itemLabel: titled('Equipo'),
    schema: fields.object({
      enabled: fields.checkbox({
        label: 'Mostrar el equipo especialista en la web',
        description:
          'Desmárcalo mientras el equipo sean colaboradores independientes. Al tener personas, márcalo y ve agregándolas abajo.',
        defaultValue: false,
      }),
      kicker: text('Antetítulo'),
      title: text('Título'),
      members: fields.array(
        fields.object({
          photo: pageImage('Foto'),
          name: text('Nombre'),
          role: text('Cargo'),
          tone: toneField('Color del cargo'),
          bio: longText('Descripción'),
        }),
        { label: 'Integrantes', itemLabel: (p) => p.fields.name.value || 'Integrante' }
      ),
      ...placement,
    }),
  },

  methodology: {
    label: '★ Metodología (Ikigai - Pilares - CORE)',
    itemLabel: titled('Metodología'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      text: longText('Texto'),
      highlights: fields.array(
        fields.object({
          symbol: text('Símbolo', 'Ej: ⊞ ◎ ⇄ ↗'),
          title: text('Título'),
          desc: text('Descripción'),
          tone: toneField(),
        }),
        { label: 'Beneficios (4)', itemLabel: (p) => p.fields.title.value || 'Beneficio' }
      ),
      panelKicker: text('Panel: antetítulo'),
      panelTitle: text('Panel: título'),
      tabIkigai: text('Pestaña 1', undefined, 'Filosofía Ikigai'),
      tabPillars: text('Pestaña 2', undefined, 'Pilares TA720'),
      tabCore: text('Pestaña 3', undefined, 'Método CORE'),
      ikigai: fields.object(
        {
          top: text('Círculo superior', undefined, 'CLIENTE'),
          left: text('Círculo izquierdo', undefined, 'PERSONAS'),
          right: text('Círculo derecho (línea 1)', undefined, 'PROCESOS'),
          right2: text('Círculo derecho (línea 2)', undefined, '& TECH'),
          bottom: text('Círculo inferior', undefined, 'FINANZAS'),
          center: text('Centro (línea 1)', undefined, 'IKIGAI'),
          center2: text('Centro (línea 2)', undefined, 'TA720'),
          items: fields.array(
            fields.object({
              title: text('Título', 'Ej: ↑ Cliente'),
              desc: text('Descripción'),
              tone: toneField(),
            }),
            { label: 'Explicaciones (4)', itemLabel: (p) => p.fields.title.value || 'Explicación' }
          ),
        },
        { label: 'Pestaña 1: Ikigai' }
      ),
      pillars: fields.array(
        fields.object({
          icon: iconField('Ícono', 'chart'),
          title: text('Título'),
          tag: text('Palabra clave (opcional)', 'Ej: Decidir con evidencia'),
          desc: longText('Descripción'),
          tone: toneField(),
        }),
        { label: 'Pestaña 2: Pilares', itemLabel: (p) => p.fields.title.value || 'Pilar' }
      ),
      phases: fields.array(
        fields.object({
          letter: text('Letra', 'Ej: C'),
          title: text('Título'),
          desc: longText('Descripción'),
          foot: text('Pie', 'Ej: Fase 01 ➡️'),
          tone: toneField(),
        }),
        { label: 'Pestaña 3: Fases CORE', itemLabel: (p) => p.fields.title.value || 'Fase' }
      ),
      ...placement,
    }),
  },

  caseStudies: {
    label: '★ Casos de éxito por industria',
    itemLabel: titled('Casos de éxito'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      allLabel: text('Filtro "todos"', undefined, 'Todos'),
      filters: filtersField(),
      videoText: text('Etiqueta de video', undefined, '▶ Ver Video'),
      cases: fields.array(
        fields.object({
          category: text('Clave del filtro', 'Debe coincidir con un filtro. Ej: banca'),
          categoryLabel: text('Etiqueta de industria'),
          tone: toneField('Color de la etiqueta', 'navy'),
          image: pageImage('Imagen'),
          imageAlt: text('Texto alternativo'),
          videoUrl: text('Video de YouTube (opcional)'),
          title: text('Título'),
          desc: longText('Descripción'),
          metrics: metricsField('Resultados (2)'),
        }),
        { label: 'Casos', itemLabel: (p) => p.fields.title.value || 'Caso' }
      ),
      ...placement,
    }),
  },

  serviceDetail: {
    label: '★ Detalle de servicio',
    itemLabel: titled('Servicio'),
    schema: fields.object({
      badge: text('Etiqueta'),
      tone: toneField('Color del servicio', 'orange'),
      title: text('Título'),
      text: longText('Texto'),
      checks: strings('Puntos con check', 'Punto'),
      primary: actionButton('Botón principal', 'contact'),
      primaryStyle: fields.select({
        label: 'Color del botón principal',
        options: [
          { label: 'Azul marino', value: 'navy' },
          { label: 'Azul', value: 'blue' },
          { label: 'Verde azulado', value: 'teal' },
        ],
        defaultValue: 'navy',
      }),
      secondary: actionButton('Botón secundario', 'video'),
      image: pageImage('Imagen / portada del video'),
      imageAlt: text('Texto alternativo'),
      videoUrl: text('Video de YouTube (opcional)', 'Al hacer clic en la imagen se abre el video.'),
      videoTitle: text('Título de la ventana del video'),
      about: fields.object(
        {
          kicker: text('Antetítulo'),
          tone: toneField('Color del antetítulo', 'orange'),
          title: text('Título', undefined, '¿En qué consiste?'),
          text: longText('Texto', BOLD_HINT),
          facts: strings('Datos (ej: Duración: 8 a 16 semanas)', 'Dato'),
        },
        { label: 'Tarjeta "¿En qué consiste?"' }
      ),
      includes: fields.object(
        {
          kicker: text('Antetítulo'),
          tone: toneField('Color del antetítulo', 'teal'),
          title: text('Título', undefined, '¿Qué incluye?'),
          items: strings('Entregables', 'Entregable'),
        },
        { label: 'Tarjeta "¿Qué incluye?"' }
      ),
      experience: fields.object(
        {
          image: pageImage('Imagen principal (vacío = no se muestra este bloque)'),
          imageAlt: text('Texto alternativo'),
          slides: fields.array(fields.object({ image: pageImage('Foto'), alt: text('Texto alternativo') }), {
            label: 'Más fotos (carrusel, 1 o 2 adicionales)',
            itemLabel: (p) => p.fields.alt.value || 'Foto',
          }),
          badge: text('Etiqueta de la imagen'),
          badgeTone: toneField('Color de la etiqueta', 'orange'),
          caption: text('Frase sobre la imagen'),
          kicker: text('Antetítulo'),
          title: text('Título'),
          metrics: fields.array(
            fields.object({
              value: text('Cifra'),
              label: text('Descripción'),
              note: text('Nota'),
              tone: toneField('Color', 'orange'),
            }),
            { label: 'Métricas (3)', itemLabel: (p) => p.fields.value.value || 'Métrica' }
          ),
        },
        { label: 'Experiencias y métricas (opcional)' }
      ),
      ...placement,
    }),
  },

  segmentTabs: {
    label: '★ Selector de sub-pestañas',
    itemLabel: () => 'Selector de sub-pestañas',
    schema: fields.object({ tabs: tabsField(), ...placement }),
  },

  webPackages: {
    label: '★ Planes web y sistemas',
    itemLabel: titled('Planes'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      plans: fields.array(
        fields.object({
          tag: text('Nombre del plan', 'Ej: Plan Impulso'),
          tone: toneField('Color del nombre', 'teal'),
          title: text('Título'),
          desc: longText('Descripción'),
          features: strings('Incluye', 'Punto'),
          featured: fields.checkbox({ label: 'Destacado (fondo azul marino)', defaultValue: false }),
          ribbon: text('Cinta del destacado', 'Ej: Más Solicitado'),
          button: actionButton('Botón', 'contact'),
        }),
        { label: 'Planes', itemLabel: (p) => p.fields.title.value || 'Plan' }
      ),
      ...placement,
    }),
  },

  portfolioGrid: {
    label: '★ Portafolio digital (con detalle)',
    itemLabel: titled('Portafolio'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      allLabel: text('Filtro "todos"', undefined, 'Todos'),
      filters: filtersField(),
      detailText: text('Etiqueta de la foto', undefined, 'Ver detalle ➡️'),
      solutionLabel: text('Detalle: título 1', undefined, 'Qué se implementó'),
      resultLabel: text('Detalle: título 2', undefined, 'Impacto en el negocio'),
      closeText: text('Detalle: botón cerrar', undefined, 'Cerrar'),
      ctaText: text('Detalle: botón cotizar', undefined, 'Cotizar un proyecto similar ➡️'),
      ctaPrefix: text(
        'Servicio que se preselecciona',
        'Se le suma el nombre del proyecto.',
        'Proyecto similar a: '
      ),
      projects: fields.array(
        fields.object({
          category: text('Clave del filtro', 'Ej: web'),
          categoryLabel: text('Etiqueta'),
          tone: toneField('Color de la etiqueta'),
          image: pageImage('Imagen'),
          imageAlt: text('Texto alternativo'),
          title: text('Nombre del proyecto'),
          summary: text('Resumen (tarjeta)'),
          modalCategory: text('Etiqueta en el detalle', 'Ej: Web Corporativa - Sector Inmobiliario'),
          desc: longText('Descripción'),
          solution: longText('Qué se implementó'),
          result: longText('Impacto en el negocio'),
          tags: strings('Etiquetas', 'Etiqueta'),
        }),
        { label: 'Proyectos', itemLabel: (p) => p.fields.title.value || 'Proyecto' }
      ),
      ...placement,
    }),
  },

  resourceGrid: {
    label: '★ Kits y plantillas descargables',
    itemLabel: titled('Recursos'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      allLabel: text('Filtro "todos"', undefined, 'Todos'),
      filters: filtersField(),
      items: fields.array(
        fields.object({
          category: text('Clave del filtro', 'Ej: procesos'),
          image: pageImage('Imagen'),
          imageAlt: text('Texto alternativo'),
          format: text('Formato - tema', 'Ej: Excel / PDF - Procesos'),
          tone: toneField('Color del formato', 'orange'),
          title: text('Título'),
          desc: longText('Descripción'),
          buttonText: text('Botón', undefined, 'Descargar Gratis ↓'),
          file: fields.file({
            label: 'Archivo descargable',
            description: 'PDF, Excel, ZIP… Se entrega después de que la persona deja sus datos.',
            directory: 'public/recursos',
            publicPath: '/recursos/',
          }),
        }),
        { label: 'Recursos', itemLabel: (p) => p.fields.title.value || 'Recurso' }
      ),
      modal: fields.object(
        {
          kicker: text('Antetítulo', undefined, 'Descarga Gratuita'),
          intro: longText('Texto'),
          nameLabel: text('Campo nombre', undefined, 'Nombre completo *'),
          emailLabel: text('Campo correo', undefined, 'Correo electrónico *'),
          roleLabel: text('Campo cargo', undefined, 'Rol / Cargo en tu empresa *'),
          submitText: text('Botón', undefined, 'DESCARGAR AHORA ↓'),
          successToast: text('Aviso al terminar', 'Variable: {recurso}', 'Descarga habilitada: "{recurso}".'),
        },
        { label: 'Ventana de descarga' }
      ),
      ...placement,
    }),
  },

  programs: {
    label: '★ Programas y certificaciones',
    itemLabel: titled('Programas'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      kickerTone: toneField('Color del antetítulo', 'blue'),
      title: text('Título'),
      items: fields.array(
        fields.object({
          image: pageImage('Imagen'),
          imageAlt: text('Texto alternativo'),
          meta: text('Duración - modalidad', 'Ej: 6 Semanas - En Vivo'),
          tone: toneField('Color', 'orange'),
          title: text('Título'),
          desc: longText('Descripción'),
          button: actionButton('Botón', 'contact'),
        }),
        { label: 'Programas', itemLabel: (p) => p.fields.title.value || 'Programa' }
      ),
      ...placement,
    }),
  },

  lmsCampus: {
    label: '★ Campus LMS',
    itemLabel: titled('Campus LMS'),
    schema: fields.object({
      badge: text('Etiqueta'),
      title: text('Título'),
      text: longText('Texto'),
      buttonText: text('Botón', undefined, 'INGRESAR AL CAMPUS ➡️'),
      buttonHref: text('Enlace del campus', 'Vacío = muestra el aviso de abajo (aún sin campus).'),
      notice: text(
        'Aviso si no hay enlace',
        undefined,
        'Acceso LMS habilitado para alumnos y clientes corporativos activos.'
      ),
      image: pageImage('Imagen'),
      imageAlt: text('Texto alternativo'),
      ...placement,
    }),
  },

  ecosystem: {
    label: '★ Comunidad (Ecosistema TA720)',
    itemLabel: titled('Ecosistema'),
    schema: fields.object({
      image: pageImage('Imagen'),
      imageAlt: text('Texto alternativo'),
      badge: text('Etiqueta'),
      title: text('Título'),
      text: longText('Texto'),
      features: strings('Beneficios', 'Beneficio'),
      cardLogo: text('Tarjeta: sello', undefined, '720'),
      cardTitle: text('Tarjeta: nombre'),
      cardSubtitle: text('Tarjeta: subtítulo'),
      stats: fields.array(fields.object({ value: text('Cifra'), label: text('Descripción') }), {
        label: 'Tarjeta: cifras (3)',
        itemLabel: (p) => p.fields.value.value || 'Cifra',
      }),
      buttonText: text('Botón'),
      buttonHref: text('Enlace del botón', 'Ej: https://www.skool.com/…'),
      ...placement,
    }),
  },

  contactPanel: {
    label: '★ Contacto (canales + formulario)',
    itemLabel: titled('Contacto'),
    schema: fields.object({
      title: text('Título de canales', undefined, 'Canales Ejecutivos'),
      whatsappLabel: text('Etiqueta WhatsApp', undefined, 'WhatsApp Directo'),
      emailLabel: text('Etiqueta correo', undefined, 'Correo Corporativo'),
      addressLabel: text('Etiqueta sede', undefined, 'Sede Principal'),
      address: text('Sede', 'Ej: San Isidro, Lima - Perú (Atención LATAM)'),
      note: text('Nota al pie', 'Ej: Confidencialidad garantizada bajo acuerdo NDA.'),
      nameLabel: text('Campo nombre', undefined, 'Nombre completo *'),
      namePlaceholder: text('Ejemplo nombre', undefined, 'Ej. Carlos Mendoza'),
      companyLabel: text('Campo empresa', undefined, 'Empresa / Cargo *'),
      companyPlaceholder: text('Ejemplo empresa', undefined, 'Ej. Gerente General - Grupo X'),
      emailFieldLabel: text('Campo correo', undefined, 'Correo electrónico *'),
      emailPlaceholder: text('Ejemplo correo', undefined, 'carlos@empresa.com'),
      phoneLabel: text('Campo teléfono', undefined, 'Teléfono / WhatsApp *'),
      phonePlaceholder: text('Ejemplo teléfono', undefined, '+51 999 000 000'),
      serviceLabel: text('Campo servicio', undefined, 'Servicio de interés'),
      services: fields.array(
        fields.object({
          value: text('Servicio (lo que llega en el correo)'),
          label: text('Texto en la lista'),
        }),
        { label: 'Servicios de la lista', itemLabel: (p) => p.fields.label.value || 'Servicio' }
      ),
      messageLabel: text('Campo mensaje', undefined, 'Cuéntanos tu desafío *'),
      messagePlaceholder: text('Ejemplo mensaje'),
      prefill: text(
        'Mensaje automático al llegar desde un botón',
        'Variable: {servicio}',
        'Hola equipo de TransformAcción720, me gustaría conversar sobre: {servicio}.'
      ),
      submitText: text('Botón', undefined, 'ENVIAR SOLICITUD ➡️'),
      sendingText: text('Botón mientras envía', undefined, 'ENVIANDO…'),
      successToast: text(
        'Aviso al enviar',
        undefined,
        '¡Solicitud recibida! Un especialista te contactará en menos de 24 horas.'
      ),
      errorText: text(
        'Mensaje si falla',
        undefined,
        'No pudimos enviar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.'
      ),
      ...placement,
    }),
  },

  faqGrid: {
    label: '★ Preguntas frecuentes (cuadrícula)',
    itemLabel: titled('Preguntas'),
    schema: fields.object({
      kicker: text('Antetítulo'),
      title: text('Título'),
      items: fields.array(
        fields.object({
          tag: text('Etiqueta', 'Ej: TIEMPO (se numera sola: 01 - TIEMPO)'),
          question: text('Pregunta'),
          answer: longText('Respuesta'),
        }),
        { label: 'Preguntas', itemLabel: (p) => p.fields.question.value || 'Pregunta' }
      ),
      hint: text(
        'Ayuda del recorrido',
        undefined,
        'Toca cada parada del recorrido para descubrir la respuesta'
      ),
      prevText: text('Botón anterior', undefined, '⬅️ Anterior'),
      nextText: text('Botón siguiente', undefined, 'Siguiente parada ➡️'),
      progressText: text(
        'Texto de avance',
        'Variables: {leidas}, {total}',
        '{leidas} de {total} dudas resueltas'
      ),
      doneTitle: text('Al completar: título', undefined, '¡Recorrido completado! 🎉'),
      doneText: text(
        'Al completar: texto',
        undefined,
        'Ya conoces lo esencial. El siguiente paso es conversar sobre tu empresa.'
      ),
      doneButton: actionButton('Al completar: botón', 'contact'),
      ...placement,
    }),
  },
};

// ----------------------------------------------------
// Bloques genéricos de la plantilla (toman los colores de marca)
// ----------------------------------------------------
const genericBlocks = {
  hero: {
    label: 'Portada simple',
    itemLabel: titled('Portada'),
    schema: fields.object({
      ...heading,
      image: pageImage('Imagen', 'Mínimo 1600 px de ancho si va de fondo.'),
      imageAlt: text('Texto alternativo de la imagen'),
      layout: fields.select({
        label: 'Diseño',
        options: [
          { label: 'Imagen al lado', value: 'split' },
          { label: 'Imagen de fondo', value: 'background' },
          { label: 'Solo texto centrado', value: 'centered' },
        ],
        defaultValue: 'split',
      }),
      primary: button('Botón principal'),
      secondary: button('Botón secundario'),
      ...common,
    }),
  },
  textImage: {
    label: 'Texto + Imagen',
    itemLabel: titled('Texto + Imagen'),
    schema: fields.object({
      ...heading,
      body: longText('Texto', 'Separa párrafos con una línea vacía.'),
      bullets: fields.array(fields.text({ label: 'Punto' }), {
        label: 'Lista de puntos (opcional)',
        itemLabel: (p) => p.value || 'Punto',
      }),
      image: pageImage('Imagen'),
      imageAlt: text('Texto alternativo de la imagen'),
      imageSide: fields.select({
        label: 'Lado de la imagen',
        options: [
          { label: 'Derecha', value: 'right' },
          { label: 'Izquierda', value: 'left' },
        ],
        defaultValue: 'right',
      }),
      button: button('Botón'),
      ...common,
    }),
  },
  cards: {
    label: 'Tarjetas',
    itemLabel: titled('Tarjetas'),
    schema: fields.object({
      ...heading,
      columns: fields.select({
        label: 'Columnas en escritorio',
        options: [
          { label: '2', value: '2' },
          { label: '3', value: '3' },
          { label: '4', value: '4' },
        ],
        defaultValue: '3',
      }),
      items: fields.array(
        fields.object({
          icon: iconField(),
          image: pageImage('Imagen (opcional)'),
          title: text('Título de la tarjeta'),
          desc: longText('Descripción'),
          href: text('Enlace (opcional)'),
        }),
        { label: 'Tarjetas', itemLabel: (p) => p.fields.title.value || 'Tarjeta' }
      ),
      ...common,
    }),
  },
  gallery: {
    label: 'Galería de imágenes',
    itemLabel: titled('Galería'),
    schema: fields.object({
      ...heading,
      images: fields.array(
        fields.object({
          image: pageImage('Imagen'),
          alt: text('Texto alternativo'),
          caption: text('Pie de foto (opcional)'),
        }),
        { label: 'Imágenes', itemLabel: (p) => p.fields.caption.value || p.fields.alt.value || 'Imagen' }
      ),
      ...common,
    }),
  },
  stats: {
    label: 'Números / Métricas',
    itemLabel: titled('Números'),
    schema: fields.object({
      ...heading,
      items: fields.array(
        fields.object({
          value: text('Cifra', 'Ej: +250, 15 años, 98 %'),
          label: text('Descripción de la cifra'),
        }),
        {
          label: 'Cifras',
          itemLabel: (p) => `${p.fields.value.value} ${p.fields.label.value}`.trim() || 'Cifra',
        }
      ),
      ...common,
    }),
  },
  testimonials: {
    label: 'Testimonios (simple)',
    itemLabel: titled('Testimonios'),
    schema: fields.object({
      ...heading,
      items: fields.array(
        fields.object({
          quote: longText('Testimonio'),
          name: text('Nombre'),
          role: text('Cargo / Empresa'),
          avatar: pageImage('Foto (opcional)'),
        }),
        { label: 'Testimonios', itemLabel: (p) => p.fields.name.value || 'Testimonio' }
      ),
      ...common,
    }),
  },
  team: {
    label: 'Equipo (simple)',
    itemLabel: titled('Equipo'),
    schema: fields.object({
      ...heading,
      members: fields.array(
        fields.object({
          photo: pageImage('Foto'),
          name: text('Nombre'),
          role: text('Cargo'),
          bio: longText('Descripción breve'),
        }),
        { label: 'Integrantes', itemLabel: (p) => p.fields.name.value || 'Integrante' }
      ),
      ...common,
    }),
  },
  faq: {
    label: 'Preguntas frecuentes (acordeón)',
    itemLabel: titled('Preguntas'),
    schema: fields.object({
      ...heading,
      items: fields.array(fields.object({ question: text('Pregunta'), answer: longText('Respuesta') }), {
        label: 'Preguntas',
        itemLabel: (p) => p.fields.question.value || 'Pregunta',
      }),
      ...common,
    }),
  },
  logos: {
    label: 'Logos (clientes, aliados)',
    itemLabel: titled('Logos'),
    schema: fields.object({
      ...heading,
      kickerIcon: iconField('Ícono del antetítulo', 'handshake'),
      logos: fields.array(
        fields.object({
          logo: pageImage('Logo', 'SVG o PNG con fondo transparente.'),
          name: text('Nombre'),
          url: text('Enlace (opcional)'),
        }),
        { label: 'Logos', itemLabel: (p) => p.fields.name.value || 'Logo' }
      ),
      ...common,
    }),
  },
  video: {
    label: 'Video',
    itemLabel: titled('Video'),
    schema: fields.object({
      ...heading,
      url: text('Enlace de YouTube', 'Ej: https://www.youtube.com/watch?v=…'),
      ...common,
    }),
  },
  cta: {
    label: 'Llamado a la acción (simple)',
    itemLabel: titled('Llamado'),
    schema: fields.object({
      ...heading,
      primary: button('Botón principal'),
      secondary: button('Botón secundario'),
      ...common,
    }),
  },
};

const sectionBlocks = fields.blocks(
  { ...ta720Blocks, ...genericBlocks },
  { label: 'Secciones de la página' }
);

export default config({
  storage: cloudProject ? { kind: 'cloud' } : { kind: 'local' },
  ...(cloudProject ? { cloud: { project: cloudProject } } : {}),

  ui: {
    brand: { name: 'TransformAcción720' },
    navigation: {
      '📄 Páginas': ['pages'],
      '📰 Novedades': ['posts', 'blogCategories', 'blogSettings'],
      '🧮 Diagnóstico': ['diagnostic'],
      '⚖️ Legal': ['legal', 'complaintsBook'],
      '⚙️ Configuración': ['siteSettings'],
    },
  },

  collections: {
    // PÁGINAS armadas por secciones. "inicio" es la portada (/); el resto vive en /<slug>
    pages: collection({
      label: 'Páginas',
      slugField: 'title',
      path: 'src/content/pages/*',
      format: { data: 'json' },
      columns: ['title'],
      previewUrl: '/{slug}',
      schema: {
        title: fields.slug({
          name: {
            label: 'Título de la página',
            description: 'La página con dirección "inicio" es la portada.',
            validation: { isRequired: true },
          },
        }),
        seoTitle: text('Título para Google (opcional)', 'Vacío = se usa el título de la página.'),
        seoDescription: longText(
          'Descripción para Google',
          '140-160 caracteres. Vacío = la descripción general.'
        ),
        sections: sectionBlocks,
      },
    }),

    // NOVEDADES (BLOG) → /blog/<slug>
    posts: collection({
      label: 'Artículos',
      slugField: 'title',
      path: 'src/content/posts/*',
      entryLayout: 'content',
      format: { contentField: 'body' },
      columns: ['title', 'publishedAt'],
      previewUrl: '/blog/{slug}',
      schema: {
        title: fields.slug({ name: { label: 'Título', validation: { isRequired: true } } }),
        body: fields.markdoc({
          label: 'Contenido',
          description: 'El primer párrafo se destaca. Usa subtítulos (##) para cada idea.',
          extension: 'md',
          options: { image: { directory: 'public/images/blog', publicPath: '/images/blog/' } },
        }),
        excerpt: fields.text({
          label: 'Resumen (también es la descripción en Google)',
          multiline: true,
          validation: { isRequired: true, length: { max: 220 } },
        }),
        category: fields.relationship({
          label: 'Categoría',
          description: 'Las categorías se crean y renombran en "Categorías del blog".',
          collection: 'blogCategories',
        }),
        author: text('Autor', 'Ej: Gabino Tocto'),
        publishedAt: fields.date({ label: 'Fecha de publicación', validation: { isRequired: true } }),
        featured: fields.checkbox({ label: '★ Destacado (va arriba, en grande)', defaultValue: false }),
        readLabel: text(
          'Texto de duración (opcional)',
          'Vacío = "3 min de lectura" calculado solo. Ej eventos: Presencial - Lima'
        ),
        cover: imageIn('blog')('Imagen de portada', 'Horizontal 16:9.'),
        coverAlt: text('Texto alternativo de la portada'),
        keyTakeaways: fields.array(fields.text({ label: 'Punto', multiline: true }), {
          label: 'Puntos clave ("Lo que aprenderás")',
          itemLabel: (p) => p.value || 'Punto',
        }),
        quote: longText('Cita destacada'),
        tags: fields.array(fields.text({ label: 'Tema' }), {
          label: 'Temas',
          itemLabel: (p) => p.value || 'Tema',
        }),
        draft: fields.checkbox({ label: 'Borrador (no se publica)', defaultValue: false }),
      },
    }),

    blogCategories: collection({
      label: 'Categorías del blog',
      slugField: 'name',
      path: 'src/content/blog-categories/*',
      format: { data: 'json' },
      columns: ['name', 'order'],
      previewUrl: '/blog',
      schema: {
        name: fields.slug({
          name: {
            label: 'Nombre de la categoría',
            description: 'Puedes renombrarla cuando quieras: sus artículos se actualizan solos.',
            validation: { isRequired: true, length: { max: 40 } },
          },
          slug: {
            label: 'Identificador',
            description: 'Se crea solo al guardar. No lo cambies después: los artículos lo usan.',
          },
        }),
        order: fields.integer({ label: 'Orden', description: '1 aparece primero.', defaultValue: 10 }),
      },
    }),

    legal: collection({
      label: 'Páginas legales',
      slugField: 'title',
      path: 'src/content/legal/*',
      entryLayout: 'content',
      format: { contentField: 'body' },
      columns: ['title', 'updatedAt'],
      previewUrl: '/legal/{slug}',
      schema: {
        title: fields.slug({
          name: { label: 'Nombre (pestaña y footer)', validation: { isRequired: true } },
        }),
        shortTitle: text('Nombre corto (barra inferior del footer)', 'Ej: Términos'),
        icon: iconField('Ícono', 'file'),
        kicker: text('Antetítulo', 'Ej: Documento oficial'),
        heading: text('Título de la página', 'Vacío = el nombre.'),
        body: fields.markdoc({ label: 'Contenido', extension: 'md' }),
        description: fields.text({
          label: 'Resumen (SEO)',
          multiline: true,
          validation: { isRequired: true },
        }),
        updatedAt: fields.date({ label: 'Última actualización', validation: { isRequired: true } }),
        order: fields.integer({ label: 'Orden', defaultValue: 1 }),
      },
    }),
  },

  singletons: {
    siteSettings: singleton({
      label: 'Configuración general',
      path: 'src/content/settings/site',
      format: { data: 'json' },
      previewUrl: '/',
      schema: {
        brandName: fields.text({ label: 'Nombre de la marca', validation: { isRequired: true } }),
        tagline: text('Lema', 'Se usa en Google y al compartir.'),
        logo: imageIn('site')(
          'Logo para fondos oscuros (menú)',
          'PNG con letras blancas y fondo transparente. Vacío = isotipo dibujado.'
        ),
        shareImage: imageIn('site')(
          'Imagen para compartir (WhatsApp, LinkedIn, Facebook)',
          '1200 × 630 px. Se usa en las páginas que no tienen imagen propia.'
        ),
        logoLight: imageIn('site')(
          'Logo para fondos claros (pie de página)',
          'PNG con letras oscuras. En modo oscuro se usa el de fondos oscuros.'
        ),
        siteTitle: fields.text({
          label: 'Título SEO en Google',
          description: 'Pestaña del navegador y resultados de Google (50-60 caracteres).',
          validation: { isRequired: true },
        }),
        siteDescription: fields.text({
          label: 'Descripción SEO',
          multiline: true,
          validation: { isRequired: true },
        }),
        businessType: fields.select({
          label: 'Tipo de negocio (Google)',
          options: [
            { label: 'Servicios profesionales / Consultora', value: 'ProfessionalService' },
            { label: 'Organización', value: 'Organization' },
            { label: 'Empresa local', value: 'LocalBusiness' },
          ],
          defaultValue: 'ProfessionalService',
        }),
        city: text('Ciudad'),
        country: text('País (código ISO)', undefined, 'PE'),
        address: text('Dirección (opcional)'),
        location: text('Ubicación que se muestra en el pie', 'Ej: Lima, Perú'),
        phone: text('Teléfono (formato internacional)', 'Ej: +51 999 999 999'),
        whatsapp: text('WhatsApp (solo números, con código de país)', 'Ej: 51999999999'),
        whatsappDisplay: text('WhatsApp tal como se muestra', 'Ej: +51 999 999 999'),
        whatsappMessage: fields.text({ label: 'Mensaje de WhatsApp (botón CONVERSEMOS)', multiline: true }),
        whatsappFloat: fields.checkbox({
          label: 'Mostrar botón flotante de WhatsApp',
          description: 'El diseño oficial no lo usa.',
          defaultValue: false,
        }),
        whatsappTooltip: text('Globo del botón flotante', undefined, '¿Dudas? ¡Escríbenos por WhatsApp!'),
        email: text('Correo público', 'El que se muestra en la web (contacto y pie de página).'),
        mail: fields.object(
          {
            contactTo: fields.text({
              label: '📥 ¿A qué correo llegan los mensajes de los formularios?',
              description: 'Contacto, diagnóstico y descargas. Para varios, sepáralos con coma.',
              defaultValue: 'contacto@transformaccion720.com',
            }),
            complaintsTo: fields.text({
              label: '📥 ¿A qué correo llegan las hojas del Libro de Reclamaciones?',
              description: 'Vacío = el mismo de los formularios.',
              defaultValue: 'contacto@transformaccion720.com',
            }),
            fromName: fields.text({ label: '✉️ Nombre del remitente', defaultValue: 'TransformAcción720' }),
            fromEmail: fields.text({
              label: '✉️ Correo remitente (desde dónde se envían)',
              description: 'Debe terminar en el dominio verificado en Resend. No necesita ser un buzón real.',
              defaultValue: 'web@transformaccion720.com',
            }),
            autoReply: fields.checkbox({
              label: '↩️ Enviar confirmación automática a quien escribe',
              defaultValue: true,
            }),
            autoReplySubject: fields.text({
              label: '↩️ Asunto de la confirmación',
              defaultValue: 'Recibimos tu mensaje',
            }),
            autoReplyMessage: fields.text({
              label: '↩️ Texto de la confirmación',
              description: 'Va después de "Hola {nombre},". Deja una línea en blanco entre párrafos.',
              multiline: true,
            }),
          },
          { label: '📧 Correos de los formularios' }
        ),
        hours: text('Horario de atención'),
        analytics: fields.object(
          {
            gaId: fields.text({
              label: '📊 ID de medición de Google Analytics',
              description: 'Empieza con G-. Vacío = sin Analytics y sin aviso de cookies.',
            }),
            gaPropertyId: fields.text({ label: '📊 ID de propiedad de Analytics (solo números)' }),
            searchConsoleSite: fields.text({
              label: '🔎 Web en Search Console',
              description: 'Ej: sc-domain:transformaccion720.com',
            }),
            cookieText: fields.text({ label: '🍪 Texto del aviso de cookies', multiline: true }),
            cookieAccept: fields.text({ label: '🍪 Botón aceptar', defaultValue: 'Aceptar' }),
            cookieReject: fields.text({ label: '🍪 Botón rechazar', defaultValue: 'Rechazar' }),
            cookieMore: fields.text({
              label: '🍪 Enlace "más información"',
              defaultValue: 'Más información',
            }),
            cookieSettings: fields.text({
              label: '🍪 Enlace del pie para cambiar la elección',
              defaultValue: 'Preferencias de cookies',
            }),
          },
          { label: '📊 Analítica y cookies' }
        ),
        nav: fields.array(
          fields.object({
            label: text('Texto'),
            href: text('Enlace', 'Ej: /nosotros, /servicios, /blog'),
            children: fields.array(
              fields.object({
                label: text('Texto'),
                desc: text('Descripción corta'),
                href: text('Enlace', 'Ej: /servicios#soluciones-digitales'),
                icon: iconField(),
                tone: toneField(),
                mobileLabel: text(
                  'Texto en el menú del celular (opcional)',
                  'Ej: Servicios - Consultoría. Vacío = no aparece en el celular.'
                ),
              }),
              { label: 'Submenú desplegable (opcional)', itemLabel: (p) => p.fields.label.value || 'Opción' }
            ),
            mobileHidden: fields.checkbox({
              label: 'Ocultar en el menú del celular (se muestran sus opciones)',
              defaultValue: false,
            }),
          }),
          { label: 'Menú principal', itemLabel: (p) => p.fields.label.value || 'Enlace' }
        ),
        header: fields.object(
          {
            diagnosticText: text('Botón de diagnóstico', 'Vacío = no se muestra.', 'DIAGNÓSTICO'),
            whatsappText: text('Botón de WhatsApp', 'Vacío = no se muestra.', 'CONVERSEMOS'),
          },
          { label: 'Botones del menú' }
        ),
        footerText: longText('Footer: descripción breve'),
        footerNavTitle: text('Footer: título de navegación', undefined, 'Navegación'),
        footerContactTitle: text('Footer: título de contacto', undefined, 'Contacto'),
        footerBookText: text(
          'Footer: texto bajo "Libro de Reclamaciones"',
          undefined,
          'Virtual - Ley N° 29571 (Perú)'
        ),
        footerLabels: fields.object(
          {
            whatsapp: text('Etiqueta WhatsApp', undefined, 'WhatsApp'),
            email: text('Etiqueta correo', undefined, 'Email'),
            location: text('Etiqueta ubicación', undefined, 'Ubicación'),
          },
          { label: 'Footer: etiquetas de contacto' }
        ),
        notFound: fields.object(
          {
            kicker: text('Antetítulo', undefined, 'Error 404'),
            title: text('Título', undefined, 'Esta página no existe'),
            text: longText('Texto'),
            primary: text('Botón principal', undefined, 'Volver al inicio'),
            secondary: text('Botón secundario', undefined, 'Conversemos'),
            secondaryHref: text('Enlace del botón secundario', undefined, '/conversemos'),
          },
          { label: 'Página 404 (no encontrada)' }
        ),
        social: fields.array(
          fields.object({
            network: fields.select({
              label: 'Red',
              options: [
                { label: 'LinkedIn', value: 'linkedin' },
                { label: 'Instagram', value: 'instagram' },
                { label: 'TikTok', value: 'tiktok' },
                { label: 'Facebook', value: 'facebook' },
                { label: 'YouTube', value: 'youtube' },
                { label: 'X (Twitter)', value: 'x' },
                { label: 'WhatsApp', value: 'whatsapp' },
                { label: 'Spotify', value: 'spotify' },
              ],
              defaultValue: 'linkedin',
            }),
            url: text('Enlace del perfil'),
          }),
          { label: 'Redes sociales', itemLabel: (p) => p.fields.network.value }
        ),
        copyrightText: text('Footer: texto de derechos', 'Se muestra tras "© año".'),
        credit: fields.object(
          {
            text: text('Texto', undefined, 'Diseñado por'),
            linkText: text('Nombre enlazado', undefined, 'TransformAcción720'),
            url: text('Enlace', undefined, 'https://www.transformaccion720.com'),
          },
          { label: 'Footer: firma de diseño' }
        ),
      },
    }),

    diagnostic: singleton({
      label: 'Centro de Diagnóstico',
      path: 'src/content/settings/diagnostic',
      format: { data: 'json' },
      previewUrl: '/',
      schema: {
        kicker: text('Antetítulo', undefined, 'Centro de Diagnóstico TA720'),
        title: text('Título', undefined, 'Mide el impacto de transformar hoy'),
        tabHours: text('Pestaña 1', undefined, '1. Horas Perdidas en Procesos'),
        tabCosts: text('Pestaña 2', undefined, '2. Eficiencia y Ahorro en Costos'),
        currency: text('Símbolo de moneda', undefined, '$'),
        hours: fields.object(
          {
            teamLabel: text('Campo 1', undefined, 'Colaboradores en áreas clave'),
            teamDefault: fields.integer({ label: 'Valor inicial campo 1', defaultValue: 15 }),
            hoursLabel: text('Campo 2', undefined, 'Horas/semana en tareas manuales (por persona)'),
            hoursDefault: fields.integer({ label: 'Valor inicial campo 2', defaultValue: 6 }),
            rateLabel: text('Campo 3', undefined, 'Costo promedio por hora (USD)'),
            rateDefault: fields.integer({ label: 'Valor inicial campo 3', defaultValue: 18 }),
            weeks: fields.integer({ label: 'Semanas laborales al año (fórmula)', defaultValue: 48 }),
            resultHours: text('Resultado 1', undefined, 'Horas perdidas al año'),
            resultCost: text('Resultado 2', undefined, 'Impacto financiero estimado'),
          },
          { label: 'Calculadora 1: horas perdidas' }
        ),
        costs: fields.object(
          {
            revenueLabel: text('Campo 1', undefined, 'Facturación anual aprox. (USD)'),
            revenueOptions: fields.array(
              fields.object({
                label: text('Texto'),
                value: fields.integer({ label: 'Valor para el cálculo' }),
                selected: fields.checkbox({ label: 'Elegido al inicio', defaultValue: false }),
              }),
              { label: 'Opciones de facturación', itemLabel: (p) => p.fields.label.value || 'Opción' }
            ),
            frictionLabel: text('Campo 2', undefined, 'Nivel de reprocesos / demoras'),
            frictionOptions: fields.array(
              fields.object({
                label: text('Texto'),
                value: fields.number({ label: 'Porcentaje de fuga (0.11 = 11 %)', step: 0.01 }),
                selected: fields.checkbox({ label: 'Elegido al inicio', defaultValue: false }),
              }),
              { label: 'Opciones de reprocesos', itemLabel: (p) => p.fields.label.value || 'Opción' }
            ),
            hourCost: fields.integer({
              label: 'Costo hora para convertir ahorro en horas (fórmula)',
              defaultValue: 24,
            }),
            resultSavings: text('Resultado 1', undefined, 'Ahorro potencial anual'),
            resultHours: text('Resultado 2', undefined, 'Horas recuperables / mes'),
          },
          { label: 'Calculadora 2: ahorro en costos' }
        ),
        emailIntro: longText('Texto sobre el correo'),
        emailPlaceholder: text('Ejemplo de correo', undefined, 'tu.correo@empresa.com'),
        submitText: text('Botón', undefined, 'ENVIAR RESULTADOS ➡️'),
        successToast: text(
          'Aviso al enviar',
          'Variable: {correo}',
          '¡Listo! Enviamos tu diagnóstico completo a {correo}.'
        ),
        errorText: text(
          'Aviso si falla',
          undefined,
          'No pudimos enviar tu diagnóstico. Inténtalo de nuevo en unos minutos.'
        ),
      },
    }),

    blogSettings: singleton({
      label: 'Textos de Novedades',
      path: 'src/content/settings/blog',
      format: { data: 'json' },
      previewUrl: '/blog',
      schema: {
        badge: text('Antetítulo'),
        title: text('Título'),
        subtitle: longText('Texto bajo el título'),
        seoDescription: longText('Descripción para Google'),
        searchPlaceholder: text('Buscador', undefined, 'Buscar artículos...'),
        filtersTitle: text('Panel izquierdo: título de categorías', undefined, 'Categorías'),
        adsEnabled: fields.checkbox({
          label: 'Mostrar el espacio de carrusel publicitario (panel izquierdo)',
          defaultValue: true,
        }),
        adsLabel: text('Carrusel: etiqueta pequeña', undefined, 'Espacio destacado'),
        ads: fields.array(
          fields.object({
            image: imageIn('blog')(
              'Imagen de fondo (opcional)',
              'Vertical u horizontal. Vacío = fondo de color de marca.'
            ),
            imageAlt: text('Texto alternativo'),
            kicker: text('Etiqueta'),
            title: text('Título'),
            text: longText('Texto'),
            button: actionButton('Botón', 'link'),
          }),
          { label: 'Diapositivas del carrusel', itemLabel: (p) => p.fields.title.value || 'Diapositiva' }
        ),
        allLabel: text('Filtro "todas"', undefined, 'Todas'),
        featuredLabel: text('Etiqueta del destacado', undefined, '★ Destacado'),
        recentTitle: text('Título de la lista', undefined, 'Publicaciones recientes'),
        archiveTitle: text('Título del archivo paginado', undefined, 'Todas las publicaciones'),
        perPage: fields.integer({
          label: 'Publicaciones por página',
          defaultValue: 6,
          validation: { min: 3, max: 24 },
        }),
        prevText: text('Paginación: anterior', undefined, '⬅️ Anterior'),
        nextText: text('Paginación: siguiente', undefined, 'Siguiente ➡️'),
        countOne: text('Contador singular', undefined, 'artículo'),
        countMany: text('Contador plural', undefined, 'artículos'),
        emptyText: text('Sin resultados', undefined, 'No hay artículos con esos criterios todavía.'),
        readMore: text('Tarjeta: leer', undefined, 'Leer ➡️'),
        byText: text('"Por"', undefined, 'Por'),
        copyText: text('Lector: copiar enlace', undefined, 'Copiar enlace'),
        copiedToast: text('Aviso al copiar', undefined, 'Enlace del artículo copiado al portapapeles.'),
        ctaText: text('Lector: botón', undefined, 'Conversemos sobre este tema ➡️'),
        ctaService: text('Servicio que se preselecciona', undefined, 'Consulta desde Novedades'),
        openFullText: text('Lector: abrir artículo completo', undefined, 'Ver artículo completo'),
        backToList: text('Artículo: volver a la lista', undefined, 'Volver a Novedades'),
        takeawaysTitle: text('Artículo: título de puntos clave', undefined, 'Lo que aprenderás en esta nota'),
        topicsLabel: text('Artículo: etiqueta de temas', undefined, 'Temas:'),
        promoKicker: text('Recuadro lateral: antetítulo'),
        promoTitle: text('Recuadro lateral: título'),
        promoText: longText('Recuadro lateral: texto'),
        promoButton: actionButton('Recuadro lateral: botón', 'diagnosticHours'),
        relatedTitle: text('Título de otras novedades', undefined, 'Sigue leyendo'),
        authorRole: text(
          'Artículo: cargo bajo el autor',
          undefined,
          'Consultor en transformación empresarial'
        ),
        tocTitle: text('Artículo: título del índice', undefined, 'En este artículo'),
        shareTitle: text('Artículo: título de compartir', undefined, 'Compartir'),
        articleCtaTitle: text(
          'Artículo: llamado final (título)',
          undefined,
          '¿Quieres aplicarlo en tu negocio?'
        ),
        articleCtaText: text(
          'Artículo: llamado final (texto)',
          undefined,
          'Conversemos 30 minutos sobre tu caso, sin compromiso.'
        ),
        articleCtaButton: text('Artículo: llamado final (botón)', undefined, 'Agenda una llamada ➡️'),
      },
    }),

    complaintsBook: singleton({
      label: 'Libro de Reclamaciones',
      path: 'src/content/settings/complaints',
      format: { data: 'json' },
      previewUrl: '/legal/libro-de-reclamaciones',
      schema: {
        backText: text('Páginas legales: botón volver', undefined, 'Volver al inicio'),
        tabLabel: text('Nombre (pestaña y footer)', undefined, 'Libro de Reclamaciones'),
        footerKicker: text('Footer: texto pequeño', undefined, 'Virtual - Ley N° 29571 (Perú)'),
        kicker: text('Antetítulo'),
        title: text('Título'),
        notice: longText('Aviso legal visible'),
        businessName: text('Razón social', 'Nombre legal de la empresa, como figura en SUNAT.'),
        tradeName: text('Nombre comercial'),
        ruc: text('RUC'),
        address: text('Dirección fiscal'),
        reclamoDefinition: longText('Definición de "Reclamo"'),
        quejaDefinition: longText('Definición de "Queja"'),
        responseNote: longText('Nota del plazo de respuesta'),
        legalNotes: fields.array(fields.text({ label: 'Nota', multiline: true }), {
          label: 'Notas legales al pie',
          itemLabel: (p) => p.value || 'Nota',
        }),
        privacyText: longText('Casilla de aceptación de datos'),
        submitText: text('Texto del botón', undefined, 'REGISTRAR HOJA DE RECLAMACIÓN'),
        successTitle: text('Constancia: título', undefined, 'Hoja de Reclamación Registrada'),
        successText: longText('Constancia: texto', 'Variables: {numero}, {correo}'),
      },
    }),
  },
});
