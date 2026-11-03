// Riesgo país y compras de divisas del BCRA: series mensuales alineadas y lecturas
// que se recalculan solas en cada actualización del sitio.
import type { ComprasBcra, Point } from './types';
import { dmy, monthYear, num } from './format';

export interface MesCruce {
  /** Clave del mes: AAAA-MM-01 */
  mes: string;
  /** Riesgo país promedio del mes (puntos básicos) */
  riesgo: number | null;
  /** Compras netas del BCRA en el mes (millones de USD); negativo = ventas */
  compras: number | null;
  /** El mes todavía no tiene todos sus datos publicados */
  parcial: boolean;
}

export interface Lectura {
  titulo: string;
  valor: string;
  detalle: string;
}

const mesDe = (fecha: string) => `${fecha.slice(0, 7)}-01`;

/** Millones de dólares: "US$ 1.300 M", "−US$ 45 M". */
export function musd(v: number): string {
  return `${v < 0 ? '−' : ''}US$ ${num(Math.abs(v), 0)} M`;
}

/** "+35 pts", "−22 pts" */
function pts(v: number): string {
  const r = Math.round(v);
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${num(Math.abs(r), 0)} pts`;
}

/** Último día hábil (lunes a viernes) del mes de la fecha dada. */
function ultimoHabil(fecha: string): string {
  const [y, m] = fecha.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 0, 12));
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Promedio mensual del riesgo país. */
export function riesgoMensual(history: Point[]): Map<string, number> {
  const acc = new Map<string, { s: number; n: number }>();
  for (const [f, v] of history) {
    const k = mesDe(f);
    const a = acc.get(k) ?? { s: 0, n: 0 };
    a.s += v;
    a.n += 1;
    acc.set(k, a);
  }
  return new Map([...acc].map(([k, a]) => [k, a.s / a.n]));
}

/** Los últimos `meses` meses que terminan en el mes del último dato del BCRA. */
export function cruceMensual(riesgo: Point[], bcra: ComprasBcra, meses = 24): MesCruce[] {
  const r = riesgoMensual(riesgo);
  const c = new Map(bcra.mensual);
  const ultimo = mesDe(bcra.fecha);
  let [y, m] = ultimo.split('-').map(Number);
  const out: MesCruce[] = [];
  for (let i = 0; i < meses; i++) {
    const k = `${y}-${String(m).padStart(2, '0')}-01`;
    out.unshift({ mes: k, riesgo: r.get(k) ?? null, compras: c.get(k) ?? null, parcial: false });
    if (--m === 0) {
      m = 12;
      y--;
    }
  }
  // Se descartan los meses del principio sin datos de alguna de las dos series.
  while (out.length && (out[0].riesgo == null || out[0].compras == null)) out.shift();
  if (out.length) out[out.length - 1].parcial = bcra.fecha < ultimoHabil(bcra.fecha);
  return out;
}

/** Tres lecturas en lenguaje simple. Describen lo que pasó; no hacen pronósticos ni recomendaciones. */
export function lecturas(cruce: MesCruce[], bcra: ComprasBcra): Lectura[] {
  const out: Lectura[] = [];

  // 1) Lo que va del año
  const anio = bcra.fecha.slice(0, 4);
  const delAnio = bcra.diario.filter((p) => p[0].startsWith(anio));
  if (delAnio.length) {
    const total = delAnio.reduce((s, p) => s + p[1], 0);
    const conCompras = delAnio.filter((p) => p[1] > 0).length;
    const conVentas = delAnio.filter((p) => p[1] < 0).length;
    out.push({
      titulo: total >= 0 ? `Compras netas en ${anio}` : `Ventas netas en ${anio}`,
      valor: musd(Math.abs(total)),
      detalle: `${conCompras} ruedas con compras${conVentas ? ` y ${conVentas} con ventas` : ''}, al ${dmy(bcra.fecha)}.`,
    });
  }

  // 2) El último mes frente al anterior
  const ult = cruce[cruce.length - 1];
  const ant = cruce[cruce.length - 2];
  if (ult?.compras != null) {
    const tipo = ult.compras > 0 ? 'Compras netas del mes' : ult.compras < 0 ? 'Ventas netas del mes' : 'Sin compras ni ventas en el mes';
    let detalle = `${tipo}.`;
    if (ult.riesgo != null && ant?.riesgo != null) {
      const d = ult.riesgo - ant.riesgo;
      const mesAnt = monthYear(ant.mes, true).split(' ')[0];
      detalle += Math.abs(d) < 1
        ? ` El riesgo país promedio quedó igual que en ${mesAnt}.`
        : ` El riesgo país promedio ${d > 0 ? 'subió' : 'bajó'} ${num(Math.abs(Math.round(d)), 0)} puntos frente a ${mesAnt}.`;
    }
    out.push({
      titulo: `${monthYear(ult.mes, true).replace(/^./, (c) => c.toUpperCase())}${ult.parcial ? ' (parcial)' : ''}`,
      valor: musd(Math.abs(ult.compras)),
      detalle,
    });
  }

  // 3) Cómo se movió el riesgo país en los meses con y sin compras
  const cambios: { compras: number; d: number }[] = [];
  for (let i = 1; i < cruce.length; i++) {
    const a = cruce[i - 1];
    const b = cruce[i];
    if (a.riesgo != null && b.riesgo != null && b.compras != null) cambios.push({ compras: b.compras, d: b.riesgo - a.riesgo });
  }
  const con = cambios.filter((x) => x.compras > 0);
  const sin = cambios.filter((x) => x.compras <= 0);
  const prom = (xs: { d: number }[]) => xs.reduce((s, x) => s + x.d, 0) / xs.length;
  if (con.length >= 3 && sin.length >= 3) {
    out.push({
      titulo: 'Riesgo país en meses con compras',
      valor: `${pts(prom(con))} por mes`,
      detalle: `Promedio de ${con.length} meses. En los ${sin.length} meses sin compras netas: ${pts(prom(sin))} por mes.`,
    });
  }
  return out;
}
