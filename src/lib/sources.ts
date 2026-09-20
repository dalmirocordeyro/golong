// Una función por fuente. Cada una devuelve datos ya normalizados.
import { fetchJSON } from './upstream';
import { DOLLARS } from './dollars';
import { ETF_INFO } from '../content/names';
import { LETRAS, LETRA_INFO } from '../content/letras';
import { arDateKey } from './format';
import { compactHistory, lastBefore } from './series';
import { COINGECKO_URL, normalizeCrypto, type CgRow } from './sources-client';
import type { Bond, Crypto, Dollar, DollarSlug, FxRate, Inflacion, Letra, PlazoFijo, Point, Quote, Riesgo } from './types';

// ── DolarApi.com + ArgentinaDatos (historial) ───────────────

interface DolarApiItem { casa: string; nombre: string; compra: number | null; venta: number; fechaActualizacion: string; moneda?: string }
interface AdDollar { casa: string; compra: number | null; venta: number; fecha: string }

export async function fetchDollarQuotes(): Promise<DolarApiItem[]> {
  return fetchJSON<DolarApiItem[]>('https://dolarapi.com/v1/dolares');
}

export async function fetchFx(): Promise<FxRate[]> {
  const rows = await fetchJSON<DolarApiItem[]>('https://dolarapi.com/v1/cotizaciones');
  return rows
    .filter((r) => r.moneda && r.moneda !== 'USD')
    .map((r) => ({ moneda: r.moneda!, nombre: r.nombre, compra: r.compra ?? r.venta, venta: r.venta, fecha: r.fechaActualizacion }));
}

export async function fetchDollarHistories(): Promise<Record<string, Point[]>> {
  const out: Record<string, Point[]> = {};
  await Promise.all(
    DOLLARS.map(async (d) => {
      const rows = await fetchJSON<AdDollar[]>(`https://api.argentinadatos.com/v1/cotizaciones/dolares/${d.casa}`);
      out[d.casa] = rows.filter((r) => r.venta > 0).map((r) => [r.fecha, r.venta] as Point);
    }),
  );
  return out;
}

export function buildDollars(quotes: DolarApiItem[], histories: Record<string, Point[]>): Record<DollarSlug, Dollar> {
  const out = {} as Record<DollarSlug, Dollar>;
  for (const meta of DOLLARS) {
    const q = quotes.find((x) => x.casa === meta.casa);
    const full = histories[meta.casa] ?? [];
    if (!q && !full.length) throw new Error(`Sin datos para ${meta.slug}`);
    const venta = q?.venta ?? full[full.length - 1][1];
    const fecha = q?.fechaActualizacion ?? full[full.length - 1][0] + 'T20:00:00.000Z';
    const prevP = lastBefore(full, arDateKey(new Date(fecha)));
    // Historial: reemplaza/añade el valor actual en la fecha de hoy para que el gráfico termine en el último precio.
    const today = arDateKey(new Date(fecha));
    const hist = full.filter((p) => p[0] < today);
    hist.push([today, venta]);
    out[meta.slug] = {
      slug: meta.slug,
      casa: meta.casa,
      nombre: meta.nombre,
      nombreCorto: meta.nombreCorto,
      compra: q?.compra ?? null,
      venta,
      fecha,
      prev: prevP?.[1] ?? null,
      prevFecha: prevP?.[0] ?? null,
      varPct: prevP ? (venta / prevP[1] - 1) * 100 : null,
      history: compactHistory(hist, 400, 6),
    };
  }
  return out;
}

// ── ArgentinaDatos: riesgo país, inflación, plazo fijo ──────

export async function fetchRiesgo(): Promise<Riesgo> {
  const [rows, ultimo] = await Promise.all([
    fetchJSON<{ valor: number; fecha: string }[]>('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais'),
    fetchJSON<{ valor: number; fecha: string }>('https://api.argentinadatos.com/v1/finanzas/indices/riesgo-pais/ultimo').catch(() => null),
  ]);
  const pts: Point[] = rows.map((r) => [r.fecha, r.valor]);
  const last = ultimo ?? rows[rows.length - 1];
  if (pts.length && pts[pts.length - 1][0] < last.fecha) pts.push([last.fecha, last.valor]);
  const prev = lastBefore(pts, last.fecha);
  return {
    valor: last.valor,
    fecha: last.fecha,
    prev: prev?.[1] ?? null,
    prevFecha: prev?.[0] ?? null,
    varPts: prev ? last.valor - prev[1] : null,
    history: compactHistory(pts, 400, 30),
  };
}

export async function fetchInflacion(): Promise<Inflacion> {
  const [m, ia] = await Promise.all([
    fetchJSON<{ fecha: string; valor: number }[]>('https://api.argentinadatos.com/v1/finanzas/indices/inflacion'),
    fetchJSON<{ fecha: string; valor: number }[]>('https://api.argentinadatos.com/v1/finanzas/indices/inflacionInteranual'),
  ]);
  const mensual: Point[] = m.slice(-120).map((r) => [r.fecha, r.valor]);
  const interanual: Point[] = ia.slice(-120).map((r) => [r.fecha, r.valor]);
  const ultimo = mensual[mensual.length - 1];
  const year = ultimo[0].slice(0, 4);
  const thisYear = mensual.filter((p) => p[0].startsWith(year));
  const acumuladoAnio = (thisYear.reduce((acc, p) => acc * (1 + p[1] / 100), 1) - 1) * 100;
  return {
    mensual,
    interanual,
    ultimo,
    ultimoInteranual: interanual[interanual.length - 1],
    acumuladoAnio,
    mesesAcumulados: thisYear.length,
  };
}

interface AdPlazoFijo { entidad: string; tnaClientes: number; tnaNoClientes: number; enlace: string | null }
export async function fetchPlazoFijo(): Promise<PlazoFijo[]> {
  const rows = await fetchJSON<AdPlazoFijo[]>('https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo');
  return rows
    .filter((r) => r.tnaClientes > 0)
    .map((r) => ({
      entidad: prettyBank(r.entidad),
      tna: r.tnaClientes,
      tnaNoClientes: r.tnaNoClientes > 0 ? r.tnaNoClientes : null,
      enlace: r.enlace?.trim() || null,
    }))
    .sort((a, b) => b.tna - a.tna);
}

function prettyBank(s: string): string {
  const special: Record<string, string> = {
    'BANCO DE LA NACION ARGENTINA': 'Banco Nación',
    'BANCO DE GALICIA Y BUENOS AIRES S.A.': 'Banco Galicia',
    'BANCO BBVA ARGENTINA S.A.': 'BBVA',
    'BANCO SANTANDER ARGENTINA S.A.': 'Santander',
    'BANCO DE LA PROVINCIA DE BUENOS AIRES': 'Banco Provincia',
    'BANCO DE LA CIUDAD DE BUENOS AIRES': 'Banco Ciudad',
    'INDUSTRIAL AND COMMERCIAL BANK OF CHINA (ARGENTINA) S.A.U.': 'ICBC',
    'BANCO DE LA PROVINCIA DE CORDOBA S.A.': 'Bancor',
    UALA: 'Ualá',
  };
  if (special[s]) return special[s];
  if (s !== s.toUpperCase()) return s;
  return s
    .toLowerCase()
    .replace(/\s*(sociedad anonima|s\.\s?a\.?(\s?u\.?)?)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/\b(De|Del|La|Y)\b/g, (w) => w.toLowerCase())
    .replace(/\bCmf\b/, 'CMF')
    .replace(/\bBica\b/, 'BICA')
    .replace(/\bVoii\b/, 'VOII')
    .replace(/\bReba\b/, 'Reba');
}

// ── data912: acciones, bonos, CEDEARs, ADRs ────────────────

interface D912 { symbol: string; px_bid: number; px_ask: number; v: number; c: number; pct_change: number }

export const PANEL_LIDER = ['ALUA', 'BBAR', 'BMA', 'BYMA', 'CEPU', 'COME', 'CRES', 'EDN', 'GGAL', 'IRSA', 'LOMA', 'METR', 'PAMP', 'SUPV', 'TECO2', 'TGNO4', 'TGSU2', 'TRAN', 'TXAR', 'VALO', 'YPFD'];

const SOBERANOS: { symbol: string; nombre: string; ley: 'NY' | 'AR' }[] = [
  { symbol: 'AL29', nombre: 'Bonar 2029', ley: 'AR' },
  { symbol: 'AL30', nombre: 'Bonar 2030', ley: 'AR' },
  { symbol: 'AL35', nombre: 'Bonar 2035', ley: 'AR' },
  { symbol: 'AE38', nombre: 'Bonar 2038', ley: 'AR' },
  { symbol: 'AL41', nombre: 'Bonar 2041', ley: 'AR' },
  { symbol: 'GD29', nombre: 'Global 2029', ley: 'NY' },
  { symbol: 'GD30', nombre: 'Global 2030', ley: 'NY' },
  { symbol: 'GD35', nombre: 'Global 2035', ley: 'NY' },
  { symbol: 'GD38', nombre: 'Global 2038', ley: 'NY' },
  { symbol: 'GD41', nombre: 'Global 2041', ley: 'NY' },
  { symbol: 'GD46', nombre: 'Global 2046', ley: 'NY' },
];

const PESOS: Record<string, string> = {
  TX26: 'Boncer 2026', TX28: 'Boncer 2028', TX31: 'Boncer 2031', TZXD6: 'Boncer dic-26', TZX27: 'Boncer jun-27', TZX28: 'Boncer jun-28',
  T15E7: 'Boncap ene-27', T30J7: 'Boncap jun-27', T31Y7: 'Boncap may-27', TTD26: 'Bonte dic-26',
  DICP: 'Discount en pesos', PARP: 'Par en pesos', CUAP: 'Cuasipar',
};

const ADRS_AR = ['YPF', 'GGAL', 'BMA', 'PAM', 'TGS', 'CEPU', 'EDN', 'LOMA', 'SUPV', 'BBAR', 'TEO', 'CRESY', 'IRS', 'TX', 'TS', 'MELI', 'GLOB', 'VIST', 'DESP', 'BIOX', 'CAAP'];

/** Cuántas acciones vía CEDEAR se publican (las de mayor monto operado del día). */
const CEDEARS_STOCKS_MAX = 80;
/** Siempre visibles aunque ese día operen poco. */
const CEDEARS_ALWAYS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'MELI', 'KO', 'BRKB', 'JPM', 'V', 'WMT', 'VIST', 'GLOB', 'PBR'];

const q = (r: D912, divisor = 1): Quote => ({
  symbol: r.symbol,
  price: r.c,
  pct: r.pct_change,
  monto: (r.v * r.c) / divisor,
  bid: r.px_bid || null,
  ask: r.px_ask || null,
});

export async function fetchMarket() {
  const [stocksRaw, bondsRaw, cedearsRaw, adrsRaw, usaRaw, notesRaw] = await Promise.all([
    fetchJSON<D912[]>('https://data912.com/live/arg_stocks'),
    fetchJSON<D912[]>('https://data912.com/live/arg_bonds'),
    fetchJSON<D912[]>('https://data912.com/live/arg_cedears'),
    fetchJSON<D912[]>('https://data912.com/live/usa_adrs'),
    fetchJSON<D912[]>('https://data912.com/live/usa_stocks').catch(() => [] as D912[]),
    fetchJSON<D912[]>('https://data912.com/live/arg_notes').catch(() => [] as D912[]),
  ]);

  const stockSyms = new Set(stocksRaw.map((s) => s.symbol));
  const stocks = stocksRaw
    .filter((s) => s.c > 0)
    // fuera las especies en dólares (sufijo D / .D) y clases poco líquidas
    .filter((s) => !(/D$/.test(s.symbol) && stockSyms.has(s.symbol.replace(/\.?D$/, ''))))
    .filter((s) => !['TECOD', 'TGN4D', 'TGSUD', 'BMA.D', 'MOLA5', 'MOLI5', 'REITC', 'REITD'].includes(s.symbol))
    .map((s) => q(s))
    .sort((a, b) => b.monto - a.monto);

  const bmap = new Map(bondsRaw.map((b) => [b.symbol, b]));
  const bonds: Bond[] = SOBERANOS.flatMap(({ symbol, nombre, ley }) => {
    const ars = bmap.get(symbol);
    if (!ars || !ars.c) return [];
    const usd = bmap.get(symbol + 'D');
    return [{
      ...q(ars, 100),
      nombre,
      ley,
      priceUsd: usd?.c || null,
      pctUsd: usd?.pct_change ?? null,
      mep: usd?.c ? ars.c / usd.c : null,
    }];
  });

  const bondsPesos: Quote[] = Object.keys(PESOS)
    .map((s) => bmap.get(s))
    .filter((b): b is D912 => !!b && b.c > 0)
    .map((b) => ({ ...q(b, 100) }));

  // CEDEARs: todos los ETFs del catálogo + las acciones más operadas.
  // Se descartan las especies en dólares (sufijo D) y cable (C) cuando existe la de pesos.
  const cset = new Set(cedearsRaw.map((c) => c.symbol));
  const cbase = cedearsRaw.filter((c) => c.c > 0 && !(/[DC]$/.test(c.symbol) && cset.has(c.symbol.slice(0, -1))));
  const etfRows = cbase.filter((c) => c.symbol in ETF_INFO);
  const stockRows = cbase.filter((c) => !(c.symbol in ETF_INFO)).sort((a, b) => b.v * b.c - a.v * a.c);
  const topStocks = stockRows.slice(0, CEDEARS_STOCKS_MAX);
  const extra = stockRows.slice(CEDEARS_STOCKS_MAX).filter((c) => CEDEARS_ALWAYS.includes(c.symbol));
  const cedears = [...etfRows, ...topStocks, ...extra].map((c) => q(c));

  const amap = new Map([...usaRaw, ...adrsRaw].map((a) => [a.symbol, a]));
  const adrs = ADRS_AR.map((s) => amap.get(s)).filter((a): a is D912 => !!a && a.c > 0).map((a) => q(a));

  const letras = buildLetras([...notesRaw, ...bondsRaw]);

  return { stocks, panelLider: PANEL_LIDER, bonds, bondsPesos, cedears, adrs, letras };
}

/**
 * Letras y bonos a tasa fija en pesos: precio de data912 + vencimiento y pago
 * final de la tabla curada (src/content/letras.ts). Las ya vencidas se caen
 * solas y las que todavía no están cargadas avisan en el log del build.
 */
function buildLetras(rows: D912[]): Letra[] {
  const map = new Map(rows.map((r) => [r.symbol, r]));
  const hoy = arDateKey(new Date());
  const letras = LETRAS.filter((l) => l.vencimiento > hoy).flatMap((l) => {
    const r = map.get(l.ticker);
    if (!r || !(r.c > 0)) return [];
    return [{ ...l, price: r.c, pct: r.pct_change, monto: r.v }];
  });
  letras.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));

  const faltan = rows
    .filter((r) => /^[ST]\d{2}[A-Z]\d$/.test(r.symbol) && r.c > 0 && !LETRA_INFO[r.symbol])
    .map((r) => r.symbol);
  if (faltan.length) {
    console.warn(`[golong] letras sin datos de vencimiento (agregalas en src/content/letras.ts): ${faltan.join(', ')}`);
  }
  return letras;
}

export const BOND_NAMES: Record<string, string> = { ...Object.fromEntries(SOBERANOS.map((s) => [s.symbol, s.nombre])), ...PESOS };

// ── CoinGecko ───────────────────────────────────────────────

export async function fetchCrypto(): Promise<Crypto[]> {
  // Opcional: una "Demo API key" gratuita de CoinGecko evita límites en los servidores de GitHub.
  const key = process.env.COINGECKO_API_KEY;
  return normalizeCrypto(await fetchJSON<CgRow[]>(key ? `${COINGECKO_URL}&x_cg_demo_api_key=${encodeURIComponent(key)}` : COINGECKO_URL));
}
