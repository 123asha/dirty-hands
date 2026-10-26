// the studio film: any element with data-film="<YouTube id>" opens it over the page, white all round, playing; Close, a click beside it or Escape take you back to where you were
(() => {
  const css = document.createElement('style');
  css.textContent = `.film { position: fixed; inset: 0; z-index: 4000; background: #fff; display: grid; place-items: center; opacity: 0; transition: opacity .5s cubic-bezier(.2,.8,.2,1); }
    .film.on { opacity: 1; }
    .film .fr { width: min(calc(100vw - 32px), calc((100svh - 120px) * 16 / 9)); aspect-ratio: 16 / 9; background: #f2f2f2; translate: 0 16px; transition: translate .6s cubic-bezier(.2,.8,.2,1); }
    .film.on .fr { translate: 0 0; }
    .film iframe { display: block; width: 100%; height: 100%; border: 0; }
    .film .x { all: unset; cursor: pointer; position: absolute; left: 16px; top: calc(14px + env(safe-area-inset-top)); font-family: "CoFo Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; font-size: 15px; line-height: 19px; letter-spacing: -.01em; display: flex; align-items: center; gap: 6px; }
    [data-film] { cursor: pointer; }`;
  document.head.append(css);
  let box = null, back = null;
  function close() {
    if (!box) return; const b = box; box = null; b.classList.remove('on');
    setTimeout(() => b.remove(), 500); document.documentElement.style.overflow = ''; if (typeof lenis !== 'undefined' && lenis && lenis.start) lenis.start(); removeEventListener('keydown', back);
  }
  function open(id) {
    if (box) return;
    box = document.createElement('div'); box.className = 'film'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Film about the studio');
    box.innerHTML = `<button type="button" class="x">Close<svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.1"/></svg></button><div class="fr"><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1" title="DirtyHands, studio of art ceramics" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
    box.addEventListener('click', e => { if (!e.target.closest('.fr')) close(); });
    document.body.append(box); requestAnimationFrame(() => requestAnimationFrame(() => box && box.classList.add('on')));
    document.documentElement.style.overflow = 'hidden'; if (typeof lenis !== 'undefined' && lenis && lenis.stop) lenis.stop();
    back = e => { if (e.key === 'Escape') close(); }; addEventListener('keydown', back);
  }
  window.openFilm = open;
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-film]'); if (!el) return; e.preventDefault(); e.stopPropagation(); open(el.dataset.film); }, true);
})();
