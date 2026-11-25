import { existsSync } from 'node:fs';
import path from 'node:path';

// Dev: Astro solo añade imágenes a .astro/content-assets.mjs y nunca quita las que ya no se usan.
// Si desde el CMS se reemplaza o borra una foto, ese módulo sigue importando el archivo viejo y toda
// la web da ImageNotFound hasta reiniciar. Este plugin descarta las importaciones de archivos inexistentes.
export function pruneMissingContentAssets() {
  const resolveAsset = (spec) => {
    const [file, query = ''] = spec.split('?');
    if (file.startsWith('@/')) return path.resolve('src', file.slice(2));
    if (file.startsWith('.')) {
      const importer = new URLSearchParams(query).get('importer');
      return importer ? path.resolve(path.dirname(importer), file) : null;
    }
    return path.isAbsolute(file) ? file : null;
  };
  return {
    name: 'prune-missing-content-assets',
    apply: 'serve',
    enforce: 'pre',
    // En dev la URL de una imagen no cambia al reemplazar el archivo (mismo nombre), pero Astro la
    // sirve con caché de 1 año: el navegador seguiría mostrando la foto vieja. Producción usa URLs con hash.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/_image')) {
          const setHeader = res.setHeader.bind(res);
          res.setHeader = (name, value) =>
            setHeader(name, name.toLowerCase() === 'cache-control' ? 'no-store' : value);
          const writeHead = res.writeHead.bind(res);
          res.writeHead = (status, ...rest) => {
            const headers = rest.find((arg) => arg && typeof arg === 'object');
            if (headers)
              for (const key of Object.keys(headers))
                if (key.toLowerCase() === 'cache-control') delete headers[key];
            setHeader('Cache-Control', 'no-store');
            return writeHead(status, ...rest);
          };
          setHeader('Cache-Control', 'no-store');
        }
        next();
      });

      // Al borrar o renombrar una imagen (p. ej. reordenar logos en el CMS), el módulo de Astro no cambia
      // y Vite no lo vuelve a procesar: se invalida a mano para que este filtro corra de nuevo.
      server.watcher.on('unlink', (file) => {
        if (!file.replaceAll('\\', '/').includes('/src/assets/')) return;
        for (const env of Object.values(server.environments ?? {})) {
          for (const mod of env.moduleGraph.idToModuleMap.values()) {
            if (mod.id?.replaceAll('\\', '/').includes('.astro/content-assets.mjs'))
              env.moduleGraph.invalidateModule(mod);
          }
        }
      });
    },
    transform(code, id) {
      if (!id.replaceAll('\\', '/').includes('.astro/content-assets.mjs')) return null;
      // Se reconstruye el módulo completo solo con las imágenes que existen (sin recortar texto)
      const assets = [...code.matchAll(/^import (\w+) from ("[^"]+");$/gm)].map(([, symbol, spec]) => ({
        symbol,
        spec,
      }));
      const existing = assets.filter(({ spec }) => {
        const file = resolveAsset(JSON.parse(spec));
        return !file || existsSync(file);
      });
      if (existing.length === assets.length) return null;
      return [
        ...existing.map(({ symbol, spec }) => `import ${symbol} from ${spec};`),
        `export default new Map([${existing.map(({ symbol, spec }) => `[${spec}, ${symbol}]`).join(', ')}]);`,
      ].join('\n');
    },
  };
}
