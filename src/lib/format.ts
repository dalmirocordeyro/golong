// Formato de números y fechas es-AR. Se usa en el servidor (build) y en el navegador.

export const TZ = 'America/Argentina/Buenos_Aires';

const nfCache = new Map<string, Intl.NumberFormat>();
function nf(min: number, max: number): Intl.NumberFormat {
  const k = `${min}-${max}`;
  let f = nfCache.get(k);
  if (!f) {
    f = new Intl.NumberFormat('es-AR', { minimumFractionDigits: min, maximumFractionDigits: max });
    nfCache.set(k, f);
  }
  return f;
}

/** 1550 → "1.550,00" */
export function num(n: number | null | undefined, decimals = 2): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return nf(decimals, decimals).format(n);
}

/** Decimales automáticos según magnitud (para precios de activos muy distintos). */
export function autoDecimals(n: number): number {
  const a = Math.abs(n);
  if (a >= 1000) return 2;
  if (a >= 1) return 2;
  if (a >= 0.01) return 4;
  return 6;
}

export function price(n: number | null | undefined, decimals?: number): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return num(n, decimals ?? autoDecimals(n));
}

/** Parte entera y decimal por separado, para mostrar los decimales más chicos sin romper el copiado. */
export function splitPrice(n: number, decimals = 2): { int: string; dec: string } {
  const s = num(n, decimals);
  const i = s.lastIndexOf(',');
  return i === -1 ? { int: s, dec: '' } : { int: s.slice(0, i), dec: s.slice(i) };
}

/** -0.3226 → "-0,32%" ; 1.5 → "+1,50%" */
export function pct(n: number | null | undefined, decimals = 2, signed = true): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const s = nf(decimals, decimals).format(Math.abs(n));
  const sign = n > 0.0000001 ? '+' : n < -0.0000001 ? '-' : '';
  return `${signed ? sign : n < 0 ? '-' : ''}${s}%`;
}

export function signedNum(n: number | null | undefined, decimals = 0): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const s = nf(decimals, decimals).format(Math.abs(n));
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${s}`;
}

/** Compacto legible en castellano: 12,3 mil · 4,5 M · 10,1 mil M · 1,6 billones */
export function compact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  const f = (v: number) => nf(0, v >= 100 ? 0 : 1).format(v);
  if (a >= 1e12) return `${f(n / 1e12)} billones`;
  if (a >= 1e9) return `${f(n / 1e9)} mil M`;
  if (a >= 1e6) return `${f(n / 1e6)} M`;
  if (a >= 1e4) return `${f(n / 1e3)} mil`;
  return nf(0, 0).format(n);
}

export type Direction = 'up' | 'down' | 'flat';
export function direction(n: number | null | undefined, eps = 0.005): Direction {
  if (n == null || !Number.isFinite(n) || Math.abs(n) < eps) return 'flat';
  return n > 0 ? 'up' : 'down';
}

// ── Fechas ───────────────────────────────────────────────────

const dtf = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-AR', { timeZone: TZ, ...opts });
const partsFmt = dtf({ weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export interface ArParts { weekday: string; day: string; month: string; year: string; hour: string; minute: string }
export function arParts(d: Date): ArParts {
  const p: Record<string, string> = {};
  for (const { type, value } of partsFmt.formatToParts(d)) p[type] = value;
  return { weekday: (p.weekday || '').replace('.', ''), day: p.day, month: p.month, year: p.year, hour: p.hour, minute: p.minute };
}

/** "2026-09-20" en hora argentina */
export function arDateKey(d: Date): string {
  const p = arParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** "vie 18/09 15:55" */
export function shortDateTime(iso: string | Date): string {
  const p = arParts(typeof iso === 'string' ? new Date(iso) : iso);
  return `${p.weekday} ${p.day}/${p.month} ${p.hour}:${p.minute}`;
}

/** "18/09/2026" a partir de "2026-09-18" */
export function dmy(key: string): string {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** "2026-08-31" → "ago 2026" */
export function monthYear(key: string, long = false): string {
  const [y, m] = key.split('-');
  return `${(long ? MONTHS_LONG : MONTHS)[Number(m) - 1]} ${y}`;
}
/** "2026-09-18" → "18 sep" */
export function dayMonth(key: string): string {
  const [, m, d] = key.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}
/** "2026-09-18" → "sep 26" */
export function monthShortYear(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}

/** "hace 5 min", "hace 2 h", "ayer", "hace 3 días" */
export function relativeTime(iso: string, now = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'hace instantes';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}
