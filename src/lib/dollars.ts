import type { DollarSlug } from './types';

export interface DollarMeta {
  slug: DollarSlug;
  casa: string;
  nombre: string;
  nombreCorto: string;
  /** Una línea para tarjetas */
  resumen: string;
}

/** Orden de aparición en el sitio. */
export const DOLLARS: DollarMeta[] = [
  { slug: 'blue', casa: 'blue', nombre: 'Dólar blue', nombreCorto: 'Blue', resumen: 'Mercado informal, cuevas y arbolitos' },
  { slug: 'oficial', casa: 'oficial', nombre: 'Dólar oficial', nombreCorto: 'Oficial', resumen: 'Promedio de bancos (Banco Nación)' },
  { slug: 'mep', casa: 'bolsa', nombre: 'Dólar MEP', nombreCorto: 'MEP', resumen: 'Compra de bonos en pesos y venta en dólares' },
  { slug: 'ccl', casa: 'contadoconliqui', nombre: 'Dólar CCL', nombreCorto: 'CCL', resumen: 'Contado con liquidación, dólares en el exterior' },
  { slug: 'cripto', casa: 'cripto', nombre: 'Dólar cripto', nombreCorto: 'Cripto', resumen: 'Stablecoins (USDT/USDC) en exchanges' },
  { slug: 'tarjeta', casa: 'tarjeta', nombre: 'Dólar tarjeta', nombreCorto: 'Tarjeta', resumen: 'Consumos en el exterior con tarjeta' },
  { slug: 'mayorista', casa: 'mayorista', nombre: 'Dólar mayorista', nombreCorto: 'Mayorista', resumen: 'Operaciones entre bancos y empresas (A3500)' },
];

export const DOLLAR_BY_SLUG = Object.fromEntries(DOLLARS.map((d) => [d.slug, d])) as Record<DollarSlug, DollarMeta>;
export const DOLLAR_BY_CASA = Object.fromEntries(DOLLARS.map((d) => [d.casa, d])) as Record<string, DollarMeta>;
