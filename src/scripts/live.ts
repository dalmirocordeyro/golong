// Actualiza precios en el navegador sin recargar la página.
// Consulta directamente APIs públicas con CORS abierto (DolarApi y CoinGecko),
// así no consume recursos del hosting. Si fallan, queda el dato del HTML.
import { arDateKey, direction, num, pct, price, signedNum, splitPrice } from '../lib/format';
import { COINGECKO_URL, normalizeCrypto } from '../lib/sources-client';
import type { LiveConfig } from '../lib/derived';
import type { Point } from '../lib/types';
import { refreshTimes } from './relative-time';

const cfgEl = document.getElementById('live-config');
const cfg: LiveConfig | null = cfgEl ? JSON.parse(cfgEl.textContent || 'null') : null;

const DOLLAR_MS = 60_000;
const CRYPTO_MS = 120_000;

function setPrice(el: HTMLElement, value: number) {
  const prevV = Number(el.dataset.v);
  el.dataset.v = String(value);
  const cur = el.dataset.cur ?? '$';
  const decimals = el.dataset.dec ? Number(el.dataset.dec) : undefined;
  if (el.dataset.fmt === 'plain' || !el.dataset.fmt) {
    el.textContent = `${cur}${price(value, decimals)}`;
  } else {
    const { int, dec } = splitPrice(value, decimals ?? 2);
    el.replaceChildren();
    if (cur) {
      const c = document.createElement('span');
      c.className = 'cur';
      c.textContent = cur;
      el.append(c);
    }
    el.append(int);
    if (dec) {
      const d = document.createElement('span');
      d.className = 'dec';
      d.textContent = dec;
      el.append(d);
    }
  }
  if (Number.isFinite(prevV) && prevV !== value) flash(el, value > prevV ? 'up' : 'down');
}

function flash(el: HTMLElement, dir: 'up' | 'down') {
  el.dataset.liveFlash = dir;
  setTimeout(() => delete el.dataset.liveFlash, 1400);
}

const ARROWS = {
  up: '<path d="M5 1.5L9 7.5H1z" fill="currentColor"/>',
  down: '<path d="M5 8.5L1 2.5h8z" fill="currentColor"/>',
  flat: '<rect x="1.5" y="4.25" width="7" height="1.5" rx=".75" fill="currentColor"/>',
};
function setDelta(el: HTMLElement, value: number | null) {
  const mode = el.dataset.mode === 'pts' ? 'pts' : 'pct';
  const dir = direction(value, mode === 'pts' ? 0.5 : 0.005);
  el.dataset.dir = dir;
  const svg = el.querySelector('svg.arr');
  if (svg) svg.innerHTML = ARROWS[dir];
  const sr = el.querySelector('.visually-hidden');
  if (sr) sr.textContent = dir === 'up' ? 'sube' : dir === 'down' ? 'baja' : 'sin cambios';
  const dv = el.querySelector('.dv');
  if (dv) dv.textContent = mode === 'pts' ? `${signedNum(value, 0)} pts` : pct(value);
}

const all = (key: string) => document.querySelectorAll<HTMLElement>(`[data-live="${key}"]`);

function lastBefore(points: Point[], key: string): Point | null {
  for (let i = points.length - 1; i >= 0; i--) if (points[i][0] < key) return points[i];
  return null;
}

interface ApiDollar { casa: string; compra: number | null; venta: number; fechaActualizacion: string }

export interface LiveDollar { slug: string; venta: number; compra: number | null; fecha: string; varPct: number | null }

async function updateDollars() {
  if (!cfg) return;
  const res = await fetch('https://dolarapi.com/v1/dolares', { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  const rows: ApiDollar[] = await res.json();
  const out: Record<string, LiveDollar> = {};
  for (const d of cfg.dollars) {
    const r = rows.find((x) => x.casa === d.casa);
    if (!r || !(r.venta > 0)) continue;
    const prev = lastBefore(d.tail, arDateKey(new Date(r.fechaActualizacion)));
    const varPct = prev ? (r.venta / prev[1] - 1) * 100 : null;
    out[d.slug] = { slug: d.slug, venta: r.venta, compra: r.compra, fecha: r.fechaActualizacion, varPct };
    all(`d:${d.slug}:venta`).forEach((el) => setPrice(el, r.venta));
    if (r.compra != null) all(`d:${d.slug}:compra`).forEach((el) => setPrice(el, r.compra!));
    all(`d:${d.slug}:var`).forEach((el) => setDelta(el, varPct));
    if (r.compra != null) all(`d:${d.slug}:spread`).forEach((el) => (el.textContent = `$${price(r.venta - r.compra!)}`));
    all(`d:${d.slug}:time`).forEach((el) => {
      if (el instanceof HTMLTimeElement) el.dateTime = r.fechaActualizacion;
    });
  }
  const of = out.oficial?.venta;
  if (of) {
    for (const s of ['blue', 'mep', 'ccl', 'cripto', 'tarjeta']) {
      const v = out[s]?.venta;
      if (!v) continue;
      const b = (v / of - 1) * 100;
      all(`brecha:${s}`).forEach((el) => (el.textContent = pct(b, 1, false)));
      document.querySelectorAll<HTMLElement>(`[data-live-meter="brecha:${s}"]`).forEach((el) => (el.style.width = `${Math.max(0, Math.min(100, b))}%`));
    }
  }
  document.dispatchEvent(new CustomEvent('golong:dollars', { detail: out }));
  markLive();
}

async function updateCrypto() {
  const res = await fetch(COINGECKO_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  const rows = normalizeCrypto(await res.json());
  for (const c of rows) {
    all(`c:${c.id}:price`).forEach((el) => setPrice(el, c.price));
    all(`c:${c.id}:ars`).forEach((el) => {
      const rate = Number(el.dataset.rate);
      if (rate > 0) setPrice(el, c.price * rate);
    });
    all(`c:${c.id}:pct24h`).forEach((el) => setDelta(el, c.pct24h));
    all(`c:${c.id}:pct7d`).forEach((el) => setDelta(el, c.pct7d));
    all(`c:${c.id}:mcap`).forEach((el) => (el.textContent = `US$${num(c.mcap ?? 0, 0)}`));
  }
  document.dispatchEvent(new CustomEvent('golong:crypto', { detail: rows }));
  markLive();
}

function markLive() {
  const now = new Date().toISOString();
  document.querySelectorAll<HTMLTimeElement>('time[data-live="refreshed"]').forEach((t) => (t.dateTime = now));
  document.querySelectorAll<HTMLElement>('[data-live-status]').forEach((el) => {
    el.hidden = false;
  });
  refreshTimes();
}

function loop(fn: () => Promise<void>, ms: number) {
  let timer: number | undefined;
  let failures = 0;
  const run = async () => {
    if (document.visibilityState !== 'visible') return;
    try {
      await fn();
      failures = 0;
    } catch {
      failures++;
    }
    clearTimeout(timer);
    timer = window.setTimeout(run, ms * Math.min(8, 2 ** failures));
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run();
  });
  // primera actualización apenas carga (el HTML puede tener algunos minutos)
  ('requestIdleCallback' in window ? requestIdleCallback : (f: () => void) => setTimeout(f, 300))(() => run());
}

if (cfg) {
  const has = (prefix: string) => document.querySelector(`[data-live^="${prefix}"]`) || document.querySelector(`[data-live-need~="${prefix}"]`);
  if (has('d:') || has('brecha:')) loop(updateDollars, DOLLAR_MS);
  if (has('c:')) loop(updateCrypto, CRYPTO_MS);
}
