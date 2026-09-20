// Fragmentos HTML como texto, para tablas generadas en el build.
import { direction, pct, signedNum } from './format';

export const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ARROWS = {
  up: '<path d="M5 1.5L9 7.5H1z" fill="currentColor"/>',
  down: '<path d="M5 8.5L1 2.5h8z" fill="currentColor"/>',
  flat: '<rect x="1.5" y="4.25" width="7" height="1.5" rx=".75" fill="currentColor"/>',
};

export function deltaHtml(value: number | null, opts: { mode?: 'pct' | 'pts'; plain?: boolean; live?: string } = {}): string {
  const mode = opts.mode ?? 'pct';
  const dir = direction(value, mode === 'pts' ? 0.5 : 0.005);
  const text = mode === 'pts' ? `${signedNum(value, 0)} pts` : pct(value);
  const sr = value == null ? 'sin dato' : dir === 'up' ? 'sube' : dir === 'down' ? 'baja' : 'sin cambios';
  return `<span class="delta${opts.plain ? ' plain' : ''}" data-dir="${dir}" data-mode="${mode}"${opts.live ? ` data-live="${escapeHtml(opts.live)}"` : ''}><svg class="arr" width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">${ARROWS[dir]}</svg><span class="visually-hidden">${sr}</span><span class="dv">${text}</span></span>`;
}
