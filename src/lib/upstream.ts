// Acceso a las APIs externas durante el build (Node).
// MOCK_UPSTREAM=http://localhost:4599 redirige todo al servidor de pruebas (dev/mock-server.mjs).

const MOCK = process.env.MOCK_UPSTREAM?.replace(/\/$/, '');
const UA = 'golong-build/1.0 (+https://github.com)';

function resolve(url: string): string {
  if (!MOCK) return url;
  const u = new URL(url);
  return `${MOCK}/${u.host}${u.pathname}${u.search}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchJSON<T = unknown>(url: string, { timeoutMs = 20000, retries = 2 } = {}): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(resolve(url), { signal: ctrl.signal, headers: { 'user-agent': UA, accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(800 * (attempt + 1));
    } finally {
      clearTimeout(t);
    }
  }
  const safeUrl = url.replace(/(api_key=)[^&]+/gi, '$1***');
  throw new Error(`No se pudo obtener ${safeUrl}: ${(lastErr as Error)?.message ?? lastErr}`);
}
