// Dirty Hands: the sound of the pages, made in the browser (no files). Needs a <button class="snd"> with an svg path inside; starts on the first click anywhere.
// Globals for the page: sndBtn, setSound(on), muffle(on) (a view is open: the filter goes down), soundNudge(k) (a rustle of air, 0..1).
// ---- sound: a very light, calm museum background made in the browser (no files): a soft D major chord held and breathing, a little air, and a long room around it. Off until the switch is pressed; inside a view (a category, a case, the Story) it goes muffled, as if behind a wall
const sndBtn = document.querySelector('.snd'); let actx = null, sMaster = null, sLp = null, sOn = false, sInside = false, sInG = null, sWob = null, sSw = null, sBp = null;
function startSound() {
  const C = actx = new (window.AudioContext || window.webkitAudioContext)();
  sMaster = C.createGain(); sMaster.gain.value = 0; sLp = C.createBiquadFilter(); sLp.type = 'lowpass'; sLp.frequency.value = 2600; sLp.Q.value = .4;
  const dry = C.createGain(), wet = C.createGain(), rv = C.createConvolver(); dry.gain.value = .55; wet.gain.value = .8;
  const len = C.sampleRate * 5, ir = C.createBuffer(2, len, C.sampleRate);           // a long, dark room
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  rv.buffer = ir; const bus = C.createGain(); bus.connect(dry); bus.connect(rv); rv.connect(wet); dry.connect(sLp); wet.connect(sLp); sLp.connect(sMaster); sMaster.connect(C.destination);
  // minimal and ambient: a barely there bed (F and C, held), and over it a soft mallet circling the notes of a chord, four at a time, while the chord turns slowly (F, A minor, C, D minor); quiet and steady, like a pattern repeated by hand
  [[87.31, .018], [130.81, .012], [174.61, .007]].forEach(([f, g]) => { const o = C.createOscillator(), og = C.createGain(); o.type = 'sine'; o.frequency.value = f; og.gain.value = g; o.connect(og); og.connect(bus); o.start(); });
  const hz0 = m => 440 * Math.pow(2, (m - 69) / 12), CH = [[65, 69, 72, 76], [64, 69, 72, 76], [64, 67, 72, 76], [65, 69, 74, 77]], PAT = [0, 2, 1, 3, 2, 1];
  let step = 0;
  (function mallet() { const inside = false, dur = 1.6;   // inside a view the same music plays on, only filtered; slow and sparse
    if (step % 4 !== 3) { const ch = CH[Math.floor(step / 12) % CH.length], m = ch[PAT[step % PAT.length]] - (inside ? 12 : 0), t = C.currentTime, accent = step % 6 === 0 ? 1 : .7;
      [[1, .03 * accent], [4, .004 * accent], [2.76, .003 * accent]].forEach(([h, g]) => { const o = C.createOscillator(), e = C.createGain(); o.type = 'sine'; o.frequency.value = hz0(m) * h;
        e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + .008); e.gain.exponentialRampToValueAtTime(.0001, t + (h === 1 ? 1.6 : .4)); o.connect(e); e.connect(bus); o.start(t); o.stop(t + 1.7); }); }   // a struck tone: quick attack, a short bright overtone, a longer soft body
    step++; setTimeout(mallet, dur * 1000); })();
  const hzm = m => 440 * Math.pow(2, (m - 69) / 12);
  { const l = C.createOscillator(); sWob = C.createGain(); sWob.gain.value = 0; l.frequency.value = .07; l.connect(sWob); sWob.connect(sLp.frequency); l.start(); }   // inside a view the muffled room drifts very slowly
  // inside a view the chord moves to F major with its seventh and ninth, softer and closer: the same bright museum, one room further in
  { sInG = C.createGain(); sInG.gain.value = 0; const padLp = C.createBiquadFilter(); padLp.type = 'lowpass'; padLp.frequency.value = 800; padLp.Q.value = .5; padLp.connect(sInG); sInG.connect(sMaster); sInG.connect(rv);
    [[41, .05], [53, .03], [57, .022], [64, .014], [67, .008]].forEach(([m, g], k) => { const o = C.createOscillator(), og = C.createGain(), l = C.createOscillator(), lg = C.createGain(); o.type = 'sine'; o.frequency.value = hzm(m); og.gain.value = g; l.frequency.value = .02 + k * .007; lg.gain.value = g * .08; l.connect(lg); lg.connect(og.gain); o.connect(og); og.connect(padLp); o.start(); l.start(); }); }
  const nb = C.createBuffer(1, C.sampleRate * 2, C.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const ns = C.createBufferSource(), bp = C.createBiquadFilter(), ng = C.createGain(); ns.buffer = nb; ns.loop = true; bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = .5; ng.gain.value = .05;   // the air of a big hall
  ns.connect(bp); bp.connect(ng); ng.connect(bus); ns.start();
  { const w = C.createBufferSource(); w.buffer = nb; w.loop = true; w.playbackRate.value = .5; const wf = C.createBiquadFilter(); wf.type = 'bandpass'; wf.Q.value = 1.1; wf.frequency.value = 420; const wg = C.createGain(); wg.gain.value = .045;
    const g1 = C.createOscillator(), g1g = C.createGain(), g2 = C.createOscillator(), g2g = C.createGain(); g1.frequency.value = .045; g1g.gain.value = .03; g2.frequency.value = .11; g2g.gain.value = 260;   // slow gusts: the wind swells and falls, and its pitch moves with it
    g1.connect(g1g); g1g.connect(wg.gain); g2.connect(g2g); g2g.connect(wf.frequency); w.connect(wf); wf.connect(wg); wg.connect(bus); w.start(); g1.start(); g2.start(); }   // wind outside the hall
  { const sw = C.createBufferSource(); sw.buffer = nb; sw.loop = true; sBp = C.createBiquadFilter(); sBp.type = 'lowpass'; sBp.Q.value = .7; sBp.frequency.value = 300; sSw = C.createGain(); sSw.gain.value = 0; sw.connect(sBp); sBp.connect(sSw); sSw.connect(sMaster); sSw.connect(rv); sw.start(); }   // the air that moves when something is swiped: low, through a soft low-pass, never hissing
}
function setSound(on) {
  sOn = on; sndBtn.setAttribute('aria-pressed', on); if (on && !actx) startSound(); if (!actx) return;
  if (actx.state === 'suspended') actx.resume();
  const t = actx.currentTime; sMaster.gain.cancelScheduledValues(t); sMaster.gain.setValueAtTime(sMaster.gain.value, t); sMaster.gain.linearRampToValueAtTime(on ? 1.7 : 0, t + (on ? 3 : .8));   // 70% louder than it was
  if (on) waveLoop();
}
function soundNudge(v) {                                               // a swipe or a drag: a soft breath of air, low and quiet, a little fuller the faster it goes
  if (!sSw || !sOn) return; const k = Math.min(1, Math.abs(v)), t = actx.currentTime;
  sSw.gain.cancelScheduledValues(t); sSw.gain.setValueAtTime(sSw.gain.value, t); sSw.gain.linearRampToValueAtTime(Math.max(sSw.gain.value, .03 + .11 * k), t + .08); sSw.gain.setTargetAtTime(0, t + .14, .35);
  sBp.frequency.cancelScheduledValues(t); sBp.frequency.setValueAtTime(sBp.frequency.value, t); sBp.frequency.linearRampToValueAtTime(260 + 520 * k, t + .15); sBp.frequency.setTargetAtTime(300, t + .25, .6);
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
