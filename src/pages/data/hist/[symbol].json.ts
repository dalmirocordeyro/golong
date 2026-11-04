// Historia de 5 años de cada CEDEAR (acción original). La página de CEDEARs la pide al tocar una fila.
import type { GetStaticPaths } from 'astro';
import { getSiteData } from '../../../lib/data';
import { getHistories, type Hist } from '../../../lib/hist';

export const getStaticPaths: GetStaticPaths = async () => {
  const data = await getSiteData();
  const hist = await getHistories(data.cedears.map((c) => c.symbol));
  return [...hist.values()].map((h) => ({ params: { symbol: h.symbol }, props: { h } }));
};

export function GET({ props }: { props: { h: Hist } }) {
  const { symbol, yahoo, currency, updated, points } = props.h;
  return new Response(JSON.stringify({ symbol, yahoo, currency, updated, points }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
