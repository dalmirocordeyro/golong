// ─────────────────────────────────────────────────────────────
//  Letras y bonos del Tesoro a tasa fija en pesos (LECAP / BONCAP).
//
//  data912 publica el precio, pero no el vencimiento ni cuánto paga
//  cada letra al final. Esos dos datos se fijan en la licitación y no
//  cambian nunca, así que van acá a mano.
//
//  CÓMO AGREGAR UNA LETRA NUEVA (después de cada licitación del Tesoro):
//   1. ticker: como figura en la bolsa (p. ej. S30S6).
//   2. vencimiento: AAAA-MM-DD.
//   3. pagoFinal: cuántos pesos paga al vencimiento cada 100 de valor
//      nominal. Es el "valor técnico final" o "a recibir al vencimiento
//      (×100)" que publican el Tesoro y los brokers.
//   Las letras ya vencidas se pueden borrar: el sitio igual las ignora.
// ─────────────────────────────────────────────────────────────

export interface LetraInfo {
  ticker: string;
  tipo: 'LECAP' | 'BONCAP';
  /** AAAA-MM-DD */
  vencimiento: string;
  /** Pesos que paga al vencimiento cada 100 VN */
  pagoFinal: number;
}

export const LETRAS: LetraInfo[] = [
  { ticker: 'S30S6', tipo: 'LECAP', vencimiento: '2026-09-30', pagoFinal: 117.53 },
  { ticker: 'S16O6', tipo: 'LECAP', vencimiento: '2026-10-16', pagoFinal: 105.27 },
  { ticker: 'S30O6', tipo: 'LECAP', vencimiento: '2026-10-30', pagoFinal: 135.28 },
  { ticker: 'S13N6', tipo: 'LECAP', vencimiento: '2026-11-13', pagoFinal: 109.65 },
  { ticker: 'S30N6', tipo: 'LECAP', vencimiento: '2026-11-30', pagoFinal: 129.89 },
  { ticker: 'T15E7', tipo: 'BONCAP', vencimiento: '2027-01-15', pagoFinal: 161.10 },
  { ticker: 'S29E7', tipo: 'LECAP', vencimiento: '2027-01-29', pagoFinal: 111.68 },
  { ticker: 'T30A7', tipo: 'BONCAP', vencimiento: '2027-04-30', pagoFinal: 157.34 },
  { ticker: 'T31Y7', tipo: 'BONCAP', vencimiento: '2027-05-31', pagoFinal: 151.56 },
  { ticker: 'T30J7', tipo: 'BONCAP', vencimiento: '2027-06-30', pagoFinal: 156.04 },
];

export const LETRA_INFO: Record<string, LetraInfo> = Object.fromEntries(LETRAS.map((l) => [l.ticker, l]));
