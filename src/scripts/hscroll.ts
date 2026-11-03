// Franjas con desplazamiento horizontal (menú de secciones, cotizaciones y tablas anchas).
// - Degradé en el borde que tiene más contenido, para que se note que se puede deslizar.
// - Con mouse (menú y cotizaciones): la rueda mueve hacia los costados, se puede arrastrar
//   y aparecen flechas. En pantallas táctiles queda el deslizamiento normal con el dedo.

const fine = matchMedia('(hover: hover) and (pointer: fine)');

function estado(el: HTMLElement, caja: HTMLElement) {
  const max = el.scrollWidth - el.clientWidth;
  caja.classList.toggle('can-l', max > 1 && el.scrollLeft > 1);
  caja.classList.toggle('can-r', max > 1 && el.scrollLeft < max - 1);
}

function preparar(el: HTMLElement, conControles: boolean) {
  // Contenedor para las flechas y el degradé. Si la franja es la que centra el contenido
  // (.wrap), el contenedor toma ese papel para que las flechas queden alineadas con el resto.
  const caja = document.createElement('div');
  caja.className = 'hs';
  if (el.classList.contains('wrap')) {
    el.classList.remove('wrap');
    caja.classList.add('wrap');
  }
  el.before(caja);
  caja.append(el);

  const actualizar = () => estado(el, caja);
  el.addEventListener('scroll', actualizar, { passive: true });
  new ResizeObserver(actualizar).observe(el);
  actualizar();

  if (!conControles) return;
  caja.classList.add('hs-ctrl');

  const mover = (dir: number) => el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  for (const [dir, clase, etiqueta, flecha] of [
    [-1, 'prev', 'Ver anteriores', 'M15 18l-6-6 6-6'],
    [1, 'next', 'Ver siguientes', 'M9 6l6 6-6 6'],
  ] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `hs-btn ${clase}`;
    b.setAttribute('aria-label', etiqueta);
    b.tabIndex = -1; // con teclado ya se recorre link por link
    b.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${flecha}"/></svg>`;
    b.addEventListener('click', () => mover(dir));
    caja.append(b);
  }

  // Rueda vertical → desplazamiento horizontal, salvo en los extremos (ahí sigue la página).
  el.addEventListener(
    'wheel',
    (e) => {
      if (!fine.matches || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    },
    { passive: false },
  );

  // Arrastrar con el mouse. Si hubo arrastre, se cancela el clic para no abrir un link sin querer.
  let inicioX = 0;
  let inicioScroll = 0;
  let arrastrando = false;
  let apretado = false;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    apretado = true;
    arrastrando = false;
    inicioX = e.clientX;
    inicioScroll = el.scrollLeft;
  });
  el.addEventListener('pointermove', (e) => {
    if (!apretado) return;
    const dx = e.clientX - inicioX;
    if (!arrastrando && Math.abs(dx) > 5) {
      arrastrando = true;
      el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);
    }
    if (arrastrando) el.scrollLeft = inicioScroll - dx;
  });
  const soltar = () => {
    apretado = false;
    el.classList.remove('dragging');
  };
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
  el.addEventListener(
    'click',
    (e) => {
      if (arrastrando) {
        e.preventDefault();
        e.stopPropagation();
        arrastrando = false;
      }
    },
    true,
  );
  el.addEventListener('dragstart', (e) => e.preventDefault());
}

document.querySelectorAll<HTMLElement>('.strip-row, .nav-mobile').forEach((el) => preparar(el, true));
document.querySelectorAll<HTMLElement>('.tbl-wrap').forEach((el) => preparar(el, false));
