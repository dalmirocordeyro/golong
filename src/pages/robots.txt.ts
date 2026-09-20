import { SITE } from '../site.config';

export function GET() {
  // En la dirección temporal (*.workers.dev) se bloquea la indexación hasta tener el dominio propio.
  const preview = SITE.url.includes('.workers.dev');
  const body = preview
    ? `User-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\nDisallow: /data/\n\nSitemap: ${SITE.url}/sitemap-index.xml\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
