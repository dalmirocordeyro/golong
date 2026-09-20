// Genera íconos PNG y la imagen para redes (og.png) en public/.
// Uso: node dev/make-images.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(join(execSync('npm root -g').toString().trim(), 'playwright')); }
const PUB = new URL('../public/', import.meta.url).pathname;
const svg = readFileSync(join(PUB, 'favicon.svg'), 'utf8');
const cfg = readFileSync(new URL('../src/site.config.ts', import.meta.url), 'utf8');
const pick = (k) => cfg.match(new RegExp(`${k}:\\s*'([^']*)'`))?.[1] ?? '';
const name = pick('name');
const domain = pick('domain');
const author = cfg.match(/author:\s*{\s*name:\s*'([^']*)'/)?.[1] ?? '';

const browser = await playwright.chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();

for (const [file, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#0b0b0b">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `).replace('rx="9"', 'rx="0"')}</body></html>`);
  await page.screenshot({ path: join(PUB, file) });
}

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<!doctype html><html><head><style>
  body{margin:0;width:1200px;height:630px;background:#0d0d0d;color:#fff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;justify-content:space-between;padding:72px 80px;box-sizing:border-box}
  .brand{display:flex;align-items:center;gap:22px;font-size:64px;font-weight:800;letter-spacing:-2px}
  h1{font-size:58px;line-height:1.1;margin:0;font-weight:750;letter-spacing:-1.5px;max-width:1040px}
  h1 span{color:#7ab0f0}
  .foot{display:flex;justify-content:space-between;font-size:28px;color:#c3c2b7}
  .chart{position:absolute;right:80px;top:70px;opacity:.9}
</style></head><body>
  <div class="brand">${svg.replace('<svg ', '<svg width="72" height="72" ').replace('fill="#0b0b0b"', 'fill="#2a2a28"')}<span>${name}</span></div>
  <svg class="chart" width="360" height="120" viewBox="0 0 360 120"><path d="M0 100 L40 92 L80 96 L120 70 L160 76 L200 50 L240 58 L280 30 L320 36 L360 10" fill="none" stroke="#3987e5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  <h1>Dólar hoy, <span>riesgo país</span> y mercados de Argentina, en vivo.</h1>
  <div class="foot"><span>${domain}</span><span>por ${author}</span></div>
</body></html>`);
await page.screenshot({ path: join(PUB, 'og.png') });
await browser.close();
console.log('Imágenes generadas en public/');
