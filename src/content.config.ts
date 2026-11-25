import { defineCollection, type SchemaContext } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { ICON_NAMES } from './lib/block-icons';
import { TONE_NAMES } from './lib/tones';
import { ACTIONS } from './lib/actions';

// Validación del contenido que guarda el CMS (keystatic.config.ts). Si algo no cumple, el build falla.
// Keystatic guarda null en los campos vacíos: por eso casi todo es nullish + default.
// Regla: cada campo de keystatic.config.ts tiene aquí su par con el mismo nombre.

const text = z
  .string()
  .nullish()
  .transform((v) => v ?? '');

const textOr = (fallback: string) => text.transform((v) => v || fallback);

/** Enlace: tolera vacío y añade https:// a dominios escritos sin protocolo */
const link = text.transform((v) => {
  const t = v.trim();
  if (!t || /^(https?:|mailto:|tel:|\/|#|\?)/i.test(t)) return t;
  return /^[\w-]+(\.[\w-]+)+/.test(t) ? `https://${t}` : t;
});

const num = (fallback = 0) =>
  z
    .number()
    .nullish()
    .transform((v) => v ?? fallback);

const list = <T extends z.ZodType>(item: T) => z.array(item).nullish().transform((v) => v ?? []);
const strings = list(z.string().nullish().transform((v) => v ?? ''));
const bool = (fallback = false) =>
  z
    .boolean()
    .nullish()
    .transform((v) => v ?? fallback);

const button = z.object({ text, href: link }).default({ text: '', href: '' });
const icon = z.enum(ICON_NAMES).default('none');
const tone = z.enum(TONE_NAMES).default('blue');
const action = z.object({ text, action: z.enum(ACTIONS).default('link'), value: text }).default({ text: '', action: 'link', value: '' });
const actions = list(z.object({ text, action: z.enum(ACTIONS).default('link'), value: text }));
const tabs = list(z.object({ label: text, key: text }));
const filters = list(z.object({ key: text, label: text }));
const metrics = list(z.object({ value: text, label: text, tone: tone.default('navy') }));

const placement = { anchor: text, panel: text };

const common = {
  anchor: text,
  panel: text,
  background: z.enum(['light', 'muted', 'dark', 'brand']).default('light'),
};

const heading = { kicker: text, title: text, subtitle: text };

const block = <K extends string, T extends z.ZodRawShape>(discriminant: K, value: T) =>
  z.object({ discriminant: z.literal(discriminant), value: z.object(value) });

const sections = ({ image }: SchemaContext) => {
  const img = image().nullish();
  return z
    .array(
      z.discriminatedUnion('discriminant', [
        // --- Bloques TA720 ---
        block('heroVideo', {
          badge: text,
          title: text,
          text,
          primary: action,
          secondary: action,
          stats: metrics,
          video: z.object({ image: img, imageAlt: text, url: link, label: text, caption: text, modalTitle: text }),
          ...placement,
        }),
        block('valueJourney', {
          kicker: text,
          title: text,
          text,
          stepLabel: textOr('PASO'),
          steps: list(z.object({ title: text, desc: text, icon, tone })),
          ...placement,
        }),
        block('serviceCards', {
          kicker: text,
          title: text,
          linkText: text,
          linkHref: link,
          cards: list(z.object({ image: img, imageAlt: text, icon, title: text, desc: text, href: link, linkText: text })),
          ...placement,
        }),
        block('ctaBand', {
          style: z.enum(['impact', 'navy']).default('navy'),
          kicker: text,
          icon,
          title: text,
          text,
          buttons: actions,
          ...placement,
        }),
        block('trustLogos', {
          kicker: text,
          title: text,
          logos: list(z.object({ name: text, logo: img })),
          partnersKicker: text,
          partnersTitle: text,
          partnersText: text,
          partnerLabel: textOr('Partner oficial'),
          alliesLabel: textOr('Aliados estratégicos'),
          partners: list(z.object({ name: text, logo: img, note: text, type: z.enum(['partner', 'ally']).default('ally') })),
          ...placement,
        }),
        block('testimonialsCarousel', {
          kicker: text,
          title: text,
          items: list(z.object({ avatar: img, name: text, role: text, quote: text })),
          ...placement,
        }),
        block('costStrip', {
          kicker: text,
          title: text,
          source: text,
          items: list(z.object({ value: text, label: text, tone: tone.default('orange') })),
          ...placement,
        }),
        block('scrollDock', {
          startLabel: textOr('Inicio'),
          items: list(z.object({ label: text, anchor: text })),
          button: action,
        }),
        block('pageHero', { kicker: text, title: text, text, tabs, anchor: text }),
        block('founders', {
          kicker: text,
          title: text,
          body: text,
          stats: metrics,
          founders: list(
            z.object({ photo: img, role: text, tone, name: text, linkedin: link, bio: text, quote: text, chips: strings })
          ),
          ...placement,
        }),
        block('teamGrid', {
          enabled: bool(),
          kicker: text,
          title: text,
          members: list(z.object({ photo: img, name: text, role: text, tone, bio: text })),
          ...placement,
        }),
        block('methodology', {
          kicker: text,
          title: text,
          text,
          highlights: list(z.object({ symbol: text, title: text, desc: text, tone })),
          panelKicker: text,
          panelTitle: text,
          tabIkigai: textOr('Filosofía Ikigai'),
          tabPillars: textOr('Pilares TA720'),
          tabCore: textOr('Método CORE'),
          ikigai: z.object({
            top: text,
            left: text,
            right: text,
            right2: text,
            bottom: text,
            center: text,
            center2: text,
            items: list(z.object({ title: text, desc: text, tone })),
          }),
          pillars: list(z.object({ icon, title: text, tag: text, desc: text, tone })),
          phases: list(z.object({ letter: text, title: text, desc: text, foot: text, tone })),
          ...placement,
        }),
        block('caseStudies', {
          kicker: text,
          title: text,
          allLabel: textOr('Todos'),
          filters,
          videoText: textOr('▶ Ver Video'),
          cases: list(
            z.object({
              category: text,
              categoryLabel: text,
              tone: tone.default('navy'),
              image: img,
              imageAlt: text,
              videoUrl: link,
              title: text,
              desc: text,
              metrics,
            })
          ),
          ...placement,
        }),
        block('serviceDetail', {
          badge: text,
          tone: tone.default('orange'),
          title: text,
          text,
          checks: strings,
          primary: action,
          primaryStyle: z.enum(['navy', 'blue', 'teal']).default('navy'),
          secondary: action,
          image: img,
          imageAlt: text,
          videoUrl: link,
          videoTitle: text,
          about: z.object({ kicker: text, tone: tone.default('orange'), title: text, text, facts: strings }),
          includes: z.object({ kicker: text, tone: tone.default('teal'), title: text, items: strings }),
          experience: z.object({
            image: img,
            imageAlt: text,
            slides: list(z.object({ image: img, alt: text })),
            badge: text,
            badgeTone: tone.default('orange'),
            caption: text,
            kicker: text,
            title: text,
            metrics: list(z.object({ value: text, label: text, note: text, tone: tone.default('orange') })),
          }),
          ...placement,
        }),
        block('segmentTabs', { tabs, ...placement }),
        block('webPackages', {
          kicker: text,
          title: text,
          plans: list(
            z.object({
              tag: text,
              tone: tone.default('teal'),
              title: text,
              desc: text,
              features: strings,
              featured: bool(),
              ribbon: text,
              button: action,
            })
          ),
          ...placement,
        }),
        block('portfolioGrid', {
          kicker: text,
          title: text,
          allLabel: textOr('Todos'),
          filters,
          detailText: text,
          solutionLabel: text,
          resultLabel: text,
          closeText: textOr('Cerrar'),
          ctaText: text,
          ctaPrefix: text,
          projects: list(
            z.object({
              category: text,
              categoryLabel: text,
              tone,
              image: img,
              imageAlt: text,
              title: text,
              summary: text,
              modalCategory: text,
              desc: text,
              solution: text,
              result: text,
              tags: strings,
            })
          ),
          ...placement,
        }),
        block('resourceGrid', {
          kicker: text,
          title: text,
          allLabel: textOr('Todos'),
          filters,
          items: list(
            z.object({
              category: text,
              image: img,
              imageAlt: text,
              format: text,
              tone: tone.default('orange'),
              title: text,
              desc: text,
              buttonText: textOr('Descargar Gratis ↓'),
              file: text,
            })
          ),
          modal: z.object({
            kicker: text,
            intro: text,
            nameLabel: text,
            emailLabel: text,
            roleLabel: text,
            submitText: textOr('DESCARGAR AHORA ↓'),
            successToast: text,
          }),
          ...placement,
        }),
        block('programs', {
          kicker: text,
          kickerTone: tone,
          title: text,
          items: list(
            z.object({ image: img, imageAlt: text, meta: text, tone: tone.default('orange'), title: text, desc: text, button: action })
          ),
          ...placement,
        }),
        block('lmsCampus', {
          badge: text,
          title: text,
          text,
          buttonText: text,
          buttonHref: link,
          notice: text,
          image: img,
          imageAlt: text,
          ...placement,
        }),
        block('ecosystem', {
          image: img,
          imageAlt: text,
          badge: text,
          title: text,
          text,
          features: strings,
          cardLogo: text,
          cardTitle: text,
          cardSubtitle: text,
          stats: list(z.object({ value: text, label: text })),
          buttonText: text,
          buttonHref: link,
          ...placement,
        }),
        block('contactPanel', {
          title: text,
          whatsappLabel: text,
          emailLabel: text,
          addressLabel: text,
          address: text,
          note: text,
          nameLabel: text,
          namePlaceholder: text,
          companyLabel: text,
          companyPlaceholder: text,
          emailFieldLabel: text,
          emailPlaceholder: text,
          phoneLabel: text,
          phonePlaceholder: text,
          serviceLabel: text,
          services: list(z.object({ value: text, label: text })),
          messageLabel: text,
          messagePlaceholder: text,
          prefill: text,
          submitText: textOr('Enviar'),
          sendingText: textOr('Enviando…'),
          successToast: text,
          errorText: textOr('No pudimos enviar tu solicitud. Inténtalo de nuevo.'),
          ...placement,
        }),
        block('faqGrid', {
          kicker: text,
          title: text,
          items: list(z.object({ tag: text, question: text, answer: text })),
          hint: text,
          progressText: textOr('{leidas} de {total} dudas resueltas'),
          doneTitle: text,
          doneText: text,
          doneButton: action,
          ...placement,
        }),

        // --- Bloques genéricos ---
        block('hero', {
          ...heading,
          image: img,
          imageAlt: text,
          layout: z.enum(['split', 'background', 'centered']).default('split'),
          primary: button,
          secondary: button,
          ...common,
        }),
        block('textImage', {
          ...heading,
          body: text,
          bullets: strings,
          image: img,
          imageAlt: text,
          imageSide: z.enum(['right', 'left']).default('right'),
          button,
          ...common,
        }),
        block('cards', {
          ...heading,
          columns: z.enum(['2', '3', '4']).default('3'),
          items: list(z.object({ icon, image: img, title: text, desc: text, href: link })),
          ...common,
        }),
        block('gallery', { ...heading, images: list(z.object({ image: image(), alt: text, caption: text })), ...common }),
        block('stats', { ...heading, items: list(z.object({ value: text, label: text })), ...common }),
        block('testimonials', {
          ...heading,
          items: list(z.object({ quote: text, name: text, role: text, avatar: img })),
          ...common,
        }),
        block('team', { ...heading, members: list(z.object({ photo: img, name: text, role: text, bio: text })), ...common }),
        block('faq', { ...heading, items: list(z.object({ question: text, answer: text })), ...common }),
        block('logos', {
          ...heading,
          kickerIcon: icon,
          logos: list(z.object({ logo: image(), name: text, url: link })),
          ...common,
        }),
        block('video', { ...heading, url: link, ...common }),
        block('cta', { ...heading, primary: button, secondary: button, ...common }),
      ])
    )
    .default([]);
};

const pages = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/pages' }),
  schema: (ctx) => z.object({ title: z.string(), seoTitle: text, seoDescription: text, sections: sections(ctx) }),
});

const blogCategories = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/blog-categories' }),
  schema: z.object({ name: z.string(), order: num(10) }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      excerpt: z.string(),
      category: text,
      author: text,
      publishedAt: z.coerce.date(),
      featured: bool(),
      readLabel: text,
      cover: image().nullish(),
      coverAlt: text,
      keyTakeaways: strings,
      quote: text,
      tags: strings,
      draft: bool(),
    }),
});

const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    shortTitle: text,
    icon,
    kicker: text,
    heading: text,
    description: z.string(),
    updatedAt: z.coerce.date(),
    order: num(1),
  }),
});

const site = defineCollection({
  loader: glob({ pattern: 'site.json', base: './src/content/settings' }),
  schema: ({ image }) =>
    z.object({
      brandName: z.string(),
      tagline: text,
      logo: image().nullish(),
      logoLight: image().nullish(),
      siteTitle: z.string(),
      siteDescription: z.string(),
      businessType: z.enum(['ProfessionalService', 'Organization', 'LocalBusiness']).default('ProfessionalService'),
      city: text,
      country: textOr('PE'),
      address: text,
      location: text,
      phone: text,
      whatsapp: text.transform((v) => v.replace(/\D/g, '')),
      whatsappDisplay: text,
      whatsappMessage: text,
      whatsappFloat: bool(),
      whatsappTooltip: text,
      email: text,
      mail: z
        .object({
          contactTo: text,
          complaintsTo: text,
          fromName: text,
          fromEmail: text,
          autoReply: bool(),
          autoReplySubject: text,
          autoReplyMessage: text,
        })
        .default({ contactTo: '', complaintsTo: '', fromName: '', fromEmail: '', autoReply: false, autoReplySubject: '', autoReplyMessage: '' }),
      analytics: z
        .object({ gaId: text, gaPropertyId: text, searchConsoleSite: text, cookieText: text })
        .default({ gaId: '', gaPropertyId: '', searchConsoleSite: '', cookieText: '' }),
      hours: text,
      nav: list(
        z.object({
          label: z.string(),
          href: link,
          children: list(z.object({ label: text, desc: text, href: link, icon, tone, mobileLabel: text })),
          mobileHidden: bool(),
        })
      ),
      header: z
        .object({ diagnosticText: text, whatsappText: text })
        .default({ diagnosticText: '', whatsappText: '' }),
      footerText: text,
      footerNavTitle: textOr('Navegación'),
      footerContactTitle: textOr('Contacto'),
      footerBookText: text,
      social: list(
        z.object({
          network: z.enum(['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'x', 'whatsapp', 'spotify']),
          url: link,
        })
      ),
      copyrightText: text,
      credit: z.object({ text, linkText: text, url: link }).default({ text: '', linkText: '', url: '' }),
    }),
});

const option = <T extends z.ZodType>(value: T) => z.object({ label: text, value, selected: bool() });

const diagnostic = defineCollection({
  loader: glob({ pattern: 'diagnostic.json', base: './src/content/settings' }),
  schema: z.object({
    kicker: text,
    title: text,
    tabHours: text,
    tabCosts: text,
    currency: textOr('$'),
    hours: z.object({
      teamLabel: text,
      teamDefault: num(15),
      hoursLabel: text,
      hoursDefault: num(6),
      rateLabel: text,
      rateDefault: num(18),
      weeks: num(48),
      resultHours: text,
      resultCost: text,
    }),
    costs: z.object({
      revenueLabel: text,
      revenueOptions: list(option(num(0))),
      frictionLabel: text,
      frictionOptions: list(option(num(0))),
      hourCost: num(24),
      resultSavings: text,
      resultHours: text,
    }),
    emailIntro: text,
    emailPlaceholder: text,
    submitText: textOr('Enviar'),
    successToast: text,
    errorText: text,
  }),
});

const blogSettings = defineCollection({
  loader: glob({ pattern: 'blog.json', base: './src/content/settings' }),
  schema: ({ image }) => z.object({
    badge: text,
    title: textOr('Novedades'),
    subtitle: text,
    seoDescription: text,
    searchPlaceholder: text,
    filtersTitle: textOr('Categorías'),
    adsEnabled: bool(true),
    adsLabel: text,
    ads: list(z.object({ image: image().nullish(), imageAlt: text, kicker: text, title: text, text, button: action })),
    allLabel: textOr('Todas'),
    featuredLabel: text,
    recentTitle: text,
    archiveTitle: textOr('Todas las publicaciones'),
    perPage: num(6),
    prevText: textOr('⬅️ Anterior'),
    nextText: textOr('Siguiente ➡️'),
    countOne: textOr('artículo'),
    countMany: textOr('artículos'),
    emptyText: text,
    readMore: textOr('Leer ›'),
    byText: textOr('Por'),
    copyText: text,
    copiedToast: text,
    ctaText: text,
    ctaService: text,
    openFullText: text,
    backToList: text,
    takeawaysTitle: text,
    topicsLabel: text,
    promoKicker: text,
    promoTitle: text,
    promoText: text,
    promoButton: action,
    relatedTitle: text,
    authorRole: text,
    tocTitle: text,
    shareTitle: text,
    articleCtaTitle: text,
    articleCtaText: text,
    articleCtaButton: text,
  }),
});

const complaintsBook = defineCollection({
  loader: glob({ pattern: 'complaints.json', base: './src/content/settings' }),
  schema: z.object({
    backText: textOr('Volver al inicio'),
    tabLabel: textOr('Libro de Reclamaciones'),
    footerKicker: text,
    kicker: text,
    title: textOr('Libro de Reclamaciones'),
    notice: text,
    businessName: text,
    tradeName: text,
    ruc: text,
    address: text,
    reclamoDefinition: text,
    quejaDefinition: text,
    responseNote: text,
    legalNotes: strings,
    privacyText: text,
    submitText: textOr('Enviar'),
    successTitle: text,
    successText: text,
  }),
});

export const collections = {
  pages,
  blogCategories,
  posts,
  legal,
  site,
  diagnostic,
  blogSettings,
  complaintsBook,
};
