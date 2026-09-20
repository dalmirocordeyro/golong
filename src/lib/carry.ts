// Matemática del carry trade: letras en pesos contra dólar MEP.
// Sin dependencias del navegador ni de Node: se usa en el build y en el cliente.
import type { Letra } from './types';

/**
 * Fecha en la que se liquida una compra de hoy (plazo 24 horas: el día hábil
 * siguiente). Es la fecha desde la que el mercado cuenta el rendimiento.
 */
export function fechaLiquidacion(desde: Date = new Date()): number {
  let t = Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate()) + 86400000;
  while ([0, 6].includes(new Date(t).getUTCDay())) t += 86400000;
  return t;
}

/** Días entre la liquidación de una compra de hoy y el vencimiento (mínimo 1). */
export function diasAlVto(vencimiento: string, desde: Date = new Date()): number {
  const [y, m, d] = vencimiento.split('-').map(Number);
  return Math.max(1, Math.round((Date.UTC(y, m - 1, d) - fechaLiquidacion(desde)) / 86400000));
}

export interface Rendimiento {
  dias: number;
  /** Cuánto paga al vencimiento por cada peso invertido, menos 1 */
  directo: number;
  tem: number;
  tna: number;
  tea: number;
}

export function rendimiento(l: Pick<Letra, 'price' | 'pagoFinal' | 'vencimiento'>, desde?: Date): Rendimiento {
  const dias = diasAlVto(l.vencimiento, desde);
  const directo = l.pagoFinal / l.price - 1;
  return {
    dias,
    directo,
    tem: (1 + directo) ** (30 / dias) - 1,
    tna: (directo * 365) / dias,
    tea: (1 + directo) ** (365 / dias) - 1,
  };
}

/**
 * Dólar MEP de equilibrio: el valor al que tendría que llegar el MEP en el
 * vencimiento para que la letra rinda lo mismo que haber comprado dólares hoy.
 */
export function mepEquilibrio(l: Pick<Letra, 'price' | 'pagoFinal'>, mepHoy: number): number {
  return (mepHoy * l.pagoFinal) / l.price;
}

/** Devaluación mensual del MEP que deja el carry empatado. */
export function devalMensualEquilibrio(directo: number, dias: number): number {
  return (1 + directo) ** (30 / dias) - 1;
}

export interface Escenario {
  /** Pesos cobrados al vencimiento */
  pesosFinal: number;
  /** Dólares que comprarías hoy con el mismo monto */
  usdHoy: number;
  /** Dólares que comprás al vencimiento con lo cobrado */
  usdFinal: number;
  /** Diferencia en dólares (positiva: ganó el carry) */
  usdDif: number;
  /** Diferencia en % sobre los dólares de hoy */
  usdPct: number;
}

export function escenario(
  l: Pick<Letra, 'price' | 'pagoFinal'>,
  montoPesos: number,
  mepHoy: number,
  mepFinal: number,
): Escenario {
  const pesosFinal = (montoPesos * l.pagoFinal) / l.price;
  const usdHoy = mepHoy > 0 ? montoPesos / mepHoy : 0;
  const usdFinal = mepFinal > 0 ? pesosFinal / mepFinal : 0;
  return {
    pesosFinal,
    usdHoy,
    usdFinal,
    usdDif: usdFinal - usdHoy,
    usdPct: usdHoy > 0 ? usdFinal / usdHoy - 1 : 0,
  };
}

/** MEP proyectado si se devalúa `mensual` (0,02 = 2%) durante `dias`. */
export function mepProyectado(mepHoy: number, mensual: number, dias: number): number {
  return mepHoy * (1 + mensual) ** (dias / 30);
}
