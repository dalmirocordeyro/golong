// Servidor de datos falsos para desarrollo sin internet.
// Sirve las mismas rutas que las APIs reales bajo /<host>/<ruta>, usando
// una captura real (dev/fixtures) + historiales sintéticos deterministas.
// Uso: node dev/mock-server.mjs   (luego MOCK_UPSTREAM=http://localhost:4599 npm run build)
import http from 'node:http';
import { readFileSync } from 'node:fs';

const fx = JSON.parse(readFileSync(new URL('./fixtures/snapshot-2026-09-20.json', import.meta.url), 'utf8'));
const PORT = Number(process.env.MOCK_PORT || 4599);
const FAIL = new Set((process.env.MOCK_FAIL || '').split(',').filter(Boolean)); // p.ej. MOCK_FAIL=data912.com

function rng(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

function walkBack(key, endValue, days, yearlyFactor, vol) {
  const r = rng(key);
  const drift = Math.log(yearlyFactor) / 365;
  const out = [endValue];
  let v = endValue;
  for (let i = 1; i < days; i++) {
    const shock = (r() - 0.5) * 2 * vol;
    v = v / Math.exp(drift + shock);
    out.push(v);
  }
  return out.reverse();
}

const TAIL_END = '2026-09-20';
function dollarHistory(casa) {
  const tail = fx.histTail[casa];
  const start = fx.histStart[casa] > '2019-01-02' ? fx.histStart[casa] : '2019-01-02';
  const days = Math.round((new Date(TAIL_END) - new Date(start)) / 864e5) - tail.length + 1;
  const [, c0, v0] = tail[0];
  const ratio = c0 / v0;
  const vol = { blue: 0.012, cripto: 0.012, contadoconliqui: 0.01, bolsa: 0.01 }[casa] ?? 0.004;
  const series = walkBack('d-' + casa, v0, days, 1.45, vol);
  const out = series.slice(0, -1).map((v, i) => ({
    casa, compra: +(v * ratio).toFixed(2), venta: +v.toFixed(2), fecha: addDays(start, i),
  }));
  for (const [fecha, compra, venta] of tail) out.push({ casa, compra, venta, fecha });
  return out;
}

function riesgoHistory() {
  const start = '2019-01-02';
  const tail = fx.rpTail;
  const days = Math.round((new Date(tail[0].fecha) - new Date(start)) / 864e5);
  const r = rng('rp');
  const out = [];
  let v = tail[0].valor;
  const vals = [];
  for (let i = 0; i < days; i++) {
    // sube hacia atrás hasta ~2500 en 2020-2023 y vuelve
    const t = i / days;
    const target = t < 0.25 ? 900 + t * 8000 : t < 0.65 ? 2400 - (t - 0.25) * 1500 : 1800 - (t - 0.65) * 3700;
    v = v + (Math.max(target, 480) - v) * 0.01 + (r() - 0.5) * 40;
    vals.push(Math.max(350, Math.round(v)));
  }
  vals.reverse().forEach((valor, i) => out.push({ valor, fecha: addDays(start, i) }));
  return [...out, ...tail];
}

function expand(rows) {
  return rows.map(([symbol, q_bid, px_bid, px_ask, q_ask, v, q_op, c, pct_change]) => ({ symbol, q_bid, px_bid, px_ask, q_ask, v, q_op, c, pct_change }));
}
function tickerHistory(kind, ticker) {
  const all = [...fx.stocks, ...fx.bonds, ...fx.cedears];
  const row = all.find((x) => x[0] === ticker);
  const end = row ? row[7] : 1000;
  const n = 520;
  const series = walkBack(kind + ticker, end, n, 1.6, 0.02);
  const r = rng('v' + ticker);
  const out = [];
  let d = '2024-10-01';
  let i = 0;
  while (out.length < n) {
    const wd = new Date(d + 'T12:00:00Z').getUTCDay();
    if (wd !== 0 && wd !== 6) {
      const c = series[i++];
      const o = c * (1 + (r() - 0.5) * 0.02);
      out.push({ date: d, o: +o.toFixed(2), h: +(Math.max(o, c) * 1.01).toFixed(2), l: +(Math.min(o, c) * 0.99).toFixed(2), c: +c.toFixed(2), v: Math.round(r() * 5e6), dr: 0, sa: 0.4 });
    }
    d = addDays(d, 1);
  }
  return out;
}

const routes = [
  [/^\/dolarapi\.com\/v1\/dolares$/, () => fx.dol],
  [/^\/dolarapi\.com\/v1\/cotizaciones$/, () => fx.cot],
  [/^\/api\.argentinadatos\.com\/v1\/cotizaciones\/dolares\/([a-z]+)$/, (m) => dollarHistory(m[1])],
  [/^\/api\.argentinadatos\.com\/v1\/finanzas\/indices\/riesgo-pais\/ultimo$/, () => fx.rpu],
  [/^\/api\.argentinadatos\.com\/v1\/finanzas\/indices\/riesgo-pais$/, () => riesgoHistory()],
  [/^\/api\.argentinadatos\.com\/v1\/finanzas\/indices\/inflacion$/, () => fx.inf],
  [/^\/api\.argentinadatos\.com\/v1\/finanzas\/indices\/inflacionInteranual$/, () => fx.ia],
  [/^\/api\.argentinadatos\.com\/v1\/finanzas\/tasas\/plazoFijo$/, () => fx.pf],
  [/^\/data912\.com\/live\/arg_stocks$/, () => expand(fx.stocks)],
  [/^\/data912\.com\/live\/arg_bonds$/, () => expand(fx.bonds)],
  [/^\/data912\.com\/live\/arg_cedears$/, () => expand(fx.cedears)],
  [/^\/data912\.com\/live\/usa_adrs$/, () => expand(fx.adrs.filter((a) => !['MELI', 'GLOB', 'VIST', 'DESP', 'BIOX', 'CAAP'].includes(a[0])))],
  [/^\/data912\.com\/live\/usa_stocks$/, () => expand(fx.adrs.filter((a) => ['MELI', 'GLOB', 'VIST', 'DESP', 'BIOX', 'CAAP'].includes(a[0])))],
  [/^\/data912\.com\/historical\/(stocks|bonds|cedears)\/([A-Z0-9.]+)$/, (m) => tickerHistory(m[1], m[2])],
  [/^\/api\.coingecko\.com\/api\/v3\/coins\/markets$/, () => fx.cg],
];

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const host = url.pathname.split('/')[1];
  if (FAIL.has(host)) { res.writeHead(503); return res.end('mock failure'); }
  for (const [re, fn] of routes) {
    const m = url.pathname.match(re);
    if (m) {
      res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      return res.end(JSON.stringify(fn(m)));
    }
  }
  res.writeHead(404); res.end('not mocked: ' + url.pathname);
}).listen(PORT, () => console.log(`mock upstream en http://localhost:${PORT}`));
