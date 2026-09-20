import { SITE } from '../site.config';

export function GET() {
  const body = `User-agent: *\nAllow: /\nDisallow: /data/\n\nSitemap: ${SITE.url}/sitemap-index.xml\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
