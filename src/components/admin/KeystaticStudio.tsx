import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Keystatic } from '@keystatic/core/ui';
import config from '../../../keystatic.config';
import { installBranchLock } from './branchLock';
import { parseEntryPath } from './routes';
import {
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  ExternalLink,
  Columns,
  Maximize2,
  Eye,
  CheckCircle2,
  Zap,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
} from 'lucide-react';

// El panel de métricas solo se descarga cuando se abre
const MetricsDashboard = lazy(() => import('./MetricsDashboard'));

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type ViewMode = 'split' | 'editor' | 'preview' | 'metrics';

// ----------------------------------------------------
// Live preview genérico: todo se deriva de keystatic.config
// ----------------------------------------------------
type AnyField = {
  kind: string;
  label?: string;
  fields?: Record<string, AnyField>;
  element?: AnyField;
  values?: Record<string, AnyField>;
};

// La página con esta dirección es la portada: se previsualiza en "/" y no en "/inicio"
const HOME_SLUG = 'inicio';
type Schema = Record<string, AnyField>;

const normLabel = (s: string) => s.replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Recorre el schema y devuelve { etiqueta → rutas } (los ítems de listas usan "*") */
function buildLabelIndex(schema: Schema) {
  const index = new Map<string, string[]>();
  const walk = (field: AnyField, path: string) => {
    if (field.kind === 'object' && field.fields) {
      for (const [key, child] of Object.entries(field.fields)) walk(child, `${path}.${key}`);
    } else if (field.kind === 'array' && field.element) {
      walk(field.element, `${path}.*`);
    } else if (field.kind === 'conditional' && field.values) {
      // Bloques (fields.blocks): cada ítem se guarda como { discriminant, value }
      for (const value of Object.values(field.values)) walk(value, `${path}.value`);
    } else if (field.label) {
      const key = normLabel(field.label);
      index.set(key, [...(index.get(key) ?? []), path]);
    }
  };
  for (const [key, field] of Object.entries(schema)) walk(field, key);
  return index;
}

// Los tipos genéricos de Keystatic no aceptan una config concreta: se adapta una sola vez aquí
const STUDIO_CONFIG = config as unknown as Parameters<typeof Keystatic>[0]['config'];

const SINGLETONS = (config.singletons ?? {}) as Record<
  string,
  { label: string; previewUrl?: string; schema: Schema }
>;
const COLLECTIONS = (config.collections ?? {}) as Record<
  string,
  { label: string; previewUrl?: string; schema: Schema }
>;

const LABEL_INDEX = new Map<string, Map<string, string[]>>(
  [...Object.entries(SINGLETONS), ...Object.entries(COLLECTIONS)].map(([key, def]) => [
    key,
    buildLabelIndex(def.schema),
  ])
);

/** Qué entrada del CMS está abierta según la URL de Keystatic */
function currentEntry() {
  const parsed = parseEntryPath(window.location.pathname);
  if (!parsed) return null;
  const { kind, key, slug } = parsed;
  const def = kind === 'singleton' ? SINGLETONS[key] : COLLECTIONS[key];
  if (!def) return null;
  let previewUrl = def.previewUrl ?? '/';
  if (previewUrl.includes('{slug}'))
    previewUrl = slug && !(key === 'pages' && slug === HOME_SLUG) ? previewUrl.replace('{slug}', slug) : '/';
  return { key, previewUrl };
}

/** Texto de la etiqueta asociada a un campo del formulario de Keystatic */
function labelOf(input: HTMLElement) {
  const byIds = (ids: string | null) =>
    ids
      ?.split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim() ?? '';
  return (
    byIds(input.getAttribute('aria-labelledby')) ||
    (input.id && document.querySelector(`label[for="${CSS.escape(input.id)}"]`)?.textContent) ||
    input.getAttribute('aria-label') ||
    input.closest('label')?.textContent ||
    ''
  );
}

const QUICK_ROUTES = [
  { label: 'Portada completa', path: '/' },
  ...Object.values(SINGLETONS)
    .filter((s) => s.previewUrl && s.previewUrl !== '/')
    .map((s) => ({ label: s.label.replace(/^(Sección|Página):\s*/, ''), path: s.previewUrl! })),
  // Varias secciones pueden compartir la misma vista previa: una sola opción por ruta
].filter((r, i, all) => all.findIndex((o) => o.path === r.path) === i);

// Keystatic copia el tema oscuro del sistema si nadie eligió uno: el editor arranca siempre en claro.
// El botón ☼ de Keystatic sigue funcionando y su elección se respeta.
try {
  if (!localStorage.getItem('keystatic-color-scheme'))
    localStorage.setItem('keystatic-color-scheme', 'light');
} catch {
  // sin almacenamiento: Keystatic usa su modo automático
}

// En producción (Keystatic Cloud) guardar = commit en GitHub + redeploy: el cambio tarda en verse
const IS_CLOUD = Boolean(import.meta.env.PUBLIC_KEYSTATIC_CLOUD_PROJECT);

export default function KeystaticStudio() {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [liveStatusText, setLiveStatusText] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const [isDragging, setIsDragging] = useState(false);
  // Barra lateral de Keystatic (menú de secciones): se puede ocultar para ganar espacio. Se recuerda.
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    try {
      return localStorage.getItem('studio-sidebar-hidden') === '1';
    } catch {
      return false;
    }
  });
  const toggleSidebar = () =>
    setSidebarHidden((hidden) => {
      try {
        localStorage.setItem('studio-sidebar-hidden', hidden ? '0' : '1');
      } catch {
        // sin almacenamiento: solo dura la sesión
      }
      return !hidden;
    });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastDetectedPath = useRef<string>('');
  const isDraggingRef = useRef(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previewBlobRef = useRef<string | null>(null);
  const originalFetchRef = useRef<typeof fetch>(window.fetch.bind(window));

  // La vista previa sigue a la entrada que se edita (usa el previewUrl de cada sección del CMS)
  const syncPreviewWithKeystatic = useCallback(() => {
    if (typeof window === 'undefined') return;
    const target = currentEntry()?.previewUrl ?? lastDetectedPath.current ?? '/';
    if (target && target !== lastDetectedPath.current) {
      lastDetectedPath.current = target;
      setCurrentPath(target);
    }
  }, []);

  const reloadPreview = () => iframeRef.current?.contentWindow?.location.reload();

  /**
   * Tras guardar, el servidor tarda un instante en releer el contenido (y, si cambió una foto,
   * la anterior ya se borró). Se espera a que la página responda bien antes de recargar la vista previa.
   */
  const reloadPreviewWhenReady = useCallback(async () => {
    const path = iframeRef.current?.contentWindow?.location.pathname ?? '/';
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const ok = await originalFetchRef
        .current(path, { cache: 'no-store' })
        .then((r) => r.ok)
        .catch(() => false);
      if (ok) break;
    }
    iframeRef.current?.contentWindow?.location.reload();
  }, []);

  // En producción nadie trabaja con ramas: se ocultan sus controles y se fuerza `main`
  useEffect(() => (IS_CLOUD ? installBranchLock() : undefined), []);

  useEffect(() => {
    syncPreviewWithKeystatic();
    const interval = setInterval(syncPreviewWithKeystatic, 800);
    window.addEventListener('popstate', syncPreviewWithKeystatic);

    // Divisor arrastrable (Resizable drag handle)
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const ratio = (e.clientX / window.innerWidth) * 100;
      if (ratio >= 20 && ratio <= 80) {
        setSplitRatio(ratio);
      }
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Escuchar cuando Keystatic guarda cambios vía fetch a /api/keystatic
    const originalFetch = window.fetch;
    originalFetchRef.current = originalFetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
      if (url.includes('/api/keystatic') && args[1]?.method === 'POST') {
        const now = new Date().toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSavedTime(now);
        setLiveStatusText('¡Guardado! Actualizando vista previa…');
        reloadPreviewWhenReady().finally(() => setLiveStatusText(null));
      }
      return response;
    };

    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', syncPreviewWithKeystatic);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.fetch = originalFetch;
    };
  }, [syncPreviewWithKeystatic, reloadPreviewWhenReady]);

  const sendToPreview = (message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'CMS_LIVE_PREVIEW', ...message },
      window.location.origin
    );
  };

  /** Rutas data-cms candidatas para el campo que se está editando */
  const resolvePaths = (input: HTMLElement) => {
    const entry = currentEntry();
    const label = labelOf(input);
    if (!entry || !label) return null;
    const paths = LABEL_INDEX.get(entry.key)?.get(normLabel(label));
    return paths
      ? { paths: paths.map((p) => `${entry.key}.${p}`), label: label.replace(/\*/g, '').trim() }
      : null;
  };

  // Valor previo de cada campo: distingue entre ítems repetidos de una lista (FAQ, tarjetas, etc.)
  const previousValues = useRef(new WeakMap<HTMLElement, string>());

  const handleContainerFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if ('value' in target) previousValues.current.set(target, target.value);
  };

  // Escritura en tiempo real antes de guardar (Instant WYSIWYG) para cualquier sección
  const handleContainerInput = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target || target.type === 'file' || !('value' in target)) return;
    const resolved = resolvePaths(target);
    if (!resolved) return;

    sendToPreview({
      paths: resolved.paths,
      value: target instanceof HTMLInputElement && target.type === 'checkbox' ? String(target.checked) : target.value,
      prev: previousValues.current.get(target) ?? null,
    });
    previousValues.current.set(target, target.value);

    setLiveStatusText(`En vivo: "${resolved.label}"`);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setLiveStatusText(null), 2500);
  };

  const handleContainerChange = (e: React.FormEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.type !== 'file' || !target.files?.[0]) return;
    const resolved = resolvePaths(target);
    if (!resolved) return;
    // Liberar la vista previa anterior para no acumular memoria
    if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
    const blobUrl = URL.createObjectURL(target.files[0]);
    previewBlobRef.current = blobUrl;
    sendToPreview({ paths: resolved.paths, value: blobUrl, image: true });
    setLiveStatusText('Foto seleccionada (previsualizando en vivo)...');
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    reloadPreview();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getDeviceWidthClass = () => {
    switch (device) {
      case 'mobile':
        return 'w-[390px] h-[844px] rounded-3xl border-8 border-slate-700 shadow-2xl';
      case 'tablet':
        return 'w-[768px] h-[1024px] rounded-2xl border-6 border-slate-700 shadow-2xl';
      case 'desktop':
      default:
        return 'w-full h-full';
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Barra Superior del Keystatic Live Studio */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 backdrop-blur-md z-40">
        {/* Marca & Modo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-pressed={sidebarHidden}
            title={sidebarHidden ? 'Mostrar barra lateral' : 'Ocultar barra lateral'}
            className="flex size-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:text-white"
          >
            {sidebarHidden ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-teal-500 font-bold text-slate-950 text-xs shadow-sm">
              G
            </span>
            <span className="font-bold tracking-tight text-white text-sm">
              CMS <span className="text-teal-400 font-semibold">• Live Studio</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="size-3" />
            <span>Live Preview Activo</span>
          </div>
          {IS_CLOUD && (
            <span
              className="hidden items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 md:flex"
              title="Al guardar, el cambio se publica en la web en 1–2 minutos"
            >
              Al guardar, se publica en 1–2 min
            </span>
          )}

          {liveStatusText ? (
            <span className="flex items-center gap-1 text-[11.5px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md animate-pulse">
              <Zap className="size-3" />
              <span>{liveStatusText}</span>
            </span>
          ) : lastSavedTime ? (
            <span className="hidden md:inline text-[11px] text-slate-400">
              Guardado en disco: {lastSavedTime}
            </span>
          ) : null}
        </div>

        {/* Controles de Previsualización */}
        {viewMode !== 'editor' && viewMode !== 'metrics' && (
          <div className="flex items-center gap-2">
            {/* Selector de Ruta Rápida */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300">
              <Compass className="size-3.5 text-teal-400" />
              <select
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-800/90 px-2 py-1 text-xs text-white focus:border-teal-400 focus:outline-none"
              >
                {!QUICK_ROUTES.some((r) => r.path === currentPath) && (
                  <option value={currentPath}>{currentPath}</option>
                )}
                {QUICK_ROUTES.map((r) => (
                  <option key={r.path} value={r.path}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Dispositivo (Desktop, Tablet, Mobile) */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/60 p-0.5">
              <button
                type="button"
                onClick={() => setDevice('desktop')}
                title="Vista Desktop (100%)"
                className={`flex size-7 items-center justify-center rounded-md transition-colors ${
                  device === 'desktop'
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDevice('tablet')}
                title="Vista Tablet (768px)"
                className={`flex size-7 items-center justify-center rounded-md transition-colors ${
                  device === 'tablet'
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tablet className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDevice('mobile')}
                title="Vista Móvil (390px)"
                className={`flex size-7 items-center justify-center rounded-md transition-colors ${
                  device === 'mobile'
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="size-3.5" />
              </button>
            </div>

            {/* Refrescar Iframe */}
            <button
              type="button"
              onClick={handleManualRefresh}
              title="Refrescar Previsualización"
              className={`flex size-7 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:text-white ${
                isRefreshing ? 'animate-spin text-teal-400' : ''
              }`}
            >
              <RefreshCw className="size-3.5" />
            </button>

            {/* Abrir en nueva ventana */}
            <a
              href={currentPath}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir página en nueva pestaña"
              className="flex size-7 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-300 transition-colors hover:text-white"
            >
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        )}

        {/* Alternar Modo de Visualización (Dividido, Solo Editor, Solo Preview) */}
        <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/60 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            title="Modo Dividido: Editor a la izquierda + Previsualización a la derecha"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === 'split'
                ? 'bg-slate-800 text-teal-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="size-3.5" />
            <span>Dividido</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('editor')}
            title="Solo Panel de Administración Keystatic"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === 'editor'
                ? 'bg-slate-800 text-teal-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Maximize2 className="size-3.5" />
            <span className="hidden sm:inline">Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            title="Solo Previsualización Web"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === 'preview'
                ? 'bg-slate-800 text-teal-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="size-3.5" />
            <span className="hidden sm:inline">Web</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('metrics')}
            title="Métricas de visitas y de Google"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === 'metrics'
                ? 'bg-slate-800 text-teal-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="size-3.5" />
            <span className="hidden sm:inline">Métricas</span>
          </button>
        </div>
      </header>

      {/* Cuerpo Principal del Studio: Panel Dividido Siempre Activo */}
      {viewMode === 'metrics' && (
        <main className="relative flex-1 overflow-hidden">
          <Suspense fallback={<div className="h-full bg-slate-100" />}>
            <MetricsDashboard />
          </Suspense>
        </main>
      )}
      <main
        className={`relative flex flex-1 flex-row overflow-hidden bg-slate-950 ${viewMode === 'metrics' ? 'hidden' : ''}`}
      >
        {/* Panel Izquierdo: Keystatic Admin UI con captura de eventos en tiempo real */}
        {(viewMode === 'split' || viewMode === 'editor') && (
          <div
            onFocus={handleContainerFocus}
            onInput={handleContainerInput}
            onChange={handleContainerChange}
            style={{ width: viewMode === 'split' ? `${splitRatio}%` : '100%', minWidth: '320px' }}
            className="relative h-full overflow-hidden transition-all duration-75 border-r border-slate-800"
          >
            <div
              className={`h-full w-full overflow-hidden bg-[var(--kui-color-background-canvas)] [&_.kui-theme]:h-full [&_.kui-theme>div]:!h-full [&_.kui-theme]:bg-[var(--kui-color-background-canvas)]${
                sidebarHidden
                  ? ' [&_.kui-theme>div>[data-split-pane]:first-child]:!hidden [&_.kui-theme>div>[data-split-view-resize-handle]]:!hidden [&_.kui-theme>div>[data-split-pane]:last-child]:!w-full [&_.kui-theme>div>[data-split-pane]:last-child]:!flex-1'
                  : ''
              }`}
            >
              <Keystatic config={STUDIO_CONFIG} />
            </div>
          </div>
        )}

        {/* Divisor Arrastrable (Drag Handle central) */}
        {viewMode === 'split' && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              isDraggingRef.current = true;
              setIsDragging(true);
            }}
            title="Arrastrar con el mouse para ajustar ancho de paneles"
            className="group relative flex w-2.5 shrink-0 cursor-col-resize items-center justify-center bg-slate-950 border-x border-slate-800/80 hover:bg-teal-500/20 transition-colors select-none"
          >
            <div className="h-10 w-1 rounded-full bg-slate-700 group-hover:bg-teal-400 transition-colors" />
          </div>
        )}

        {/* Panel Derecho: Previsualización en Vivo de la Web (Live Preview Iframe) */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div
            style={{ width: viewMode === 'split' ? `${100 - splitRatio}%` : '100%', minWidth: '320px' }}
            className="flex h-full flex-col items-center justify-center overflow-auto bg-slate-900/80 p-2 sm:p-4 transition-all duration-75"
          >
            <div
              className={`relative flex items-center justify-center transition-all duration-300 ${getDeviceWidthClass()} bg-white shadow-2xl overflow-hidden`}
            >
              <iframe
                ref={iframeRef}
                src={currentPath}
                title="Previsualización en Vivo de la Web"
                className={`h-full w-full border-0 bg-cream ${isDragging ? 'pointer-events-none' : ''}`}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
