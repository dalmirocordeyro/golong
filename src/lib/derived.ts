import { combine } from './series';
import type { Dollar, DollarSlug, Point, SiteData } from './types';

export const BRECHA_SLUGS: DollarSlug[] = ['blue', 'mep', 'ccl', 'cripto'];

export function brecha(d: Record<DollarSlug, Dollar>, slug: DollarSlug, base: DollarSlug = 'oficial'): number {
  return (d[slug].venta / d[base].venta - 1) * 100;
}

export function brechaHistory(d: Record<DollarSlug, Dollar>, slug: DollarSlug, base: DollarSlug = 'oficial'): Point[] {
  return combine(d[slug].history, d[base].history, (a, b) => (a / b - 1) * 100);
}

/** Últimos N días de un historial (para sparklines). */
export function lastDays(points: Point[], days: number): Point[] {
  if (!points.length) return points;
  const last = Date.parse(points[points.length - 1][0]);
  return points.filter((p) => Date.parse(p[0]) >= last - days * 864e5);
}

/** Panel líder: cuántas suben, bajan y quedan igual. */
export function breadth(data: SiteData) {
  const set = new Set(data.panelLider);
  const rows = data.stocks.filter((s) => set.has(s.symbol));
  return {
    rows,
    up: rows.filter((r) => r.pct > 0.005).length,
    down: rows.filter((r) => r.pct < -0.005).length,
    flat: rows.filter((r) => Math.abs(r.pct) <= 0.005).length,
    avg: rows.length ? rows.reduce((a, r) => a + r.pct, 0) / rows.length : 0,
  };
}

/** Datos mínimos que el navegador necesita para actualizar precios en vivo. */
export function liveConfig(data: SiteData) {
  return {
    generatedAt: data.generatedAt,
    dollars: Object.values(data.dollars).map((d) => ({
      slug: d.slug,
      casa: d.casa,
      venta: d.venta,
      compra: d.compra,
      fecha: d.fecha,
      tail: d.history.slice(-10),
    })),
    crypto: data.crypto.map((c) => c.id),
  };
}
export type LiveConfig = ReturnType<typeof liveConfig>;
