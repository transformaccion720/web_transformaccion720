import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { pruneMissingContentAssets } from './tools/prune-content-assets.mjs';
import { mkdirSync, writeFileSync, promises as fsp } from 'node:fs';

// Windows: al guardar desde el CMS, Astro reescribe .astro/*.mjs con un rename atómico que falla con
// EPERM/EBUSY si el antivirus o el watcher tienen el archivo abierto un instante, y el servidor dev
// queda roto. Se reintenta el rename como hace graceful-fs.
if (process.platform === 'win32' && !fsp.rename.__retry) {
  const rename = fsp.rename.bind(fsp);
  fsp.rename = Object.assign(
    async (from, to) => {
      for (let attempt = 0; ; attempt++) {
        try {
          return await rename(from, to);
        } catch (err) {
          if (!['EPERM', 'EACCES', 'EBUSY'].includes(err.code) || attempt >= 20) throw err;
          await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
        }
      }
    },
    { __retry: true }
  );
}

// Integración a medida de Keystatic para montar el Live Studio sin colisiones de rutas
function keystaticStudioIntegration() {
  return {
    name: 'keystatic-live-studio',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig, config }) => {
        updateConfig({
          server: config.server?.host ? {} : { host: '127.0.0.1' },
          vite: {
            plugins: [
              {
                name: 'keystatic-virtual',
                resolveId(id) {
                  if (id === 'virtual:keystatic-config') {
                    return this.resolve('./keystatic.config', './a');
                  }
                  return null;
                },
              },
            ],
            optimizeDeps: {
              entries: ['keystatic.config.*', '.astro/keystatic-imports.js'],
            },
          },
        });

        const dotAstroDir = new URL('./.astro/', config.root);
        mkdirSync(dotAstroDir, { recursive: true });
        writeFileSync(
          new URL('keystatic-imports.js', dotAstroDir),
          `import "@keystatic/astro/ui";
import "@keystatic/astro/api";
import "@keystatic/core/ui";
`
        );

        // Inyectar el endpoint API para guardar y leer contenido
        injectRoute({
          entrypoint: '@keystatic/astro/internal/keystatic-api.js',
          pattern: '/api/keystatic/[...params]',
          prerender: false,
        });
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  // Dominio canónico (sitemap, robots.txt, canonical, Open Graph y Schema).
  // Orden: PUBLIC_SITE_URL (dominio propio) > URL de producción que Vercel entrega sola > dominio provisional.
  site:
    process.env.PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '') ||
    'https://example.com',
  output: 'static', // Páginas SSG estáticas por defecto
  // Vercel: las páginas son estáticas; solo /api/contact y el CMS (/keystatic) corren como funciones
  adapter: vercel(),
  devToolbar: { enabled: false },
  // CSS chico en línea; la hoja principal va en un archivo con caché de 1 año (se reutiliza entre páginas)
  // CSS de la web (~130 KB) en un archivo aparte con caché de 1 año: se descarga una vez y sirve para todas las páginas
  build: { inlineStylesheets: 'auto' },
  // La portada vive en /: la vista previa del CMS abre /inicio
  redirects: { '/inicio': '/' },
  integrations: [
    react(),
    keystaticStudioIntegration(),
    sitemap({
      filter: (page) => !page.includes('/keystatic'), // Excluir el CMS del sitemap público
    }),
  ],
  vite: {
    plugins: [tailwindcss(), pruneMissingContentAssets()],
    // Caché propia para `astro dev`: un build o test en paralelo no la reescribe (evita CMS en negro)
    cacheDir: process.argv.includes('dev') ? 'node_modules/.vite-dev' : undefined,
    // Pre-empaquetar al arrancar: evita el "504 Outdated Optimize Dep" que deja el CMS en blanco
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        '@keystatic/core',
        '@keystatic/core/ui',
        'lucide-react',
      ],
    },
  },
});
