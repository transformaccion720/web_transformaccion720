import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RefreshCw,
  Users,
  UserPlus,
  MousePointerClick,
  FileText,
  Timer,
  Activity,
  MessageCircle,
  Send,
  Search,
  Eye,
  Percent,
  Trophy,
  AlertCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------
 * Panel de métricas estilo informe: datos de GA4 + Search Console
 * leídos por /api/metrics (solo usuarios del CMS). Gráficos en SVG propio.
 * ------------------------------------------------------------------ */

type Pair = { cur: number; prev: number };
type Item = { label: string; value: number };
type GaData = {
  error?: string;
  kpis: Record<string, Pair>;
  trend: { cur: number[]; prev: number[] };
  events: { cur: Record<string, number>; prev: Record<string, number> };
  channels: Item[];
  pages: (Item & { users: number })[];
  devices: Item[];
  cities: Item[];
  sources: Item[];
};
type GscRow = { label: string; clicks: number; impressions: number; position: number };
type GscTotals = { clicks: number; impressions: number; ctr: number; position: number };
type GscData = {
  error?: string;
  range: { start: string; end: string };
  totals: { cur: GscTotals; prev: GscTotals };
  queries: GscRow[];
  pages: GscRow[];
};
type Metrics = { days: number; from: string; to: string; updatedAt: string; ga: GaData; gsc: GscData };

const C = {
  canvas: '#f3f4f6',
  card: '#ffffff',
  line: '#e5e7eb',
  ink: '#0f172a',
  ink2: '#475569',
  muted: '#94a3b8',
  series: 'var(--color-brand-700, #4338ca)', // color de la marca (global.css)
  seriesSoft: 'color-mix(in srgb, var(--color-brand-700, #4338ca) 10%, transparent)',
  prev: '#94a3b8',
  good: '#15803d',
  bad: '#b91c1c',
};

const nf = new Intl.NumberFormat('es-PE');
const num = (n: number) => nf.format(Math.round(n));
const pct = (n: number) => `${(n * 100).toLocaleString('es-PE', { maximumFractionDigits: 1 })} %`;
const dur = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m ? `${m} min ${r.toString().padStart(2, '0')} s` : `${r} s`;
};

const CHANNELS: Record<string, string> = {
  Direct: 'Directo',
  'Organic Search': 'Google (orgánico)',
  'Organic Social': 'Redes sociales',
  'Paid Social': 'Redes (pagado)',
  'Paid Search': 'Google Ads',
  Referral: 'Otras webs',
  Email: 'Correo',
  'Organic Video': 'Video',
  Unassigned: 'Sin asignar',
};
const DEVICES: Record<string, string> = { desktop: 'Computadora', mobile: 'Celular', tablet: 'Tablet' };
const pageName = (p: string) => {
  if (p === '/' || p === '') return 'Inicio';
  return p.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '') || 'Inicio';
};

function readCmsToken() {
  try {
    const raw = localStorage.getItem('keystatic-cloud-access-token');
    return raw ? (JSON.parse(raw).token as string) : '';
  } catch {
    return '';
  }
}

/* ---------------------------- Piezas ---------------------------- */

function Delta({ cur, prev, invert = false }: Pair & { invert?: boolean }) {
  if (!prev && !cur) return <span className="text-[11px] text-slate-400">—</span>;
  if (!prev) return <span className="text-[11px] font-semibold text-slate-500">nuevo</span>;
  const change = (cur - prev) / prev;
  const up = change >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className="text-[11px] font-semibold tabular-nums"
      style={{ color: Math.abs(change) < 0.005 ? C.ink2 : good ? C.good : C.bad }}
      title="Frente al periodo anterior de la misma duración"
    >
      {up ? '▲' : '▼'} {Math.abs(change * 100).toLocaleString('es-PE', { maximumFractionDigits: 0 })} %
    </span>
  );
}

function Card({
  title,
  hint,
  children,
  className = '',
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border bg-white p-4 ${className}`} style={{ borderColor: C.line }}>
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold" style={{ color: C.ink }}>
          {title}
        </h3>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
      </header>
      {children}
    </section>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  pair,
  invert,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  pair: Pair;
  invert?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-white px-4 py-3" style={{ borderColor: C.line }}>
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium" style={{ color: C.ink2 }}>
        <Icon className="size-3.5" style={{ color: C.series }} />
        {label}
      </div>
      <div className="mt-1 text-[26px] font-semibold leading-tight tabular-nums" style={{ color: C.ink }}>
        {value}
      </div>
      <Delta {...pair} invert={invert} />
    </div>
  );
}

const Empty = ({ text = 'Aún sin datos en este periodo' }: { text?: string }) => (
  <p className="py-6 text-center text-[12px] text-slate-400">{text}</p>
);

/** Barras horizontales: una sola serie, valor al final */
function Bars({ items, format = num }: { items: Item[]; format?: (n: number) => string }) {
  if (!items.length) return <Empty />;
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li
          key={i.label}
          title={`${i.label}: ${format(i.value)} (${pct(i.value / (total || 1))})`}
          className="group"
        >
          <div className="mb-0.5 flex justify-between gap-3 text-[12px]">
            <span className="truncate" style={{ color: C.ink }}>
              {i.label}
            </span>
            <span className="shrink-0 tabular-nums" style={{ color: C.ink2 }}>
              {format(i.value)}
            </span>
          </div>
          <div className="h-2 rounded-full" style={{ background: C.canvas }}>
            <div
              className="h-2 rounded-full transition-[filter] group-hover:brightness-125"
              style={{ width: `${Math.max((i.value / max) * 100, 2)}%`, background: C.series }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Línea diaria: periodo actual (sólido) frente al anterior (punteado), con tooltip */
function TrendChart({ cur, prev, from }: { cur: number[]; prev: number[]; from: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { l: 34, r: 10, t: 10, b: 24 };
  const n = cur.length;
  const max = Math.max(...cur, ...prev, 4);
  const niceMax = Math.ceil(max / 4) * 4;
  const x = (i: number) => pad.l + (i / Math.max(n - 1, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / niceMax) * (H - pad.t - pad.b);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
  const dates = useMemo(
    () =>
      cur.map((_, i) => {
        const d = new Date(`${from}T12:00:00`);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [cur, from]
  );
  const fmt = (d: Date) => d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => niceMax * f);
  const labelEvery = Math.ceil(n / 7);

  const onMove = (e: React.PointerEvent) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const px = ((e.clientX - box.left) / box.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1));
    setHover(Math.min(Math.max(i, 0), n - 1));
  };

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Visitantes por día"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={C.line} strokeWidth="1" />
            <text x={pad.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill={C.muted}>
              {num(t)}
            </text>
          </g>
        ))}
        {dates.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill={C.muted}>
              {fmt(d)}
            </text>
          ) : null
        )}
        <path d={`${path(cur)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill={C.seriesSoft} />
        <path d={path(prev)} fill="none" stroke={C.prev} strokeWidth="1.5" strokeDasharray="4 4" />
        <path d={path(cur)} fill="none" stroke={C.series} strokeWidth="2" strokeLinejoin="round" />
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke={C.ink2} strokeWidth="1" />
            <circle cx={x(hover)} cy={y(cur[hover])} r="4.5" fill={C.series} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute top-1 rounded-md border bg-white px-2.5 py-1.5 text-[11.5px] shadow-md"
          style={{
            borderColor: C.line,
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > n / 2 ? '-110%' : '10%'})`,
          }}
        >
          <div className="font-semibold" style={{ color: C.ink }}>
            {fmt(dates[hover])}
          </div>
          <div style={{ color: C.ink2 }}>
            Visitantes: <b style={{ color: C.ink }}>{num(cur[hover])}</b>
          </div>
          <div style={{ color: C.ink2 }}>Periodo anterior: {num(prev[hover] ?? 0)}</div>
        </div>
      )}
      <div className="mt-1 flex gap-4 text-[11px]" style={{ color: C.ink2 }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: C.series }} /> Este periodo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: C.prev }} /> Periodo
          anterior
        </span>
      </div>
    </div>
  );
}

/* ---------------------------- Panel ---------------------------- */

const RANGES = [
  { days: 7, label: '7 días' },
  { days: 28, label: '28 días' },
  { days: 90, label: '90 días' },
];

// Eventos que envía la web (CookieConsent.astro, Contact.astro, PackBuilder.astro). Para medir uno nuevo:
// track('nombre') en la web + agregarlo aquí y en TRACKED_EVENTS de /api/metrics.
const CONTACT_EVENTS = [
  { key: 'clic_whatsapp', label: 'Clics en WhatsApp', icon: MessageCircle },
  { key: 'formulario_enviado', label: 'Formularios enviados', icon: Send },
];
const CONTENT_EVENTS: typeof CONTACT_EVENTS = [];

export default function MetricsDashboard() {
  const [days, setDays] = useState(() => {
    try {
      return Number(localStorage.getItem('metrics-days')) || 28;
    } catch {
      return 28;
    }
  });
  const [data, setData] = useState<Metrics | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'unauthorized' | 'not_configured' | 'no_ids' | 'error'>(
    'loading'
  );
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (d: number, refresh = false) => {
    setRefreshing(true);
    try {
      const token = readCmsToken();
      const res = await fetch(`/api/metrics?days=${d}${refresh ? '&refresh=1' : ''}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) return setState('unauthorized');
      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        return setState(body.error === 'NO_IDS' ? 'no_ids' : 'not_configured');
      }
      if (!res.ok) return setState('error');
      setData(await res.json());
      setState('ok');
    } catch {
      setState('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(days);
    try {
      localStorage.setItem('metrics-days', String(days));
    } catch {
      // sin almacenamiento: solo dura la sesión
    }
  }, [days, load]);

  const ga = data?.ga;
  const gsc = data?.gsc;
  const k = ga?.kpis;
  const ev = (key: string): Pair => ({ cur: ga?.events?.cur[key] ?? 0, prev: ga?.events?.prev[key] ?? 0 });
  const updated = data
    ? new Date(data.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    : '';
  const dateRange = data
    ? `${new Date(`${data.from}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} – ${new Date(`${data.to}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';

  return (
    <div className="h-full overflow-y-auto font-sans" style={{ background: C.canvas, color: C.ink }}>
      {/* Barra de filtros */}
      <div
        className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-white/95 px-5 py-3 backdrop-blur"
        style={{ borderColor: C.line }}
      >
        <div>
          <h2 className="text-[17px] font-semibold">Métricas de la web</h2>
          <p className="text-[11.5px]" style={{ color: C.ink2 }}>
            {dateRange ? `${dateRange} · actualizado ${updated}` : 'Google Analytics y Search Console'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5" style={{ borderColor: C.line }} role="group">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                aria-pressed={days === r.days}
                className="rounded px-3 py-1 text-[12px] font-medium transition-colors"
                style={
                  days === r.days ? { background: C.series, color: '#fff' } : { color: C.ink2 }
                }
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => load(days, true)}
            title="Traer datos nuevos de Google"
            className="flex size-8 items-center justify-center rounded-md border transition-colors hover:bg-slate-50"
            style={{ borderColor: C.line, color: C.ink2 }}
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {state !== 'ok' && state !== 'loading' && (
        <div className="m-5 flex items-start gap-3 rounded-lg border bg-white p-4 text-[13px]" style={{ borderColor: C.line }}>
          <AlertCircle className="mt-0.5 size-4 shrink-0" style={{ color: C.bad }} />
          <p>
            {state === 'unauthorized' &&
              'Tu sesión del CMS venció. Vuelve a iniciar sesión en el editor y abre de nuevo Métricas.'}
            {state === 'not_configured' &&
              'Falta la llave del robot de Google en Vercel (GOOGLE_SERVICE_ACCOUNT_JSON). Ver README → Métricas.'}
            {state === 'no_ids' &&
              'Completa los IDs en Configuración general → Analítica y cookies (propiedad de Analytics y web de Search Console).'}
            {state === 'error' && 'No se pudo conectar con Google. Inténtalo de nuevo en unos minutos.'}
          </p>
        </div>
      )}

      {state === 'loading' && !data && (
        <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[92px] animate-pulse rounded-lg bg-white" />
          ))}
        </div>
      )}

      {data && (
        <div className={`space-y-4 p-5 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
          {/* ---------- Visitas ---------- */}
          {ga?.error ? (
            <Card title="Google Analytics">
              <Empty text={`No se pudo leer Analytics: ${ga.error}`} />
            </Card>
          ) : (
            k && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <Kpi icon={Users} label="Visitantes" value={num(k.activeUsers.cur)} pair={k.activeUsers} />
                  <Kpi icon={UserPlus} label="Nuevos" value={num(k.newUsers.cur)} pair={k.newUsers} />
                  <Kpi icon={MousePointerClick} label="Visitas (sesiones)" value={num(k.sessions.cur)} pair={k.sessions} />
                  <Kpi icon={FileText} label="Páginas vistas" value={num(k.screenPageViews.cur)} pair={k.screenPageViews} />
                  <Kpi icon={Activity} label="Interés real" value={pct(k.engagementRate.cur)} pair={k.engagementRate} />
                  <Kpi icon={Timer} label="Tiempo por visita" value={dur(k.averageSessionDuration.cur)} pair={k.averageSessionDuration} />
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <Card title="Visitantes por día" hint="Pasa el mouse para ver cada día" className="xl:col-span-2">
                    <TrendChart cur={ga.trend.cur} prev={ga.trend.prev} from={data.from} />
                  </Card>
                  <Card title="Posibles clientes" hint="Acciones de contacto">
                    <ul className="divide-y" style={{ borderColor: C.line }}>
                      {[...CONTACT_EVENTS, ...CONTENT_EVENTS].map(({ key, label, icon: Icon }, i) => (
                        <li
                          key={key}
                          className={`flex items-center justify-between py-2.5 ${i === CONTACT_EVENTS.length ? 'border-t-2' : ''}`}
                          style={{ borderColor: C.line }}
                        >
                          <span className="flex items-center gap-2 text-[12.5px]" style={{ color: C.ink2 }}>
                            <Icon className="size-4" style={{ color: C.series }} />
                            {label}
                          </span>
                          <span className="flex items-baseline gap-2">
                            <b className="text-[16px] tabular-nums">{num(ev(key).cur)}</b>
                            <Delta {...ev(key)} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Card title="¿De dónde llegan?" hint="Visitas por canal">
                    <Bars items={ga.channels.map((c) => ({ ...c, label: CHANNELS[c.label] ?? c.label }))} />
                  </Card>
                  <Card title="Sitios de origen" hint="Visitas por fuente">
                    <Bars
                      items={ga.sources.map((s) => ({
                        ...s,
                        label: s.label === '(direct)' ? 'Directo (escriben la web)' : s.label,
                      }))}
                    />
                  </Card>
                  <Card title="Páginas más vistas" hint="Vistas">
                    <Bars items={ga.pages.map((p) => ({ ...p, label: pageName(p.label) }))} />
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card title="Ciudades" hint="Visitantes">
                    <Bars items={ga.cities} />
                  </Card>
                  <Card title="Dispositivos" hint="Visitantes">
                    <Bars items={ga.devices.map((d) => ({ ...d, label: DEVICES[d.label] ?? d.label }))} />
                  </Card>
                </div>
              </>
            )
          )}

          {/* ---------- Google (Search Console) ---------- */}
          <h3 className="flex items-center gap-2 pt-2 text-[14px] font-semibold">
            <Search className="size-4" style={{ color: C.series }} />
            Cómo te encuentran en Google
            {gsc?.range && (
              <span className="text-[11px] font-normal" style={{ color: C.muted }}>
                (Google publica estos datos con ~2 días de retraso)
              </span>
            )}
          </h3>
          {gsc?.error ? (
            <Card title="Search Console">
              <Empty text={`No se pudo leer Search Console: ${gsc.error}`} />
            </Card>
          ) : (
            gsc?.totals && (
              <>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <Kpi icon={MousePointerClick} label="Clics desde Google" value={num(gsc.totals.cur.clicks)} pair={{ cur: gsc.totals.cur.clicks, prev: gsc.totals.prev.clicks }} />
                  <Kpi icon={Eye} label="Veces que apareciste" value={num(gsc.totals.cur.impressions)} pair={{ cur: gsc.totals.cur.impressions, prev: gsc.totals.prev.impressions }} />
                  <Kpi icon={Percent} label="% que hizo clic" value={pct(gsc.totals.cur.ctr)} pair={{ cur: gsc.totals.cur.ctr, prev: gsc.totals.prev.ctr }} />
                  <Kpi
                    icon={Trophy}
                    label="Posición media"
                    value={gsc.totals.cur.position ? gsc.totals.cur.position.toLocaleString('es-PE', { maximumFractionDigits: 1 }) : '—'}
                    pair={{ cur: gsc.totals.cur.position, prev: gsc.totals.prev.position }}
                    invert
                  />
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card title="Qué buscan para encontrarte" hint="Top 10 búsquedas">
                    <SearchTable rows={gsc.queries} first="Búsqueda" />
                  </Card>
                  <Card title="Tus páginas en Google" hint="Top 8">
                    <SearchTable rows={gsc.pages.map((p) => ({ ...p, label: pageName(p.label) }))} first="Página" />
                  </Card>
                </div>
              </>
            )
          )}

          <p className="pb-4 text-center text-[11px]" style={{ color: C.muted }}>
            Analytics solo cuenta a quienes aceptan cookies. Las flechas comparan con el periodo anterior de la
            misma duración.
          </p>
        </div>
      )}
    </div>
  );
}

function SearchTable({ rows, first }: { rows: GscRow[]; first: string }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b text-left" style={{ borderColor: C.line, color: C.muted }}>
            <th className="py-1.5 font-medium">{first}</th>
            <th className="py-1.5 text-right font-medium">Clics</th>
            <th className="py-1.5 text-right font-medium">Apariciones</th>
            <th className="py-1.5 text-right font-medium">Posición</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b last:border-0 hover:bg-slate-50" style={{ borderColor: C.line }}>
              <td className="max-w-[260px] truncate py-1.5" title={r.label}>
                {r.label}
              </td>
              <td className="py-1.5 text-right tabular-nums">{num(r.clicks)}</td>
              <td className="py-1.5 text-right tabular-nums" style={{ color: C.ink2 }}>
                {num(r.impressions)}
              </td>
              <td className="py-1.5 text-right tabular-nums" style={{ color: C.ink2 }}>
                {r.position.toLocaleString('es-PE', { maximumFractionDigits: 1 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
