import { arParts, relativeTime, shortDateTime } from '../lib/format';

export function refreshTimes(root: ParentNode = document) {
  const now = new Date();
  root.querySelectorAll<HTMLTimeElement>('time[data-rel]').forEach((t) => {
    const iso = t.dateTime;
    if (!iso) return;
    const ageH = (now.getTime() - new Date(iso).getTime()) / 36e5;
    t.textContent = ageH < 12 ? relativeTime(iso, now) : shortDateTime(iso);
    t.title = shortDateTime(iso);
  });
}

const WD: Record<string, number> = { dom: 0, lun: 1, mar: 2, mié: 3, mie: 3, jue: 4, vie: 5, sáb: 6, sab: 6 };

/** Horario de referencia: lunes a viernes de 10 a 17 (hora argentina). No contempla feriados. */
export function marketOpen(now = new Date()): boolean {
  const p = arParts(now);
  const wd = WD[p.weekday.toLowerCase()] ?? now.getDay();
  const mins = Number(p.hour) * 60 + Number(p.minute);
  return wd >= 1 && wd <= 5 && mins >= 600 && mins < 1020;
}

function refreshStatus() {
  const open = marketOpen();
  document.querySelectorAll<HTMLElement>('[data-market-status]').forEach((el) => {
    el.dataset.state = open ? 'open' : 'closed';
    const label = el.querySelector('.lbl');
    if (label) label.textContent = open ? 'Mercado abierto' : 'Mercado cerrado';
    el.title = 'Referencia: lunes a viernes de 10 a 17 h (no contempla feriados)';
  });
}

refreshTimes();
refreshStatus();
setInterval(() => {
  refreshTimes();
  refreshStatus();
}, 30_000);
