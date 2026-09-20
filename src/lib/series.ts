import type { Point } from './types';

const DAY = 864e5;
export const toTime = (key: string) => Date.parse(key + 'T12:00:00Z');
export const keyOf = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (key: string, n: number) => keyOf(toTime(key) + n * DAY);

/**
 * Reduce un historial diario: conserva cada día del último `dailyDays`
 * y un punto por semana antes de eso, hasta `maxYears` hacia atrás.
 */
export function compactHistory(points: Point[], dailyDays = 400, maxYears = 6): Point[] {
  if (!points.length) return [];
  const last = points[points.length - 1][0];
  const dailyFrom = addDays(last, -dailyDays);
  const from = addDays(last, -Math.round(maxYears * 365.25));
  const out: Point[] = [];
  let lastWeekly = -Infinity;
  for (const p of points) {
    if (p[0] < from) continue;
    if (p[0] >= dailyFrom) {
      out.push(p);
      continue;
    }
    const t = toTime(p[0]);
    if (t - lastWeekly >= 7 * DAY) {
      out.push(p);
      lastWeekly = t;
    }
  }
  return out;
}

/** Último valor con fecha estrictamente anterior a `key`. */
export function lastBefore(points: Point[], key: string): Point | null {
  for (let i = points.length - 1; i >= 0; i--) if (points[i][0] < key) return points[i];
  return null;
}

/** Último valor con fecha <= key. */
export function valueAt(points: Point[], key: string): number | null {
  for (let i = points.length - 1; i >= 0; i--) if (points[i][0] <= key) return points[i][1];
  return null;
}

export function since(points: Point[], fromKey: string): Point[] {
  return points.filter((p) => p[0] >= fromKey);
}

export interface RangeStats {
  first: number;
  last: number;
  min: Point;
  max: Point;
  changePct: number;
  changeAbs: number;
}
export function rangeStats(points: Point[]): RangeStats | null {
  if (points.length < 2) return null;
  let min = points[0];
  let max = points[0];
  for (const p of points) {
    if (p[1] < min[1]) min = p;
    if (p[1] > max[1]) max = p;
  }
  const first = points[0][1];
  const last = points[points.length - 1][1];
  return { first, last, min, max, changeAbs: last - first, changePct: (last / first - 1) * 100 };
}

/** Une dos series por fecha y aplica fn(a, b). */
export function combine(a: Point[], b: Point[], fn: (x: number, y: number) => number): Point[] {
  const mb = new Map(b);
  const out: Point[] = [];
  for (const [k, v] of a) {
    const w = mb.get(k);
    if (w != null) out.push([k, fn(v, w)]);
  }
  return out;
}

export const RANGES = [
  { id: '1m', label: '1M', days: 31 },
  { id: '3m', label: '3M', days: 92 },
  { id: '6m', label: '6M', days: 183 },
  { id: '1a', label: '1A', days: 366 },
  { id: '5a', label: '5A', days: 1827 },
  { id: 'max', label: 'Máx', days: 40000 },
] as const;
export type RangeId = (typeof RANGES)[number]['id'];

export function sliceRange(points: Point[], days: number): Point[] {
  if (!points.length) return points;
  const from = addDays(points[points.length - 1][0], -days);
  return since(points, from);
}
