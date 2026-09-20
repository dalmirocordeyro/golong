// Partes de las fuentes que también usa el navegador (sin dependencias de Node).
import type { Crypto } from './types';

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
