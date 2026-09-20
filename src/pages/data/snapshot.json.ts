// Snapshot completo de los datos. Sirve como respaldo del próximo build si alguna fuente falla.
import { getSiteData } from '../../lib/data';

export async function GET() {
  const data = await getSiteData();
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
