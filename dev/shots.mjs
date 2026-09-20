// Capturas de pantalla para revisar el diseño.
// Uso: node dev/shots.mjs [/ruta ...] [--dark] [--mobile] [--full]
// Requiere: npm run build:mock (dist/) y node dev/mock-server.mjs corriendo.
import http from 'node:http';
import { createReadStream, existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright')); }

const DIST = new URL('../dist/', import.meta.url).pathname;
const OUT = process.env.SHOTS_DIR || '/tmp/golong-shots';
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const paths = args.filter((a) => a.startsWith('/'));
const dark = args.includes('--dark');
const mobile = args.includes('--mobile');
const full = args.includes('--full');
const segs = Number((args.find((a) => a.startsWith('--segs=')) || '--segs=0').split('=')[1]);
const MOCK = process.env.MOCK_UPSTREAM || 'http://localhost:4599';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(DIST, p);
  if (p.endsWith('/')) f = join(f, 'index.html');
  else if (!extname(p) && existsSync(f + '.html')) f += '.html';
  if (!existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); return createReadStream(join(DIST, '404.html')).on('error', () => res.end('404')).pipe(res); }
  res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' });
  createReadStream(f).pipe(res);
}).listen(4321);

const browser = await playwright.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
  deviceScaleFactor: mobile ? 2 : 1,
  colorScheme: dark ? 'dark' : 'light',
  locale: 'es-AR',
  timezoneId: 'America/Argentina/Buenos_Aires',
});
// Todo lo externo se bloquea (Playwright prioriza la última ruta registrada)...
await ctx.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
// ...y las APIs reales se redirigen al mock (el contenedor no tiene salida a internet).
await ctx.route(/^https:\/\/(dolarapi\.com|api\.coingecko\.com|data912\.com|api\.argentinadatos\.com)\//, async (route) => {
  const u = new URL(route.request().url());
  try {
    const r = await fetch(`${MOCK}/${u.host}${u.pathname}${u.search}`);
    await route.fulfill({ status: r.status, body: await r.text(), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
  } catch { await route.abort(); }
});

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
page.on('requestfailed', (r) => errors.push('FALLÓ ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });

for (const p of paths.length ? paths : ['/']) {
  await page.goto(`http://localhost:4321${p}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const name = `${p.replace(/\//g, '_') || '_'}${mobile ? '-m' : ''}${dark ? '-dark' : ''}.png`;
  if (segs > 0) {
    const vh = page.viewportSize().height;
    for (let i = 0; i < segs; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), i * (vh - 60));
      await page.waitForTimeout(150);
      await page.screenshot({ path: join(OUT, name.replace('.png', `-${i}.png`)) });
    }
  } else {
    await page.screenshot({ path: join(OUT, name), fullPage: full });
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`${p} → ${join(OUT, name)}${overflow > 0 ? `  ⚠ desborde horizontal ${overflow}px` : ''}`);
}
if (errors.length) console.log('Errores de consola:\n' + errors.join('\n'));
await browser.close();
server.close();
