/** [fecha "YYYY-MM-DD", valor] */
export type Point = [string, number];

export type DollarSlug = 'blue' | 'oficial' | 'mep' | 'ccl' | 'cripto' | 'tarjeta' | 'mayorista';

export interface Dollar {
  slug: DollarSlug;
  /** clave en DolarApi / ArgentinaDatos */
  casa: string;
  nombre: string;
  nombreCorto: string;
  compra: number | null;
  venta: number;
  /** ISO de la última actualización de la fuente */
  fecha: string;
  /** Cierre anterior (venta) y su fecha */
  prev: number | null;
  prevFecha: string | null;
  varPct: number | null;
  /** Historial de venta: diario el último año y semanal hacia atrás */
  history: Point[];
}

export interface Riesgo {
  valor: number;
  fecha: string;
  prev: number | null;
  prevFecha: string | null;
  varPts: number | null;
  history: Point[];
}

export interface Inflacion {
  mensual: Point[];
  interanual: Point[];
  ultimo: Point;
  ultimoInteranual: Point;
  /** acumulado en el año calendario del último dato */
  acumuladoAnio: number;
  mesesAcumulados: number;
}

export interface Quote {
  symbol: string;
  price: number;
  pct: number;
  /** monto operado en la moneda del precio */
  monto: number;
  bid: number | null;
  ask: number | null;
}

export interface Bond extends Quote {
  /** precio en dólares (especie D) si existe */
  priceUsd: number | null;
  pctUsd: number | null;
  /** MEP implícito = precio ARS / precio USD */
  mep: number | null;
  ley: 'NY' | 'AR' | null;
  nombre: string;
}

/** Letra o bono del Tesoro a tasa fija en pesos, con su precio de mercado. */
export interface Letra {
  ticker: string;
  tipo: 'LECAP' | 'BONCAP';
  /** AAAA-MM-DD */
  vencimiento: string;
  /** Pesos que paga al vencimiento cada 100 VN */
  pagoFinal: number;
  /** Precio de mercado cada 100 VN */
  price: number;
  pct: number;
  /** Monto operado en pesos */
  monto: number;
}

export interface Crypto {
  id: string;
  symbol: string;
  name: string;
  price: number;
  pct24h: number | null;
  pct7d: number | null;
  mcap: number | null;
  volume: number | null;
  high24h: number | null;
  low24h: number | null;
}

export interface FxRate {
  moneda: string;
  nombre: string;
  compra: number;
  venta: number;
  fecha: string;
}

export interface PlazoFijo {
  entidad: string;
  tna: number;
  tnaNoClientes: number | null;
  enlace: string | null;
}

export type SourceKey = 'dolarapi' | 'argentinadatos' | 'data912' | 'coingecko';

export interface SourceStatus {
  ok: boolean;
  /** true si se usaron datos de un build anterior porque la fuente falló */
  stale: boolean;
  error?: string;
}

export interface SiteData {
  generatedAt: string;
  dollars: Record<DollarSlug, Dollar>;
  riesgo: Riesgo;
  inflacion: Inflacion;
  stocks: Quote[];
  panelLider: string[];
  bonds: Bond[];
  bondsPesos: Quote[];
  letras: Letra[];
  cedears: Quote[];
  adrs: Quote[];
  crypto: Crypto[];
  fx: FxRate[];
  plazoFijo: PlazoFijo[];
  sources: Record<SourceKey, SourceStatus>;
}
