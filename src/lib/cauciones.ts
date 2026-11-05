// Armado de la página de cauciones. Lo usan el build y el navegador (al actualizar en vivo).
import { compact, dmy, num } from './format';
import type { Caucion } from './types';

export const GRUPOS: { moneda: Caucion['moneda']; titulo: string; cur: string }[] = [
  { moneda: 'ARS', titulo: 'En pesos', cur: '$' },
  { moneda: 'USD', titulo: 'En dólares MEP', cur: 'US$' },
  { moneda: 'CCL', titulo: 'En dólares cable', cur: 'US$' },
];

/** Tasa efectiva anual a partir de la nominal, capitalizando al mismo plazo. */
export function tea(tna: number, dias: number): number {
  return ((1 + (tna / 100) * (dias / 365)) ** (365 / dias) - 1) * 100;
}

const tasa = (v: number | null) => (v == null ? '—' : `${num(v, 2)}%`);
const plazo = (d: number) => (d === 1 ? '1 día' : `${d} días`);

export function filasHtml(rows: Caucion[], cur: string): string {
  if (!rows.length) return '<tr><td colspan="6" class="muted" style="text-align:left">Sin operaciones por ahora.</td></tr>';
  return rows
    .map(
      (c) => `<tr>
  <th scope="row">${plazo(c.dias)}</th>
  <td class="opt">${dmy(c.vence)}</td>
  <td class="num"><b>${tasa(c.tna)}</b></td>
  <td class="num opt">${tasa(tea(c.tna, c.dias))}</td>
  <td class="num">${tasa(c.prom)}</td>
  <td class="num opt">${cur}&nbsp;${compact(c.monto)}</td>
</tr>`,
    )
    .join('');
}

/** Las tres tasas de referencia de arriba de la página. */
export function destacadas(all: Caucion[]) {
  const de = (m: Caucion['moneda']) => all.filter((c) => c.moneda === m);
  const masOperada = (rows: Caucion[]) => rows.reduce<Caucion | null>((a, c) => (!a || c.monto > a.monto ? c : a), null);
  const cerca30 = de('ARS').filter((c) => c.dias >= 20 && c.dias <= 40);
  return [
    { label: 'Pesos a 1 día', c: de('ARS').find((c) => c.dias === 1) ?? masOperada(de('ARS')) },
    { label: 'Pesos a 30 días', c: masOperada(cerca30) },
    { label: 'Dólares a 1 día', c: de('USD').find((c) => c.dias === 1) ?? masOperada(de('USD')) },
  ];
}

export function destacadaHtml(c: Caucion | null): { value: string; note: string } {
  if (!c) return { value: '—', note: 'Sin operaciones por ahora.' };
  const cur = c.moneda === 'ARS' ? '$' : 'US$';
  return {
    value: `${num(c.tna, 2)}% <small>TNA</small>`,
    note: `${plazo(c.dias)} · TEA ${num(tea(c.tna, c.dias), 2)}% · operado ${cur} ${compact(c.monto)}`,
  };
}
