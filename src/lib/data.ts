// Arma todos los datos del sitio una sola vez por build.
// Si una fuente falla, reutiliza esa parte del último snapshot publicado
// (https://<dominio>/data/snapshot.json) y la marca como "stale".
import { readFile } from 'node:fs/promises';
import { SITE } from '../site.config';
import {
  buildDollars, fetchCrypto, fetchDollarHistories, fetchDollarQuotes, fetchFx, fetchInflacion, fetchMarket, fetchPlazoFijo, fetchRiesgo,
} from './sources';
import { fetchJSON } from './upstream';
import type { SiteData, SourceKey, SourceStatus, Point } from './types';

type Settled<T> = { ok: true; value: T } | { ok: false; error: string };
const settle = <T>(p: Promise<T>): Promise<Settled<T>> =>
  p.then((value) => ({ ok: true as const, value })).catch((e) => ({ ok: false as const, error: String(e?.message ?? e) }));

async function loadPrevious(): Promise<SiteData | null> {
  try {
    if (process.env.PREV_SNAPSHOT_FILE) return JSON.parse(await readFile(process.env.PREV_SNAPSHOT_FILE, 'utf8'));
    if (process.env.MOCK_UPSTREAM && !process.env.PREV_SNAPSHOT_URL) return null;
    const url = process.env.PREV_SNAPSHOT_URL || `${SITE.url}/data/snapshot.json`;
    const data = await fetchJSON<SiteData>(url, { timeoutMs: 10000, retries: 0 });
    return data?.dollars ? data : null;
  } catch {
    return null;
  }
}

async function build(): Promise<SiteData> {
  const prevP = loadPrevious();
  const [quotes, fx, hist, riesgo, inflacion, plazoFijo, market, crypto] = await Promise.all([
    settle(fetchDollarQuotes()),
    settle(fetchFx()),
    settle(fetchDollarHistories()),
    settle(fetchRiesgo()),
    settle(fetchInflacion()),
    settle(fetchPlazoFijo()),
    settle(fetchMarket()),
    settle(fetchCrypto()),
  ]);
  const prev = await prevP;

  const status = (...parts: Settled<unknown>[]): SourceStatus => {
    const failed = parts.filter((p) => !p.ok) as { ok: false; error: string }[];
    return failed.length ? { ok: false, stale: true, error: failed.map((f) => f.error).join(' | ') } : { ok: true, stale: false };
  };
  const sources: Record<SourceKey, SourceStatus> = {
    dolarapi: status(quotes, fx),
    argentinadatos: status(hist, riesgo, inflacion, plazoFijo),
    data912: status(market),
    coingecko: status(crypto),
  };

  /** Datos esenciales: sin fuente ni snapshot previo, el build falla (y queda publicado el sitio anterior). */
  function pick<T>(s: Settled<T>, fallback: (p: SiteData) => T, label: string): T {
    if (s.ok) return s.value;
    if (prev) {
      console.warn(`[golong] ${label}: fuente caída (${s.error}); uso datos del snapshot anterior.`);
      return fallback(prev);
    }
    throw new Error(`[golong] ${label}: fuente caída y no hay snapshot anterior. ${s.error}`);
  }
  /** Datos opcionales: si no hay nada, la sección se muestra vacía en lugar de frenar el sitio entero. */
  function pickOr<T>(s: Settled<T>, fallback: (p: SiteData) => T, empty: T, label: string): T {
    if (s.ok || prev) return pick(s, fallback, label);
    console.warn(`[golong] ${label}: fuente caída y sin snapshot anterior; la sección queda vacía.`);
    return empty;
  }

  // Dólares: cotización (DolarApi) + historial (ArgentinaDatos), cada uno con su respaldo.
  let histories: Record<string, Point[]> | null = hist.ok ? hist.value : null;
  if (!histories && prev) {
    console.warn(`[golong] historial de dólares: uso snapshot anterior.`);
    histories = Object.fromEntries(Object.values(prev.dollars).map((d) => [d.casa, d.history]));
  }
  let q = quotes.ok ? quotes.value : null;
  if (!q && prev) {
    console.warn(`[golong] cotizaciones: uso snapshot anterior.`);
    q = Object.values(prev.dollars).map((d) => ({ casa: d.casa, nombre: d.nombre, compra: d.compra, venta: d.venta, fechaActualizacion: d.fecha }));
  }
  if (!q && !histories) throw new Error('[golong] No hay datos de dólar (DolarApi y ArgentinaDatos caídos, sin snapshot previo).');
  const dollars = buildDollars(q ?? [], histories ?? {});

  const m = pickOr(
    market,
    (p) => ({ stocks: p.stocks, panelLider: p.panelLider, bonds: p.bonds, bondsPesos: p.bondsPesos, cedears: p.cedears, adrs: p.adrs, letras: p.letras ?? [] }),
    { stocks: [], panelLider: [], bonds: [], bondsPesos: [], cedears: [], adrs: [], letras: [] },
    'mercado (data912)',
  );

  const data: SiteData = {
    generatedAt: new Date().toISOString(),
    dollars,
    riesgo: pick(riesgo, (p) => p.riesgo, 'riesgo país'),
    inflacion: pick(inflacion, (p) => p.inflacion, 'inflación'),
    ...m,
    crypto: pickOr(crypto, (p) => p.crypto, [], 'cripto (CoinGecko)'),
    fx: pickOr(fx, (p) => p.fx, [], 'otras monedas'),
    plazoFijo: pickOr(plazoFijo, (p) => p.plazoFijo, [], 'plazo fijo'),
    sources,
  };

  const bad = Object.entries(sources).filter(([, s]) => !s.ok);
  console.log(`[golong] datos listos ${data.generatedAt}. Fuentes con problemas: ${bad.length ? bad.map(([k]) => k).join(', ') : 'ninguna'}`);
  return data;
}

let cache: Promise<SiteData> | null = null;
export function getSiteData(): Promise<SiteData> {
  return (cache ??= build());
}
