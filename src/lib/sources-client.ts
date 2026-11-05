// Partes de las fuentes que también usa el navegador (sin dependencias de Node).
import type { Caucion, Crypto } from './types';

export const CRYPTO_IDS = ['bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana', 'ripple', 'usd-coin', 'cardano', 'dogecoin', 'litecoin'];
export const COINGECKO_URL = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${CRYPTO_IDS.join(',')}&price_change_percentage=24h,7d`;

export interface CgRow {
  id: string; symbol: string; name: string; current_price: number; market_cap: number | null; total_volume: number | null;
  high_24h: number | null; low_24h: number | null; price_change_percentage_24h: number | null; price_change_percentage_7d_in_currency?: number | null;
}

export function normalizeCrypto(rows: CgRow[]): Crypto[] {
  return rows
    .filter((r) => r.current_price != null)
    .map((r) => ({
      id: r.id,
      symbol: r.symbol.toUpperCase(),
      name: r.name,
      price: r.current_price,
      pct24h: r.price_change_percentage_24h ?? null,
      pct7d: r.price_change_percentage_7d_in_currency ?? null,
      mcap: r.market_cap,
      volume: r.total_volume,
      high24h: r.high_24h,
      low24h: r.low_24h,
    }))
    .sort((a, b) => (b.mcap ?? 0) - (a.mcap ?? 0));
}

// Cauciones de BYMA (open.bymadata.com.ar, gratuito y con demora). Acepta pedidos desde el navegador.
export const BYMA_CAUCIONES_URL = 'https://open.bymadata.com.ar/vanoms-be-core/rest/api/bymadata/free/cauciones';
export const BYMA_CAUCIONES_BODY = JSON.stringify({ excludeZeroPxAndQty: true, T2: true, T1: false, T0: false });

export interface BymaCaucion {
  underlyingSymbol: string; daysToMaturity: number; maturityDate: string; trade: number; closingPrice: number;
  vwap: number; previousClosingPrice: number; volumeAmount: number;
}

const MONEDA: Record<string, Caucion['moneda']> = { PESOS: 'ARS', DOLAR: 'USD', CABLE: 'CCL' };
const ORDEN: Caucion['moneda'][] = ['ARS', 'USD', 'CCL'];

/** BYMA informa las tasas como fracción (0,261 = 26,1 %). Solo quedan los plazos con operaciones en el día. */
export function normalizeCauciones(rows: BymaCaucion[]): Caucion[] {
  const pct = (v: number) => Math.round(v * 100000) / 1000;
  return rows
    .filter((r) => MONEDA[r.underlyingSymbol] && r.volumeAmount > 0 && (r.trade || r.closingPrice) > 0 && r.daysToMaturity > 0)
    .map((r) => ({
      moneda: MONEDA[r.underlyingSymbol],
      dias: r.daysToMaturity,
      vence: r.maturityDate.slice(0, 10),
      tna: pct(r.trade || r.closingPrice),
      prom: r.vwap > 0 ? pct(r.vwap) : null,
      anterior: r.previousClosingPrice > 0 ? pct(r.previousClosingPrice) : null,
      monto: Math.round(r.volumeAmount),
    }))
    .sort((a, b) => ORDEN.indexOf(a.moneda) - ORDEN.indexOf(b.moneda) || a.dias - b.dias);
}
