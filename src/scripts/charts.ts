// Interactividad de los gráficos: rangos, tamaño real, crosshair + tooltip y teclado.
import { barLayout, fmtValue, lineLayout, renderBarChart, renderLineChart, type Series, type ValueFormat } from '../lib/chart';
import { dmy, monthShortYear, monthYear, num, pct } from '../lib/format';
import { RANGES, rangeStats, sliceRange, toTime } from '../lib/series';
import type { Point } from '../lib/types';

interface LineCfg { type: 'line'; series: Series[]; format: ValueFormat; area?: boolean; refLine?: number | null; height: number; range: string; statsFormat?: ValueFormat }
interface BarCfg { type: 'bar'; points: Point[]; format: ValueFormat; height: number; slot?: number; label: 'month' }
type Cfg = LineCfg | BarCfg;

const heightFor = (h: number, w: number) => (w < 520 ? Math.round(h * 0.8) : h);

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function nearestIndex(points: Point[], t: number): number {
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (toTime(points[mid][0]) < t) lo = mid;
    else hi = mid;
  }
  return Math.abs(toTime(points[lo][0]) - t) <= Math.abs(toTime(points[hi][0]) - t) ? lo : hi;
}

function setupLine(root: HTMLElement, plot: HTMLElement, cfg: LineCfg) {
  let range = cfg.range;
  let width = 0;
  let view: Series[] = [];
  let layout: ReturnType<typeof lineLayout> | null = null;
  let idx = -1;

  const tip = el('div', 'tooltip');
  const xhair = el('div', 'xhair');
  const dots: HTMLElement[] = [];

  const statsBox = root.querySelector<HTMLElement>('[data-chart-stats]');
  const updateStats = () => {
    if (!statsBox || !view[0]) return;
    const s = rangeStats(view[0].points);
    if (!s) return;
    const f = cfg.statsFormat ?? cfg.format;
    const set = (k: string, v: string) => {
      const n = statsBox.querySelector(`[data-k="${k}"]`);
      if (n) n.textContent = v;
    };
    set('chg', cfg.format === 'pct' || cfg.format === 'pts' ? `${s.changeAbs >= 0 ? '+' : ''}${num(s.changeAbs, cfg.format === 'pts' ? 0 : 1)}${cfg.format === 'pct' ? ' pp' : ' pts'}` : pct(s.changePct));
    set('max', fmtValue(s.max[1], f));
    set('maxd', dmy(s.max[0]));
    set('min', fmtValue(s.min[1], f));
    set('mind', dmy(s.min[0]));
    set('first', fmtValue(s.first, f));
  };

  const render = () => {
    width = Math.max(280, Math.round(plot.clientWidth));
    const days = RANGES.find((r) => r.id === range)?.days ?? 366;
    view = cfg.series.map((s) => ({ ...s, points: sliceRange(s.points, days) }));
    const h = heightFor(cfg.height, width);
    const opts = { series: view, width, height: h, format: cfg.format, area: cfg.area, refLine: cfg.refLine };
    plot.innerHTML = renderLineChart(opts);
    layout = lineLayout(opts);
    dots.length = 0;
    plot.append(xhair, tip);
    for (const s of view) {
      const d = el('div', `hdot s${s.slot}`);
      plot.append(d);
      dots.push(d);
    }
    updateStats();
    hide();
  };

  const show = (i: number) => {
    if (!layout || !view[0]?.points.length) return;
    idx = Math.max(0, Math.min(view[0].points.length - 1, i));
    const base = view[0].points[idx];
    const t = toTime(base[0]);
    const x = layout.x(t);
    xhair.style.display = 'block';
    xhair.style.left = `${x}px`;
    xhair.style.height = `${layout.bottom - layout.top}px`;
    tip.replaceChildren();
    const date = el('div', 'tt-date');
    date.textContent = dmy(base[0]);
    tip.append(date);
    view.forEach((s, si) => {
      const p = s.points[nearestIndex(s.points, t)];
      const dot = dots[si];
      if (!p) return;
      dot.style.display = 'block';
      dot.style.left = `${layout!.x(toTime(p[0]))}px`;
      dot.style.top = `${layout!.y(p[1])}px`;
      const row = el('div', `tt-row s${s.slot}`);
      const key = document.createElement('i');
      const b = document.createElement('b');
      b.textContent = fmtValue(p[1], cfg.format);
      const lbl = document.createElement('span');
      lbl.textContent = s.label;
      row.append(key, b, lbl);
      tip.append(row);
    });
    tip.style.display = 'block';
    const tw = tip.offsetWidth;
    const left = x + 14 + tw > width ? x - 14 - tw : x + 14;
    tip.style.left = `${Math.max(0, left)}px`;
    tip.style.top = `${layout.top}px`;
  };
  const hide = () => {
    idx = -1;
    tip.style.display = 'none';
    xhair.style.display = 'none';
    dots.forEach((d) => (d.style.display = 'none'));
  };

  plot.addEventListener('pointermove', (e) => {
    if (!layout || !view[0]) return;
    const r = plot.getBoundingClientRect();
    const px = e.clientX - r.left;
    const t = layout.t0 + ((px - layout.left) / (layout.right - layout.left)) * (layout.t1 - layout.t0);
    show(nearestIndex(view[0].points, t));
  });
  plot.addEventListener('pointerleave', hide);
  plot.addEventListener('keydown', (e) => {
    if (!view[0]) return;
    const n = view[0].points.length;
    const step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') show(idx < 0 ? n - 1 : idx - step);
    else if (e.key === 'ArrowRight') show(idx < 0 ? n - 1 : idx + step);
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(n - 1);
    else if (e.key === 'Escape') hide();
    else return;
    e.preventDefault();
  });
  plot.addEventListener('blur', hide);

  root.querySelectorAll<HTMLButtonElement>('[data-range]').forEach((b) => {
    b.addEventListener('click', () => {
      range = b.dataset.range!;
      root.querySelectorAll<HTMLButtonElement>('[data-range]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render();
    });
  });

  new ResizeObserver(() => {
    if (Math.abs(plot.clientWidth - width) > 4) render();
  }).observe(plot);
  render();
}

function setupBar(plot: HTMLElement, cfg: BarCfg) {
  let width = 0;
  let layout: ReturnType<typeof barLayout> | null = null;
  const tip = el('div', 'tooltip');
  let idx = -1;
  const labelFn = (k: string) => monthShortYear(k);

  const render = () => {
    width = Math.max(280, Math.round(plot.clientWidth));
    const opts = { points: cfg.points, width, height: heightFor(cfg.height, width), format: cfg.format, slot: cfg.slot, label: labelFn, labelIdx: [cfg.points.length - 1] };
    plot.innerHTML = renderBarChart(opts);
    layout = barLayout(opts);
    plot.append(tip);
    hide();
  };
  const show = (i: number) => {
    if (!layout) return;
    idx = Math.max(0, Math.min(cfg.points.length - 1, i));
    const [k, v] = cfg.points[idx];
    plot.querySelectorAll('.bar').forEach((b) => b.classList.toggle('dim', Number((b as SVGElement).dataset.i) !== idx));
    tip.replaceChildren();
    const d = el('div', 'tt-date');
    d.textContent = monthYear(k, true);
    const row = el('div', `tt-row s${cfg.slot ?? 1}`);
    const key = document.createElement('i');
    const b = document.createElement('b');
    b.textContent = fmtValue(v, cfg.format);
    row.append(key, b);
    tip.append(d, row);
    tip.style.display = 'block';
    const x = layout.cx(idx);
    const tw = tip.offsetWidth;
    tip.style.left = `${Math.max(0, x + 12 + tw > width ? x - 12 - tw : x + 12)}px`;
    tip.style.top = `${layout.top}px`;
  };
  const hide = () => {
    idx = -1;
    tip.style.display = 'none';
    plot.querySelectorAll('.bar').forEach((b) => b.classList.remove('dim'));
  };
  plot.addEventListener('pointermove', (e) => {
    if (!layout) return;
    const r = plot.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - layout.left) / layout.band);
    if (i < 0 || i >= cfg.points.length) return hide();
    show(i);
  });
  plot.addEventListener('pointerleave', hide);
  plot.addEventListener('blur', hide);
  plot.addEventListener('keydown', (e) => {
    const n = cfg.points.length;
    if (e.key === 'ArrowLeft') show(idx < 0 ? n - 1 : idx - 1);
    else if (e.key === 'ArrowRight') show(idx < 0 ? n - 1 : idx + 1);
    else if (e.key === 'Escape') hide();
    else return;
    e.preventDefault();
  });
  new ResizeObserver(() => {
    if (Math.abs(plot.clientWidth - width) > 4) render();
  }).observe(plot);
  render();
}

document.querySelectorAll<HTMLElement>('[data-chart]').forEach((root) => {
  const plot = root.querySelector<HTMLElement>('.chart');
  const cfgEl = root.querySelector('script[type="application/json"]');
  if (!plot || !cfgEl) return;
  const cfg: Cfg = JSON.parse(cfgEl.textContent || '{}');
  if (cfg.type === 'bar') setupBar(plot, cfg);
  else setupLine(root, plot, cfg);
});

