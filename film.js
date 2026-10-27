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
  // a film shown in the page itself ([data-inline]): no player controls on it, only Play under the pointer. Play gives it its sound where it stands, without moving the page;
  // a second click takes the sound away again, and so does scrolling past it: the film goes on playing quietly in its place, as it always does
  const yt = (fr, func, args = []) => { if (fr && fr.contentWindow) fr.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); };
  const stopInline = (b, hold) => { const fr = b.querySelector('iframe'); yt(fr, 'mute'); yt(fr, hold ? 'pauseVideo' : 'playVideo'); b._playing = false; b.classList.remove('playing'); if (typeof muffle === 'function') muffle(false); };   // scrolled past, only the sound goes and the film plays on; stopped by hand, it holds where it is
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-inline]'); if (!b) return; e.preventDefault(); e.stopPropagation(); const fr = b.querySelector('iframe');
    if (b._playing) { stopInline(b, true); return; }   // a second click stops it where it stands
    yt(fr, 'unMute'); yt(fr, 'setVolume', [100]); yt(fr, 'playVideo'); b._playing = true; b._t = performance.now(); b.classList.add('playing'); if (typeof muffle === 'function') muffle(true); }, true);   // while the film speaks, the room's sound goes quiet behind it
  const watch = () => document.querySelectorAll('[data-inline]').forEach(b => { if (b._io) return; b._io = new IntersectionObserver(es => es.forEach(en => { if (b._playing && performance.now() - b._t > 1200 && en.intersectionRatio < .45) { stopInline(b, false); } else if (!b._playing && en.intersectionRatio > .3) yt(b.querySelector('iframe'), 'playVideo'); }), { threshold: [0, .3, .6] }); b._io.observe(b); });
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', watch); else watch();
  document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('[data-film]'); if (!el) return; e.preventDefault(); e.stopPropagation(); open(el.dataset.film); }, true);
})();
