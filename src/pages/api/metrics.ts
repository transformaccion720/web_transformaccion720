import type { APIRoute } from 'astro';
import { googleApi, googleToken } from '@/lib/google';
import { getSite } from '@/lib/content';

export const prerender = false;

const CLOUD_PROJECT = import.meta.env.PUBLIC_KEYSTATIC_CLOUD_PROJECT as string | undefined;
/** Eventos de la web que cuentan como interés de un posible cliente */
export const TRACKED_EVENTS = ['clic_whatsapp', 'formulario_enviado'];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
  });

// ------------------------------------------------------------------
// Solo quien inició sesión en el CMS (Keystatic Cloud) puede ver métricas
// ------------------------------------------------------------------
const verified = new Map<string, number>();

async function isCmsUser(request: Request) {
  if (import.meta.env.DEV) return true; // en local no hay inicio de sesión
  if (!CLOUD_PROJECT) return false;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  if ((verified.get(token) ?? 0) > Date.now()) return true;
  const res = await fetch('https://api.keystatic.cloud/v1/info', {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!res?.ok) return false;
  const info = await res.json().catch(() => null);
  const ok = info?.project?.name === CLOUD_PROJECT.split('/').pop();
  if (ok) {
    // Caché corta y acotada (un acceso revocado deja de valer en máx. 5 minutos)
    if (verified.size > 200) verified.clear();
    verified.set(token, Date.now() + 5 * 60_000);
  }
  return ok;
}

// ------------------------------------------------------------------
// Utilidades de fechas y formato de las respuestas de Google
// ------------------------------------------------------------------
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

type GaReport = {
  rows?: { dimensionValues?: { value: string }[]; metricValues: { value: string }[] }[];
};
const rows = (r: GaReport) =>
  (r.rows ?? []).map((row) => ({
    dims: (row.dimensionValues ?? []).map((d) => d.value),
    vals: row.metricValues.map((m) => Number(m.value)),
  }));

const KPI_METRICS = [
  'activeUsers',
  'newUsers',
  'sessions',
  'screenPageViews',
  'engagementRate',
  'averageSessionDuration',
];

async function analytics(token: string, days: number, property: string) {
  const cur = { startDate: `${days - 1}daysAgo`, endDate: 'today', name: 'cur' };
  const prev = { startDate: `${days * 2 - 1}daysAgo`, endDate: `${days}daysAgo`, name: 'prev' };
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${property}:batchRunReports`;
  const metric = (name: string) => ({ name });
  const top = (dimension: string, m: string, limit: number) => ({
    dateRanges: [cur],
    dimensions: [{ name: dimension }],
    metrics: [metric(m)],
    orderBys: [{ metric: { metricName: m }, desc: true }],
    limit,
  });

  const [a, b] = await Promise.all([
    googleApi<{ reports: GaReport[] }>(token, url, {
      requests: [
        { dateRanges: [cur, prev], metrics: KPI_METRICS.map(metric) },
        {
          dateRanges: [cur, prev],
          dimensions: [{ name: 'nthDay' }],
          metrics: [metric('activeUsers')],
          orderBys: [{ dimension: { dimensionName: 'nthDay' } }],
          limit: 1000,
        },
        top('sessionDefaultChannelGroup', 'sessions', 8),
        {
          dateRanges: [cur],
          dimensions: [{ name: 'pagePath' }],
          metrics: [metric('screenPageViews'), metric('activeUsers')],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        },
        {
          dateRanges: [cur, prev],
          dimensions: [{ name: 'eventName' }],
          metrics: [metric('eventCount')],
          dimensionFilter: {
            filter: { fieldName: 'eventName', inListFilter: { values: TRACKED_EVENTS } },
          },
        },
      ],
    }),
    googleApi<{ reports: GaReport[] }>(token, url, {
      requests: [
        top('deviceCategory', 'activeUsers', 4),
        top('city', 'activeUsers', 8),
        top('sessionSource', 'sessions', 8),
      ],
    }),
  ]);
  const [kpi, trend, channels, pages, events] = a.reports as GaReport[];
  const [devices, cities, sources] = b.reports as GaReport[];

  // Con dos periodos, Google añade la dimensión "dateRange" al final de cada fila
  const byRange = (report: GaReport) => {
    const out: Record<string, { dims: string[]; vals: number[] }[]> = { cur: [], prev: [] };
    for (const r of rows(report)) out[r.dims.at(-1) === 'prev' ? 'prev' : 'cur'].push(r);
    return out;
  };
  const k = byRange(kpi);
  const kpis = Object.fromEntries(
    KPI_METRICS.map((m, i) => [m, { cur: k.cur[0]?.vals[i] ?? 0, prev: k.prev[0]?.vals[i] ?? 0 }])
  );
  const t = byRange(trend);
  const series = (list: { dims: string[]; vals: number[] }[]) => {
    const arr = Array(days).fill(0);
    for (const r of list) {
      const n = Number(r.dims[0]);
      if (n >= 0 && n < days) arr[n] = r.vals[0];
    }
    return arr;
  };
  const e = byRange(events);
  const eventCount = (list: { dims: string[]; vals: number[] }[]) =>
    Object.fromEntries(TRACKED_EVENTS.map((n) => [n, list.find((r) => r.dims[0] === n)?.vals[0] ?? 0]));
  const list = (r: GaReport) => rows(r).map((x) => ({ label: x.dims[0], value: x.vals[0] }));

  return {
    kpis,
    trend: { cur: series(t.cur), prev: series(t.prev) },
    events: { cur: eventCount(e.cur), prev: eventCount(e.prev) },
    channels: list(channels),
    pages: rows(pages).map((x) => ({ label: x.dims[0], value: x.vals[0], users: x.vals[1] })),
    devices: list(devices),
    cities: list(cities).filter((c) => c.label !== '(not set)'),
    sources: list(sources),
  };
}

async function searchConsole(token: string, days: number, site: string) {
  // Search Console publica sus datos con unos 2 días de retraso
  const end = daysAgo(2);
  const start = daysAgo(days + 1);
  const pEnd = daysAgo(days + 2);
  const pStart = daysAgo(days * 2 + 1);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const q = (s: Date, e: Date, dimensions: string[], rowLimit = 10) =>
    googleApi<{ rows?: Row[] }>(token, url, { startDate: iso(s), endDate: iso(e), dimensions, rowLimit });
  const [tot, prevTot, queries, pages] = await Promise.all([
    q(start, end, []),
    q(pStart, pEnd, []),
    q(start, end, ['query'], 10),
    q(start, end, ['page'], 8),
  ]);
  type Row = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };
  const sum = (r: { rows?: Row[] }) => {
    const row = r.rows?.[0];
    return {
      clicks: row?.clicks ?? 0,
      impressions: row?.impressions ?? 0,
      ctr: row?.ctr ?? 0,
      position: row?.position ?? 0,
    };
  };
  const list = (r: { rows?: Row[] }) =>
    (r.rows ?? []).map((x) => ({
      label: x.keys?.[0] ?? '',
      clicks: x.clicks,
      impressions: x.impressions,
      position: x.position,
    }));
  return {
    range: { start: iso(start), end: iso(end) },
    totals: { cur: sum(tot), prev: sum(prevTot) },
    queries: list(queries),
    pages: list(pages),
  };
}

// Las cifras de Google cambian poco: se guardan 10 minutos para que el panel abra al instante
const cache = new Map<number, { at: number; data: unknown }>();

export const GET: APIRoute = async ({ request, url }) => {
  if (!(await isCmsUser(request))) return json({ error: 'UNAUTHORIZED' }, 401);

  const days = [7, 28, 90].includes(Number(url.searchParams.get('days')))
    ? Number(url.searchParams.get('days'))
    : 28;
  const fresh = url.searchParams.get('refresh') === '1';
  const hit = cache.get(days);
  if (hit && !fresh && Date.now() - hit.at < 10 * 60_000) return json(hit.data);

  // IDs desde el CMS (Configuración general → Analítica y cookies); la llave, desde Vercel
  const { analytics: ids } = await getSite();
  const property = ids.gaPropertyId.replace(/[^0-9]/g, '');
  const site = ids.searchConsoleSite.trim();
  if (!property && !site) return json({ error: 'NO_IDS' }, 503);
  const token = await googleToken();
  if (!token) return json({ error: 'NOT_CONFIGURED' }, 503);

  const skip = (what: string) => Promise.reject(new Error(`Falta ${what} en el CMS`));
  const [ga, gsc] = await Promise.allSettled([
    property ? analytics(token, days, property) : skip('el ID de propiedad de Analytics'),
    site ? searchConsole(token, days, site) : skip('la web de Search Console'),
  ]);
  const data = {
    days,
    from: iso(daysAgo(days - 1)),
    to: iso(new Date()),
    updatedAt: new Date().toISOString(),
    ga: ga.status === 'fulfilled' ? ga.value : { error: String(ga.reason?.message ?? ga.reason) },
    gsc: gsc.status === 'fulfilled' ? gsc.value : { error: String(gsc.reason?.message ?? gsc.reason) },
  };
  if (ga.status === 'fulfilled' || gsc.status === 'fulfilled') cache.set(days, { at: Date.now(), data });
  return json(data);
};
