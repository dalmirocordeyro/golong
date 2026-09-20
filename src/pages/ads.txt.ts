// ads.txt que exige AdSense. Se genera solo cuando configurás tu ID en site.config.ts.
import { SITE } from '../site.config';

export function GET() {
  const pub = SITE.adsense.client.replace(/^ca-/, '');
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : '# Configurá SITE.adsense.client para generar este archivo\n';
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
