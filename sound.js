// Dirty Hands: the sound of the pages, made in the browser (no files). Needs a <button class="snd"> with an svg path inside; starts on the first click anywhere.
// Globals for the page: sndBtn, setSound(on), muffle(on) (a view is open: the filter goes down), soundNudge(k) (a rustle of air, 0..1).
// ---- sound: a very light, calm museum background made in the browser (no files): a soft D major chord held and breathing, a little air, and a long room around it. Off until the switch is pressed; inside a view (a category, a case, the Story) it goes muffled, as if behind a wall
const sndBtn = document.querySelector('.snd'); let sBake = null, sPan = null, sGust = 0, sLeafBuf = null, sLeafOut = null, actx = null, sMaster = null, sLp = null, sOn = false, sInside = false, sInG = null, sWob = null, sSw = null, sBp = null;
function startSound() {
  const C = actx = new (window.AudioContext || window.webkitAudioContext)();
  sMaster = C.createGain(); sMaster.gain.value = 0; sLp = C.createBiquadFilter(); sLp.type = 'lowpass'; sLp.frequency.value = 2600; sLp.Q.value = .4;
  const dry = C.createGain(), wet = C.createGain(), rv = C.createConvolver(); dry.gain.value = .55; wet.gain.value = .8;
  const len = C.sampleRate * 5, ir = C.createBuffer(2, len, C.sampleRate);           // a long, dark room
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  rv.buffer = ir; const bus = C.createGain(); bus.connect(dry); bus.connect(rv); rv.connect(wet); dry.connect(sLp); wet.connect(sLp); sLp.connect(sMaster); sMaster.connect(C.destination);
  // minimal and ambient: a barely there bed (F and C, held), and over it a soft mallet circling the notes of a chord, four at a time, while the chord turns slowly (F, A minor, C, D minor); quiet and steady, like a pattern repeated by hand
  // "soft air", our own: slow airy chords that breathe (Fmaj7, Am7, Cmaj7, Dm9, eight seconds each) (no piano)
  const hz0 = m => 440 * Math.pow(2, (m - 69) / 12);
  const CH = [[53, 64, 69, 72, 76], [57, 64, 67, 72, 74], [48, 64, 67, 71, 76], [50, 65, 69, 72, 76]], BAR = 8;   // F maj7, A m7, C maj7, D m9 (midi), from the bass up
  const padLp = C.createBiquadFilter(); padLp.type = 'lowpass'; padLp.frequency.value = 1100; padLp.Q.value = .3; padLp.connect(bus);
  { const l = C.createOscillator(), lg = C.createGain(); l.frequency.value = .05; lg.gain.value = 350; l.connect(lg); lg.connect(padLp.frequency); l.start(); }   // the air in the pad opens and closes very slowly
  let bar = 0;
  (function chord() { const t = C.currentTime + .05, ch = CH[bar % CH.length];
    ch.forEach((m, k) => [-6, 6].forEach(cents => { const o = C.createOscillator(), e = C.createGain(); o.type = k === 0 ? 'sine' : 'triangle'; o.frequency.value = hz0(m); o.detune.value = cents + (Math.random() - .5) * 4;   // two voices a little apart: the shimmer of air
      const g = (k === 0 ? .022 : .009) / (1 + k * .15); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 3); e.gain.setValueAtTime(g, t + BAR - 1); e.gain.linearRampToValueAtTime(0, t + BAR + 3);   // slow in, and it lets go while the next one comes
      o.connect(e); e.connect(padLp); o.start(t); o.stop(t + BAR + 3.2); }));
    bar++; setTimeout(chord, BAR * 1000); })();
  const hzm = m => 440 * Math.pow(2, (m - 69) / 12);
  { const l = C.createOscillator(); sWob = C.createGain(); sWob.gain.value = 0; l.frequency.value = .07; l.connect(sWob); sWob.connect(sLp.frequency); l.start(); }   // inside a view the muffled room drifts very slowly
  // inside a view the chord moves to F major with its seventh and ninth, softer and closer: the same bright museum, one room further in
  { sInG = C.createGain(); sInG.gain.value = 0; const padLp = C.createBiquadFilter(); padLp.type = 'lowpass'; padLp.frequency.value = 800; padLp.Q.value = .5; padLp.connect(sInG); sInG.connect(sMaster); sInG.connect(rv);
    [[41, .05], [53, .03], [57, .022], [64, .014], [67, .008]].forEach(([m, g], k) => { const o = C.createOscillator(), og = C.createGain(), l = C.createOscillator(), lg = C.createGain(); o.type = 'sine'; o.frequency.value = hzm(m); og.gain.value = g; l.frequency.value = .02 + k * .007; lg.gain.value = g * .08; l.connect(lg); lg.connect(og.gain); o.connect(og); og.connect(padLp); o.start(); l.start(); }); }
  // pink noise (softer than white, the colour of real wind), four seconds long so the loop is never heard
  const nb = C.createBuffer(2, C.sampleRate * 4, C.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = nb.getChannelData(ch); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = .99886 * b0 + w * .0555179; b1 = .99332 * b1 + w * .0750759; b2 = .969 * b2 + w * .153852; b3 = .8665 * b3 + w * .3104856; b4 = .55 * b4 + w * .5329522; b5 = -.7616 * b5 - w * .016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * .5362) * .11; b6 = w * .115926; } }
  // autumn outside: wind in gusts that never repeat (every second or three it picks a new strength and pitch and drifts to them), and dry leaves rustling, more of them the harder it blows
  { const w = C.createBufferSource(); w.buffer = nb; w.loop = true; const body = C.createBiquadFilter(); body.type = 'bandpass'; body.Q.value = .9; body.frequency.value = 480;
    const wh = C.createBiquadFilter(); wh.type = 'bandpass'; wh.Q.value = 9; wh.frequency.value = 1200; const whg = C.createGain(); whg.gain.value = .12;
    const wg = C.createGain(); wg.gain.value = .012; const pan = C.createStereoPanner ? C.createStereoPanner() : null;
    w.connect(body); body.connect(wg); w.connect(wh); wh.connect(whg); whg.connect(wg); if (pan) { wg.connect(pan); pan.connect(bus); } else wg.connect(bus); w.start();
    sGust = .3;
    (function gust() { const t = C.currentTime, calm = Math.random() < .25, k = calm ? Math.random() * .2 : .25 + Math.random() * .75, tc = .5 + Math.random() * 1.1;   // now and then it drops almost to nothing
      sGust = k; wg.gain.setTargetAtTime(.005 + .03 * k, t, tc);   // the wind well in the background, quieter than it was
      body.frequency.setTargetAtTime(320 + 520 * k + Math.random() * 120, t, tc * 1.2); wh.frequency.setTargetAtTime(900 + 900 * k, t, tc);
      if (pan) pan.pan.setTargetAtTime((Math.random() - .5) * .8, t, 2); setTimeout(gust, (1 + Math.random() * 2.2) * 1000); })(); }
  // clay after the kiln: once in a while it cracks, dry and short, with a dull knock under it
  // (no glaze pings: no bell-like sounds at all)
  (function crack() { const loud = Math.random() < .3 ? 2.6 : 1, t = C.currentTime + .05,   // now and then a crack much louder than the rest
    src = C.createBufferSource(), lp = C.createBiquadFilter(), e = C.createGain(), th = C.createOscillator(), te = C.createGain();
    src.buffer = nb; lp.type = 'bandpass'; lp.frequency.value = 900 + Math.random() * 1400; lp.Q.value = .7;
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.12 * loud, t + .003); e.gain.exponentialRampToValueAtTime(.0001, t + .09 + Math.random() * .08);
    th.type = 'sine'; th.frequency.setValueAtTime(140, t); th.frequency.exponentialRampToValueAtTime(70, t + .06); te.gain.setValueAtTime(0, t); te.gain.linearRampToValueAtTime(.07 * loud, t + .004); te.gain.exponentialRampToValueAtTime(.0001, t + .08);
    src.connect(lp); lp.connect(e); e.connect(bus); th.connect(te); te.connect(bus); src.start(t, Math.random() * 3, .2); th.start(t); th.stop(t + .1);
    setTimeout(crack, (12 + Math.random() * 16) * 1000); })();
  // clay baking in the kiln: a faint hot hiss and a thick scatter of tiny dry pops, like slip drying and sizzling on a hot surface; it swells and settles slowly, under everything else
  { const hs = C.createBufferSource(); hs.buffer = nb; hs.loop = true; const hp = C.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3500; const hg = C.createGain(); hg.gain.value = .0016;
    const lf = C.createOscillator(), lg = C.createGain(); lf.frequency.value = .07; lg.gain.value = .0012; lf.connect(lg); lg.connect(hg.gain); lf.start();   // the heat breathes
    hs.connect(hp); hp.connect(hg); hg.connect(bus); hs.start(); sBake = lf; }
  (function bake() { const t = C.currentTime, heat = .55 + .45 * Math.sin(t * .44) * Math.sin(t * .13), n = Math.random() < heat * .6 ? 1 + Math.floor(Math.random() * 2 * heat) : 0;
    for (let i = 0; i < n; i++) pop(t + Math.random() * .04, .0015 + Math.random() * .004 * heat);   // very light, far in the background
    setTimeout(bake, 40 + Math.random() * 70); })();
  // dry leaves: short crackly grains of bright noise, scattered left and right
  sLeafBuf = C.createBuffer(1, C.sampleRate * .5, C.sampleRate); { const d = sLeafBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < .3 ? 1 : .35); }   // uneven: the clicks of leaves, not a smooth hiss
  sLeafOut = C.createGain(); sLeafOut.gain.value = 1; sLeafOut.connect(bus);
  (function rustle() { const n = Math.random() < sGust * .9 ? 1 + Math.floor(sGust * 5 * Math.random()) : 0; for (let i = 0; i < n; i++) leaf(C.currentTime + Math.random() * .09, .02 + .05 * sGust); setTimeout(rustle, 70 + Math.random() * 90); })();
  { const sw = C.createBufferSource(); sw.buffer = nb; sw.loop = true; sBp = C.createBiquadFilter(); sBp.type = 'bandpass'; sBp.Q.value = 1.6; sBp.frequency.value = 450; sSw = C.createGain(); sSw.gain.value = 0; sPan = C.createStereoPanner ? C.createStereoPanner() : null;
    sw.connect(sBp); sBp.connect(sSw); if (sPan) { sSw.connect(sPan); sPan.connect(sMaster); sPan.connect(rv); } else { sSw.connect(sMaster); sSw.connect(rv); } sw.start(); }   // a gust of wind when something is swiped: a band of soft noise that rises and falls, never a hiss
}
function pop(t, g) {                                                     // one tiny pop of baking clay: a couple of milliseconds of very bright crackle
  if (!actx || !sLeafBuf) return; const C = actx, src = C.createBufferSource(), bp = C.createBiquadFilter(), e = C.createGain(), pn = C.createStereoPanner ? C.createStereoPanner() : null, len = .002 + Math.random() * .006;
  src.buffer = sLeafBuf; bp.type = 'bandpass'; bp.frequency.value = 3000 + Math.random() * 6000; bp.Q.value = 1.5;
  e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(.0001, t + len);
  src.connect(bp); bp.connect(e); if (pn) { pn.pan.value = (Math.random() - .5) * 1.2; e.connect(pn); pn.connect(sLeafOut); } else e.connect(sLeafOut);
  src.start(t, Math.random() * .4, len + .005); }
function leaf(t, g) {                                                    // one leaf: a few milliseconds of bright crackle through a band that differs every time
  if (!actx || !sLeafBuf) return; const C = actx, src = C.createBufferSource(), hp = C.createBiquadFilter(), bp = C.createBiquadFilter(), e = C.createGain(), pn = C.createStereoPanner ? C.createStereoPanner() : null, len = .015 + Math.random() * .07;
  src.buffer = sLeafBuf; hp.type = 'highpass'; hp.frequency.value = 1400; bp.type = 'bandpass'; bp.frequency.value = 2200 + Math.random() * 4500; bp.Q.value = .8 + Math.random() * 1.5;
  e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g * (.4 + Math.random() * .6), t + .002 + Math.random() * .006); e.gain.exponentialRampToValueAtTime(.0001, t + len);
  src.connect(hp); hp.connect(bp); bp.connect(e); if (pn) { pn.pan.value = (Math.random() - .5) * 1.6; e.connect(pn); pn.connect(sLeafOut); } else e.connect(sLeafOut);
  src.start(t, Math.random() * .4, len + .01); }
function placeSound(at) {                                               // a work set down on a shelf: a heavy stoneware piece put down with care, a low dull thud (any clean ring sounds like glass)
  if (!actx || (!sOn && at == null)) return; const C = actx, t = at ?? C.currentTime + .01;
  const noise = (t, type, f, q, g, d, off) => { const src = C.createBufferSource(), fl = C.createBiquadFilter(), e = C.createGain(); src.buffer = sLeafBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + .002); e.gain.exponentialRampToValueAtTime(.0001, t + d); src.connect(fl); fl.connect(e); e.connect(sMaster); src.start(t, off ?? Math.random() * .4, d + .02); };
  const hit = (t, amp) => {   // a heavy piece set down with care: a low, dull, soft thud and the shelf answering under it; no ring, no click
    const o = C.createOscillator(), e = C.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(82 + Math.random() * 14, t); o.frequency.exponentialRampToValueAtTime(42, t + .16);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(.2 * amp, t + .006); e.gain.exponentialRampToValueAtTime(.0001, t + .3); o.connect(e); e.connect(sMaster); o.start(t); o.stop(t + .32);
    noise(t, 'lowpass', 240 + Math.random() * 60, .7, .22 * amp, .13);                   // the soft weight of it
    const w = C.createOscillator(), we = C.createGain(); w.type = 'sine'; w.frequency.value = 170 + Math.random() * 30;   // the shelf under it, short and woody
    we.gain.setValueAtTime(0, t); we.gain.linearRampToValueAtTime(.05 * amp, t + .004); we.gain.exponentialRampToValueAtTime(.0001, t + .08); w.connect(we); we.connect(sMaster); w.start(t); w.stop(t + .1);
    noise(t, 'lowpass', 900, .5, .025 * amp, .02);                                      // the touch of the foot, barely there
  };
  const a = (.8 + Math.random() * .2) * 1.3; hit(t, a); hit(t + .09 + Math.random() * .03, a * (.08 + Math.random() * .06)); }   // it lands, and settles with a very small second knock
function setSound(on) {
  sOn = on; sndBtn.setAttribute('aria-pressed', on); if (on && !actx) startSound(); if (!actx) return;
  if (actx.state === 'suspended') actx.resume();
  const t = actx.currentTime; sMaster.gain.cancelScheduledValues(t); sMaster.gain.setValueAtTime(sMaster.gain.value, t); sMaster.gain.linearRampToValueAtTime(on ? 1.7 : 0, t + (on ? 3 : .8));   // 70% louder than it was
  if (on) waveLoop();
}
function soundNudge(v) {                                               // a swipe or a drag: a gust of wind with leaves in it, rising and falling, fuller and higher the faster it goes, from one side or the other
  if (!sSw || !sOn) return; const k = Math.min(1, Math.abs(v)), t = actx.currentTime;
  sSw.gain.cancelScheduledValues(t); sSw.gain.setValueAtTime(sSw.gain.value, t); sSw.gain.linearRampToValueAtTime(Math.max(sSw.gain.value, .03 + .08 * k), t + .18);   // (quieter: at the level of the cracks)
  sSw.gain.setTargetAtTime(0, t + .25, .45);
  sBp.frequency.cancelScheduledValues(t); sBp.frequency.setValueAtTime(sBp.frequency.value, t); sBp.frequency.linearRampToValueAtTime(420 + 900 * k, t + .22); sBp.frequency.setTargetAtTime(380, t + .3, .7);
  if (sPan) { sPan.pan.cancelScheduledValues(t); sPan.pan.setValueAtTime(sPan.pan.value, t); sPan.pan.linearRampToValueAtTime((Math.random() - .5) * .9, t + .3); }
  if (t - (soundNudge._l || 0) < .15) return; soundNudge._l = t;   // a scroll sends many events: one handful of leaves at most every 150 ms
  const n = 3 + Math.round(9 * k); for (let i = 0; i < n; i++) leaf(t + .03 + Math.random() * (.2 + .3 * k), .025 + .035 * k);   // and a handful of leaves stirred by it
}
function muffle(on) { sInside = on; if (!sLp) return; const t = actx.currentTime; sLp.frequency.cancelScheduledValues(t); sLp.frequency.setValueAtTime(sLp.frequency.value, t); sLp.frequency.exponentialRampToValueAtTime(on ? 340 : 2600, t + 1.2); sLp.Q.cancelScheduledValues(t); sLp.Q.setValueAtTime(sLp.Q.value, t); sLp.Q.linearRampToValueAtTime(on ? 1.6 : .5, t + 1.2);
  sWob.gain.cancelScheduledValues(t); sWob.gain.setValueAtTime(sWob.gain.value, t); sWob.gain.linearRampToValueAtTime(0, t + 1.5);
  sInG.gain.cancelScheduledValues(t); sInG.gain.setValueAtTime(sInG.gain.value, t); sInG.gain.linearRampToValueAtTime(0, t + 2); }   // inside: softer and closer, an octave lower, with a warm fifth under it
const wave = sndBtn.querySelector('path');
function waveLoop(now = performance.now()) {                            // the line moves like a slow wave while the sound plays and lies flat again when it stops
  let d = 'M0 5'; const amp = sOn ? 2.6 : 0; for (let x = 2; x <= 24; x += 2) d += `L${x} ${(5 + amp * Math.sin(x / 24 * Math.PI * 2 - now / 420) * Math.sin(x / 24 * Math.PI)).toFixed(2)}`;
  wave.setAttribute('d', d); if (sOn) requestAnimationFrame(waveLoop);
}
// the sound of the page: no notes, only soft rustles of air when something is pointed at, scrolled or opened (and inside a view the filter lies over them too)
let hovLast = null, scrLast = 0;
addEventListener('pointerover', e => { const t = e.target.closest && e.target.closest('a, button, .hc, .pic, .partner, [data-year], .cat-strip, .sv-strip, .cd-s'); if (t && t !== hovLast) { hovLast = t; soundNudge(.25); } else if (!t) hovLast = null; }, { passive: true });
addEventListener('scroll', () => { const y = scrollY, d = Math.abs(y - scrLast); scrLast = y; if (d > 2) soundNudge(Math.min(1, d / 120)); }, { passive: true });
addEventListener('click', () => soundNudge(.6), { passive: true });
sndBtn.addEventListener('click', e => { e.stopPropagation(); sndBtn._touched = true; setSound(!sOn); });
addEventListener('pointerdown', e => { if (!sndBtn._touched && !sOn && !sndBtn.contains(e.target)) { sndBtn._touched = true; setSound(true); } }, { capture: true });   // the first click anywhere starts the sound (the browser allows sound only after a click); after that only the switch turns it off and on
