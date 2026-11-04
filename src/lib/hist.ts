// Historia de 5 años (semanal) de la acción o el ETF que respalda cada CEDEAR, desde Yahoo Finance.
// Se descarga como mucho una vez por día: cada archivo queda en .cache/yahoo y el workflow
// conserva esa carpeta entre corridas. Si Yahoo no responde, se usa la última copia guardada;
// si no hay ninguna, ese CEDEAR simplemente no tiene gráfico.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fetchJSON } from './upstream';
import type { Point } from './types';

export interface Hist {
  symbol: string;
  /** Símbolo de la acción original en Yahoo (p. ej. BRK-B o VALE3.SA) */
  yahoo: string;
  currency: string;
  updated: string;
  points: Point[];
}

const DIR = process.env.MOCK_UPSTREAM ? '.cache/yahoo-mock' : '.cache/yahoo';
const today = () => new Date().toISOString().slice(0, 10);

/** Símbolo de Yahoo para la acción que respalda el CEDEAR. */
export function yahooSymbol(cedear: string): string {
  const special: Record<string, string> = { BRKB: 'BRK-B', BPA11: 'BPAC11.SA' };
  if (special[cedear]) return special[cedear];
  if (/^[A-Z]{4}\d{1,2}$/.test(cedear)) return `${cedear}.SA`; // acciones brasileñas (VALE3, PETR3…)
  return cedear;
}

interface YahooChart {
  chart: {
    result?: { meta: { currency?: string }; timestamp?: number[]; indicators: { quote: { close: (number | null)[] }[] } }[];
    error?: unknown;
  };
}

async function download(symbol: string): Promise<Hist> {
  const yahoo = yahooSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?range=5y&interval=1wk`;
  const j = await fetchJSON<YahooChart>(url, { timeoutMs: 12000, retries: 1, headers: { 'user-agent': 'Mozilla/5.0 (compatible; dolarahora-build/1.0)' } });
  const r = j.chart.result?.[0];
  if (!r?.timestamp?.length) throw new Error(`sin datos para ${yahoo}`);
  const close = r.indicators.quote[0]?.close ?? [];
  const points: Point[] = [];
  r.timestamp.forEach((t, i) => {
    const c = close[i];
    if (c != null && Number.isFinite(c) && c > 0) points.push([new Date(t * 1000).toISOString().slice(0, 10), Math.round(c * 100) / 100]);
  });
  if (points.length < 20) throw new Error(`muy pocos datos para ${yahoo}`);
  return { symbol, yahoo, currency: r.meta.currency ?? 'USD', updated: today(), points };
}

async function readCache(symbol: string): Promise<Hist | null> {
  try {
    return JSON.parse(await readFile(join(DIR, `${symbol}.json`), 'utf8')) as Hist;
  } catch {
    return null;
  }
}

let all: Promise<Map<string, Hist>> | null = null;

/** Historia de todos los CEDEARs pedidos. Se calcula una sola vez por build. */
export function getHistories(symbols: string[]): Promise<Map<string, Hist>> {
  all ??= (async () => {
    await mkdir(DIR, { recursive: true });
    const out = new Map<string, Hist>();
    const queue = [...new Set(symbols)];
    let ok = 0;
    let fallasSeguidas = 0;
    let cortado = false;
    const worker = async () => {
      while (queue.length) {
        const sym = queue.shift()!;
        const cached = await readCache(sym);
        if (cached && cached.updated === today()) {
          out.set(sym, cached);
          continue;
        }
        if (!cortado) {
          try {
            const h = await download(sym);
            await writeFile(join(DIR, `${sym}.json`), JSON.stringify(h));
            out.set(sym, h);
            ok++;
            fallasSeguidas = 0;
            continue;
          } catch (e) {
            fallasSeguidas++;
            // Si las primeras descargas fallan todas, Yahoo no está respondiendo: no insistir.
            if (ok === 0 && fallasSeguidas >= 6) cortado = true;
          }
        }
        if (cached) out.set(sym, cached);
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    console.log(`[hist] CEDEARs con historia: ${out.size}/${symbols.length} (descargados hoy: ${ok}${cortado ? ', Yahoo no respondió' : ''})`);
    return out;
  })();
  return all;
}
