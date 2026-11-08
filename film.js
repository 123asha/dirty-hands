// the studio film: any element with data-film="<YouTube id>" opens it over the page, white all round, playing; Close, a click beside it or Escape take you back to where you were
(() => {
  const css = document.createElement('style');
  css.textContent = `.film { position: fixed; inset: 0; z-index: 4000; background: #fff; display: grid; place-items: center; opacity: 0; transition: opacity .5s cubic-bezier(.2,.8,.2,1); }
    .film.on { opacity: 1; }
    .film .fr { width: min(calc(100vw - 32px), calc((100svh - 120px) * 16 / 9)); aspect-ratio: 16 / 9; background: #f2f2f2; translate: 0 16px; transition: translate .6s cubic-bezier(.2,.8,.2,1); }
    .film.on .fr { translate: 0 0; }
    .film iframe { display: block; width: 100%; height: 100%; border: 0; }
    .film .x { all: unset; cursor: pointer; position: absolute; left: 16px; top: calc(14px + env(safe-area-inset-top)); font-family: "CoFo Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; font-size: 15px; line-height: 19px; letter-spacing: -.01em; display: flex; align-items: center; gap: 6px; }
    [data-film] { cursor: pointer; }
    .fbar { position: absolute; left: 16px; right: 16px; bottom: 14px; height: 32px; z-index: 5; cursor: pointer !important; opacity: 0; transition: opacity .4s cubic-bezier(.2,.8,.2,1); touch-action: none; mix-blend-mode: difference; }   /* inside the picture, clear of its edge (on the edge the white line ran into the white page), and in difference: it reads on the light parts of the picture as well as on the dark */
    [data-inline].playing .fbar { opacity: 1; }
    .fbar i { position: absolute; left: 0; bottom: 0; height: 3px; background: #fff; transition: height .25s cubic-bezier(.2,.8,.2,1); }
    .fbar .fbar-t { right: 0; opacity: .45; } .fbar .fbar-p { right: 0; transform-origin: 0 50%; transform: scaleX(var(--p, 0)); }
    .fbar .fbar-k { left: calc(var(--p, 0) * 100%); width: 2px; margin-left: -1px; height: 15px; transition: none; }
    .fbar:hover i:not(.fbar-k), .fbar.drag i:not(.fbar-k) { height: 6px; }`;   /* the film's slider: a thin white line along its foot, filled as it plays; pointed at, it thickens; click or drag to go to any moment */
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
  // a film shown in the page itself ([data-inline]): our own video file, no player controls on it, only Play under the pointer. It plays silently in its place;
  // Play starts it from the beginning with its sound, where it stands, without moving the page; a second click stops it there, and scrolling past it takes only the sound away
  const vidOf = b => b.querySelector('video');
  const stopInline = (b, hold) => { const v = vidOf(b); if (v) { v.muted = true; if (hold) v.pause(); else v.play().catch(() => {}); } b._playing = false; b.classList.remove('playing'); if (typeof muffle === 'function') muffle(false); };   // scrolled past, only the sound goes and the film plays on; stopped by hand, it holds where it is
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.fbar')) { e.stopPropagation(); return; }   // the slider is not Play
    const b = e.target.closest && e.target.closest('[data-inline]'); if (!b) return; e.preventDefault(); e.stopPropagation(); const v = vidOf(b); if (!v) return;
    if (b._playing) { stopInline(b, true); return; }   // a second click stops it where it stands
    v.currentTime = 0; v.muted = false; v.volume = 1; const go = v.play(); if (go && go.catch) go.catch(() => { v.muted = true; v.play().catch(() => {}); });   // Play: from the beginning, with its sound (a browser that refuses the sound still gets the picture)
    b._playing = true; b._t = performance.now(); b.classList.add('playing'); if (typeof muffle === 'function') muffle(true); }, true);   // while the film speaks, the room's sound goes quiet behind it
  const watch = () => document.querySelectorAll('[data-inline]').forEach(b => { if (b._io) return; const v = vidOf(b); if (!v) return; v.muted = true; v.loop = true; v.playsInline = true;
    const bar = document.createElement('div'); bar.className = 'fbar'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i class="fbar-t"></i><i class="fbar-p"></i><i class="fbar-k"></i>'; b.append(bar);
    const show = () => { if (v.duration) bar.style.setProperty('--p', (v.currentTime / v.duration).toFixed(4)); if (!v.paused) requestAnimationFrame(show); };
    v.addEventListener('play', () => requestAnimationFrame(show)); v.addEventListener('seeked', show); v.addEventListener('timeupdate', show);
    let drag = false; const seek = e => { const r = bar.getBoundingClientRect(), k = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); if (v.duration) { v.currentTime = k * v.duration; bar.style.setProperty('--p', k.toFixed(4)); } };
    bar.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); drag = true; bar.classList.add('drag'); bar.setPointerCapture(e.pointerId); seek(e); });
    bar.addEventListener('pointermove', e => { if (drag) seek(e); });
    const up = e => { if (!drag) return; drag = false; bar.classList.remove('drag'); try { bar.releasePointerCapture(e.pointerId); } catch (_) {} b._t = performance.now(); };
    bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    b._io = new IntersectionObserver(es => es.forEach(en => { if (b._playing && performance.now() - b._t > 1200 && en.intersectionRatio < .45) stopInline(b, false); else if (!b._playing && en.intersectionRatio > .05) v.play().catch(() => {}); else if (!b._playing && en.intersectionRatio === 0) v.pause(); }), { threshold: [0, .05, .45] }); b._io.observe(b); });   // silent and playing while in sight, resting off the screen
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', watch); else watch();
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-film]'); if (!el) return; e.preventDefault(); e.stopPropagation(); open(el.dataset.film); }, true);
})();
