// Gráficos SVG sin dependencias. Las mismas funciones se usan en el build
// (HTML inicial, visible sin JavaScript) y en el navegador (rangos, resize, hover).
import type { Point } from './types';
import { dayMonth, monthShortYear, num, pct, price } from './format';
import { toTime } from './series';

export type ValueFormat = 'ars' | 'usd' | 'pct' | 'pts' | 'num';

export function fmtValue(v: number, f: ValueFormat): string {
  switch (f) {
    case 'ars': return `$${price(v)}`;
    case 'usd': return `US$${price(v)}`;
    case 'pct': return pct(v, 1, false);
    case 'pts': return `${num(v, 0)} pts`;
    default: return num(v, 2);
  }
}
/** Etiquetas de eje: sin decimales cuando no hacen falta. */
function fmtTick(v: number, f: ValueFormat, step: number): string {
  const d = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  switch (f) {
    case 'ars': return `$${num(v, d)}`;
    case 'usd': return `US$${num(v, d)}`;
    case 'pct': return `${num(v, d)}%`;
    case 'pts': return num(v, 0);
    default: return num(v, d);
  }
}

export interface Series {
  key: string;
  label: string;
  /** índice de color categórico 1..8 */
  slot: number;
  points: Point[];
}

export interface LineChartOpts {
  series: Series[];
  width: number;
  height: number;
  format: ValueFormat;
  /** Relleno suave bajo la línea (solo con una serie) */
  area?: boolean;
  /** Línea de referencia horizontal (p. ej. 0 en la brecha) */
  refLine?: number | null;
  endLabels?: boolean;
}

export function niceStep(range: number, count: number): number {
  if (range <= 0) return 1;
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (n: number) => Math.round(n * 10) / 10;

export interface Layout {
  x: (t: number) => number;
  y: (v: number) => number;
  left: number; right: number; top: number; bottom: number;
  t0: number; t1: number; yMin: number; yMax: number;
}

function yDomain(values: number[], includeZero: boolean, ticks = 4) {
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (includeZero) { min = Math.min(0, min); max = Math.max(0, max); }
  if (min === max) { min -= Math.abs(min) * 0.05 || 1; max += Math.abs(max) * 0.05 || 1; }
  const pad = (max - min) * 0.06;
  const step = niceStep(max - min + 2 * pad, ticks);
  const lo = includeZero && min >= 0 ? 0 : Math.floor((min - pad) / step) * step;
  const hi = Math.ceil((max + pad) / step) * step;
  return { lo, hi, step };
}

function xTicks(t0: number, t1: number, width: number): { t: number; label: string }[] {
  const spanDays = (t1 - t0) / 864e5;
  const count = Math.max(2, Math.min(6, Math.floor(width / 110)));
  const out: { t: number; label: string }[] = [];
  const fmt = (t: number) => {
    const k = new Date(t).toISOString().slice(0, 10);
    if (spanDays <= 100) return dayMonth(k);
    if (spanDays <= 800) return monthShortYear(k);
    return k.slice(0, 4);
  };
  if (spanDays > 800) {
    // un tick por año (o cada 2 / 5 años)
    const y0 = new Date(t0).getUTCFullYear() + 1;
    const y1 = new Date(t1).getUTCFullYear();
    const every = Math.max(1, Math.ceil((y1 - y0 + 1) / count));
    for (let y = y0; y <= y1; y += every) {
      const t = Date.UTC(y, 0, 1, 12);
      out.push({ t, label: String(y) });
    }
    return out;
  }
  for (let i = 0; i < count; i++) {
    const t = t0 + ((t1 - t0) * (i + 0.5)) / count;
    out.push({ t, label: fmt(t) });
  }
  return out;
}

export function lineLayout(o: LineChartOpts): Layout & { step: number } {
  const all = o.series.flatMap((s) => s.points.map((p) => p[1]));
  if (o.refLine != null) all.push(o.refLine);
  const { lo, hi, step } = yDomain(all.length ? all : [0, 1], false, o.height < 200 ? 3 : 4);
  const tickW = Math.max(fmtTick(lo, o.format, step).length, fmtTick(hi, o.format, step).length) * 6.4 + 10;
  const left = Math.ceil(tickW);
  const right = o.width - 10;
  const top = 12;
  const bottom = o.height - 24;
  const times = o.series.flatMap((s) => [s.points[0], s.points[s.points.length - 1]]).filter(Boolean).map((p) => toTime(p[0]));
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const x = (t: number) => left + ((t - t0) / (t1 - t0 || 1)) * (right - left);
  const y = (v: number) => bottom - ((v - lo) / (hi - lo || 1)) * (bottom - top);
  return { x, y, left, right, top, bottom, t0, t1, yMin: lo, yMax: hi, step };
}

export function renderLineChart(o: LineChartOpts): string {
  const L = lineLayout(o);
  const parts: string[] = [];
  parts.push(`<svg class="chart-svg" viewBox="0 0 ${o.width} ${o.height}" width="${o.width}" height="${o.height}" role="img" aria-hidden="true" focusable="false">`);
  // grilla + eje Y
  for (let v = L.yMin; v <= L.yMax + L.step / 1000; v += L.step) {
    const yy = r1(L.y(v));
    parts.push(`<line class="grid" x1="${L.left}" x2="${L.right}" y1="${yy}" y2="${yy}"/>`);
    parts.push(`<text class="tick" x="${L.left - 8}" y="${yy + 3.5}" text-anchor="end">${esc(fmtTick(v, o.format, L.step))}</text>`);
  }
  // eje X
  parts.push(`<line class="baseline" x1="${L.left}" x2="${L.right}" y1="${L.bottom}" y2="${L.bottom}"/>`);
  for (const tk of xTicks(L.t0, L.t1, o.width)) {
    const xx = r1(L.x(tk.t));
    if (xx < L.left + 12 || xx > L.right - 12) continue;
    parts.push(`<text class="tick" x="${xx}" y="${L.bottom + 16}" text-anchor="middle">${esc(tk.label)}</text>`);
  }
  if (o.refLine != null && o.refLine > L.yMin && o.refLine < L.yMax) {
    const yy = r1(L.y(o.refLine));
    parts.push(`<line class="ref" x1="${L.left}" x2="${L.right}" y1="${yy}" y2="${yy}"/>`);
  }
  const ends: { x: number; y: number; label: string; slot: number }[] = [];
  for (const s of o.series) {
    if (s.points.length < 2) continue;
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${r1(L.x(toTime(p[0])))} ${r1(L.y(p[1]))}`).join('');
    if (o.area && o.series.length === 1) {
      const last = s.points[s.points.length - 1];
      const first = s.points[0];
      parts.push(`<path class="area s${s.slot}" d="${d}L${r1(L.x(toTime(last[0])))} ${L.bottom}L${r1(L.x(toTime(first[0])))} ${L.bottom}Z"/>`);
    }
    parts.push(`<path class="line s${s.slot}" d="${d}"/>`);
    const last = s.points[s.points.length - 1];
    ends.push({ x: L.x(toTime(last[0])), y: L.y(last[1]), label: fmtValue(last[1], o.format), slot: s.slot });
  }
  // puntos finales + etiqueta directa (se omiten las que chocan)
  const placed: number[] = [];
  for (const e of ends) {
    parts.push(`<circle class="end s${e.slot}" cx="${r1(e.x)}" cy="${r1(e.y)}" r="4"/>`);
    if (o.endLabels === false) continue;
    const ly = e.y - 10 < L.top + 8 ? e.y + 18 : e.y - 10;
    if (placed.some((p) => Math.abs(p - ly) < 15)) continue;
    placed.push(ly);
    parts.push(`<text class="end-label" x="${r1(e.x - 6)}" y="${r1(ly)}" text-anchor="end">${esc(e.label)}</text>`);
  }
  parts.push('</svg>');
  return parts.join('');
}

// ── Columnas (inflación mensual) ────────────────────────────

export interface BarChartOpts {
  points: Point[];
  width: number;
  height: number;
  format: ValueFormat;
  slot?: number;
  /** cómo rotular cada columna en el eje X */
  label: (key: string) => string;
  /** índices a rotular con su valor */
  labelIdx?: number[];
}

export function barLayout(o: BarChartOpts) {
  const vals = o.points.map((p) => p[1]);
  const { lo, hi, step } = yDomain(vals.length ? vals : [0, 1], true, o.height < 200 ? 3 : 4);
  const tickW = Math.max(fmtTick(hi, o.format, step).length, fmtTick(lo, o.format, step).length) * 6.4 + 10;
  const left = Math.ceil(tickW);
  const right = o.width - 6;
  const top = 18;
  const bottom = o.height - 24;
  const band = (right - left) / Math.max(1, o.points.length);
  const bw = Math.max(2, Math.min(24, band - 2));
  const y = (v: number) => bottom - ((v - lo) / (hi - lo || 1)) * (bottom - top);
  const cx = (i: number) => left + band * i + band / 2;
  return { lo, hi, step, left, right, top, bottom, band, bw, y, cx };
}

export function renderBarChart(o: BarChartOpts): string {
  const L = barLayout(o);
  const p: string[] = [];
  const slot = o.slot ?? 1;
  p.push(`<svg class="chart-svg" viewBox="0 0 ${o.width} ${o.height}" width="${o.width}" height="${o.height}" role="img" aria-hidden="true" focusable="false">`);
  for (let v = L.lo; v <= L.hi + L.step / 1000; v += L.step) {
    const yy = r1(L.y(v));
    p.push(`<line class="${Math.abs(v) < 1e-9 ? 'baseline' : 'grid'}" x1="${L.left}" x2="${L.right}" y1="${yy}" y2="${yy}"/>`);
    p.push(`<text class="tick" x="${L.left - 8}" y="${yy + 3.5}" text-anchor="end">${esc(fmtTick(v, o.format, L.step))}</text>`);
  }
  const every = Math.max(1, Math.ceil(o.points.length / Math.max(2, Math.floor(o.width / 64))));
  const y0 = L.y(0);
  o.points.forEach(([k, v], i) => {
    const x = L.cx(i) - L.bw / 2;
    const yv = L.y(v);
    const h = Math.abs(y0 - yv);
    const r = Math.min(4, h, L.bw / 2);
    // extremo de datos redondeado (4px), base recta
    const d = v >= 0
      ? `M${r1(x)} ${r1(y0)}V${r1(yv + r)}Q${r1(x)} ${r1(yv)} ${r1(x + r)} ${r1(yv)}H${r1(x + L.bw - r)}Q${r1(x + L.bw)} ${r1(yv)} ${r1(x + L.bw)} ${r1(yv + r)}V${r1(y0)}Z`
      : `M${r1(x)} ${r1(y0)}V${r1(yv - r)}Q${r1(x)} ${r1(yv)} ${r1(x + r)} ${r1(yv)}H${r1(x + L.bw - r)}Q${r1(x + L.bw)} ${r1(yv)} ${r1(x + L.bw)} ${r1(yv - r)}V${r1(y0)}Z`;
    p.push(`<path class="bar s${slot}" data-i="${i}" d="${d}"/>`);
    if ((o.points.length - 1 - i) % every === 0) {
      p.push(`<text class="tick" x="${r1(L.cx(i))}" y="${L.bottom + 16}" text-anchor="middle">${esc(o.label(k))}</text>`);
    }
    if (o.labelIdx?.includes(i)) {
      p.push(`<text class="end-label" x="${r1(L.cx(i))}" y="${r1((v >= 0 ? yv : yv + 12) - 6)}" text-anchor="middle">${esc(fmtValue(v, o.format))}</text>`);
    }
  });
  p.push('</svg>');
  return p.join('');
}

// ── Dos paneles con meses compartidos (riesgo país + compras del BCRA) ──

export interface DualChartOpts {
  /** claves AAAA-MM-01 */
  months: string[];
  /** panel de arriba: línea */
  top: (number | null)[];
  /** panel de abajo: columnas positivas/negativas */
  bottom: (number | null)[];
  topLabel: string;
  bottomLabel: string;
  /** la última columna es de un mes incompleto */
  partial?: boolean;
  width: number;
  height: number;
}

export function dualLayout(o: DualChartOpts) {
  const n = Math.max(1, o.months.length);
  const tv = o.top.filter((v): v is number => v != null);
  const bv = o.bottom.filter((v): v is number => v != null);
  const T = yDomain(tv.length ? tv : [0, 1], false, 3);
  const B = yDomain(bv.length ? bv : [0, 1], true, 3);
  const w = (v: number, f: ValueFormat, st: number) => fmtTick(v, f, st).length;
  const tickW = Math.max(w(T.lo, 'pts', T.step), w(T.hi, 'pts', T.step), w(B.lo, 'num', B.step), w(B.hi, 'num', B.step)) * 6.4 + 10;
  const left = Math.ceil(tickW);
  const right = o.width - 8;
  const band = (right - left) / n;
  const cx = (i: number) => left + band * i + band / 2;
  const top1 = 26;
  const bottom1 = Math.round(o.height * 0.5);
  const top2 = bottom1 + 40;
  const bottom2 = o.height - 24;
  const y1 = (v: number) => bottom1 - ((v - T.lo) / (T.hi - T.lo || 1)) * (bottom1 - top1);
  const y2 = (v: number) => bottom2 - ((v - B.lo) / (B.hi - B.lo || 1)) * (bottom2 - top2);
  const bw = Math.max(2, Math.min(22, band - 3));
  return { n, T, B, left, right, band, cx, top1, bottom1, top2, bottom2, y1, y2, bw };
}

export function renderDualChart(o: DualChartOpts): string {
  const L = dualLayout(o);
  const p: string[] = [];
  p.push(`<svg class="chart-svg" viewBox="0 0 ${o.width} ${o.height}" width="${o.width}" height="${o.height}" role="img" aria-hidden="true" focusable="false">`);
  // panel de arriba
  p.push(`<text class="panel-label" x="${L.left}" y="${L.top1 - 12}">${esc(o.topLabel)}</text>`);
  for (let v = L.T.lo; v <= L.T.hi + L.T.step / 1000; v += L.T.step) {
    const yy = r1(L.y1(v));
    p.push(`<line class="grid" x1="${L.left}" x2="${L.right}" y1="${yy}" y2="${yy}"/>`);
    p.push(`<text class="tick" x="${L.left - 8}" y="${yy + 3.5}" text-anchor="end">${esc(fmtTick(v, 'pts', L.T.step))}</text>`);
  }
  let d = '';
  let pen = false;
  let last: { x: number; y: number; v: number } | null = null;
  o.top.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    const x = r1(L.cx(i));
    const y = r1(L.y1(v));
    d += `${pen ? 'L' : 'M'}${x} ${y}`;
    pen = true;
    last = { x, y, v };
  });
  if (d) p.push(`<path class="line s1" d="${d}"/>`);
  if (last) {
    const e = last as { x: number; y: number; v: number };
    p.push(`<circle class="end s1" cx="${e.x}" cy="${e.y}" r="4"/>`);
    const ly = e.y - 10 < L.top1 + 6 ? e.y + 18 : e.y - 10;
    p.push(`<text class="end-label" x="${r1(e.x - 6)}" y="${r1(ly)}" text-anchor="end">${esc(fmtValue(e.v, 'pts'))}</text>`);
  }
  // panel de abajo
  p.push(`<text class="panel-label" x="${L.left}" y="${L.top2 - 14}">${esc(o.bottomLabel)}</text>`);
  for (let v = L.B.lo; v <= L.B.hi + L.B.step / 1000; v += L.B.step) {
    const yy = r1(L.y2(v));
    p.push(`<line class="${Math.abs(v) < 1e-9 ? 'baseline' : 'grid'}" x1="${L.left}" x2="${L.right}" y1="${yy}" y2="${yy}"/>`);
    p.push(`<text class="tick" x="${L.left - 8}" y="${yy + 3.5}" text-anchor="end">${esc(fmtTick(v, 'num', L.B.step))}</text>`);
  }
  const y0 = L.y2(0);
  o.bottom.forEach((v, i) => {
    if (v == null || v === 0) return;
    const x = L.cx(i) - L.bw / 2;
    const yv = L.y2(v);
    const h = Math.abs(y0 - yv);
    const r = Math.min(3, h, L.bw / 2);
    const s = v > 0 ? 1 : -1;
    const path = `M${r1(x)} ${r1(y0)}V${r1(yv + s * r)}Q${r1(x)} ${r1(yv)} ${r1(x + r)} ${r1(yv)}H${r1(x + L.bw - r)}Q${r1(x + L.bw)} ${r1(yv)} ${r1(x + L.bw)} ${r1(yv + s * r)}V${r1(y0)}Z`;
    const cls = `bar ${v > 0 ? 'pos' : 'neg'}${o.partial && i === o.months.length - 1 ? ' partial' : ''}`;
    p.push(`<path class="${cls}" data-i="${i}" d="${path}"/>`);
  });
  // eje X compartido
  const every = Math.max(1, Math.ceil(L.n / Math.max(2, Math.floor(o.width / 64))));
  o.months.forEach((k, i) => {
    if ((L.n - 1 - i) % every !== 0) return;
    p.push(`<text class="tick" x="${r1(L.cx(i))}" y="${L.bottom2 + 16}" text-anchor="middle">${esc(monthShortYear(k))}</text>`);
  });
  p.push('</svg>');
  return p.join('');
}

// ── Sparkline ───────────────────────────────────────────────

export function renderSparkline(points: Point[], width = 120, height = 36, slot = 1): string {
  if (points.length < 2) return '';
  const vals = points.map((p) => p[1]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = 3;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${r1(x(i))} ${r1(y(p[1]))}`).join('');
  const lx = x(points.length - 1);
  const ly = y(vals[vals.length - 1]);
  void ly;
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="spark-area s${slot}" d="${d}L${r1(lx)} ${height}L${pad} ${height}Z"/><path class="spark-line s${slot}" vector-effect="non-scaling-stroke" d="${d}"/></svg>`;
}
