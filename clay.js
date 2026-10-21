// Dirty Hands: the clay on the page. makeClay() lays a transparent sheet over the page that hands covered in clay smear as they drag; makeClay({ cv, w, h }) gives a still sheet to draw marks on.
// A page can stop it for a while with window.clayBlocked = () => true (an open view, for instance).
function makeClay(opt = {}) {                                         // live: the sheet over the page that follows the hand; with opt.cv: a still sheet (the marks on the Lisa and Karen cards)
const live = !opt.cv, inv = live || !!opt.invert;                  // inv: drawn in inverted colours, to be blended by difference (on the page, and over the text of the cards)
const cv = opt.cv || document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
if (live) cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:450;pointer-events:none;display:block;mix-blend-mode:difference';   // above the page, blended by difference: the clay is drawn in inverted colours, so on white it is dark clay, and whatever it lies on (text, lines) turns to its negative
if (live) document.body.prepend(cv);
const ctx = cv.getContext('2d');

let S = 1, W = 0, H = 0, T = null, D = null, img = null;
const TILE = 64;
const tiles = new Map();
const content = new Set();      // tiles that still hold clay and keep fading
const FAST = !!window.clayFast;   // on the phone the marks go sooner
const HOLD = FAST ? .8 : 1.75;  // seconds a fresh mark stays before it starts to fade
const FADE_STEP = 1 / 20;       // fading runs 20 times a second in small steps, so the marks melt away smoothly
let lastFade = 0;
const now = () => performance.now() / 1000;

// Clay slip: thin film is a dusty terracotta, thick lumps go dark and earthy.
const THIN = [84, 82, 80], THICK = [22, 22, 24];   /* a thicker slip: even its thin film is dense */   // dark charcoal clay, dry and matte, like on the hands in the reference photo
const Lx = -0.6, Ly = -0.8;

/* ---------- noise ---------- */
const seed = (Math.random() * 1e9) | 0;
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263 + seed) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function fbm(x, y) {
  return vnoise(x, y) * 0.5 + vnoise(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + vnoise(x * 4.3 + 11, y * 4.3 + 5) * 0.2;
}
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));

/* ---------- buffers & drawing ---------- */
function alloc() {
  const ns = 1;                         // drawn at css-pixel size: soft clay needs no more, and it is 4 times lighter on a retina screen
  const nw = Math.max(2, Math.round((opt.w || innerWidth) * ns)), nh = Math.max(2, Math.round((opt.h || innerHeight) * ns));
  const nT = new Float32Array(nw * nh), nD = new Float32Array(nw * nh).fill(-100);
  if (T && ns === S) {
    const cw = Math.min(W, nw), ch = Math.min(H, nh);
    for (let y = 0; y < ch; y++) {
      nT.set(T.subarray(y * W, y * W + cw), y * nw);
      nD.set(D.subarray(y * W, y * W + cw), y * nw);
    }
  }
  S = ns; W = nw; H = nh; T = nT; D = nD; tiles.clear(); content.clear();
  for (let ty = 0; ty < Math.ceil(H / TILE); ty++) for (let tx = 0; tx < Math.ceil(W / TILE); tx++) content.add(ty * Math.ceil(W / TILE) + tx);
  cv.width = W; cv.height = H;
  img = ctx.createImageData(W, H);
  shade(0, 0, W - 1, H - 1, now());
  ctx.putImageData(img, 0, 0);
}

function shade(x0, y0, x1, y1, t) {
  x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0);
  x1 = Math.min(W - 1, x1 | 0); y1 = Math.min(H - 1, y1 | 0);
  const d = img.data;
  for (let y = y0; y <= y1; y++) {
    const yu = y > 0 ? y - 1 : y, yd = y < H - 1 ? y + 1 : y;
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x, p = i * 4;
      const th = T[i];
      if (th <= 0.003) { d[p] = d[p + 1] = d[p + 2] = d[p + 3] = 0; continue; }
      const xl = x > 0 ? i - 1 : i, xr = x < W - 1 ? i + 1 : i;
      const gx = (T[xr] - T[xl]) * 0.5, gy = (T[yd * W + x] - T[yu * W + x]) * 0.5;
      let s = 1 - (gx * Lx + gy * Ly) * 0.55 / S;
      if (s < 0.55) s = 0.55; else if (s > 1.4) s = 1.4;
      const a = 1 - Math.exp(-th * 3.2);
      const m = th > 1.8 ? 1 : th / 1.8;
      const wet = Math.exp(-(t - D[i]) / 0.6);
      const dk = s * (1 - 0.2 * wet);
      let r = (THIN[0] + (THICK[0] - THIN[0]) * m) * dk;
      let g = (THIN[1] + (THICK[1] - THIN[1]) * m) * dk;
      let b = (THIN[2] + (THICK[2] - THIN[2]) * m) * dk;
      const spec = wet * Math.max(0, s - 1.05) * 0.9 * a;
      d[p]     = inv ? 255 - (r + (255 - r) * spec) : r + (255 - r) * spec;   // the live sheet is drawn inverted (it is blended by difference)
      d[p + 1] = inv ? 255 - (g + (255 - g) * spec) : g + (255 - g) * spec;
      d[p + 2] = inv ? 255 - (b + (255 - b) * spec) : b + (255 - b) * spec;
      d[p + 3] = a * 255;
    }
  }
}

function touched(x0, y0, x1, y1) {
  const until = now() + 2.6, tw = Math.ceil(W / TILE), th = Math.ceil(H / TILE);
  const tx0 = Math.max(0, Math.floor((x0 - 1) / TILE)), tx1 = Math.min(tw - 1, Math.floor((x1 + 1) / TILE));
  const ty0 = Math.max(0, Math.floor((y0 - 1) / TILE)), ty1 = Math.min(th - 1, Math.floor((y1 + 1) / TILE));
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { tiles.set(ty * tw + tx, until); content.add(ty * tw + tx); }
}

function deposit(i, add, t) {
  if (add <= 0.002) return;
  const v = T[i] + add;
  T[i] = v > 3.5 ? 3.5 : v;
  D[i] = t;
}

// Iterate pixels in a CSS-px box around (x, y) with radius R.
function box(xc, yc, R, fn) {
  const cx = xc * S, cy = yc * S, Rd = R * S;
  const x0 = Math.max(0, Math.floor(cx - Rd)), x1 = Math.min(W - 1, Math.ceil(cx + Rd));
  const y0 = Math.max(0, Math.floor(cy - Rd)), y1 = Math.min(H - 1, Math.ceil(cy + Rd));
  if (x1 < x0 || y1 < y0) return;
  const t = now();
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) fn(x, y, (x - cx) / S, (y - cy) / S, y * W + x, t);
  touched(x0, y0, x1, y1);
}

/* ---------- mark primitives ---------- */

// Pressing onto clay that is already there squashes and mixes it.
let sq = new Float32Array(0), sq2 = new Float32Array(0);
function squash(o, blurPx = 3, strength = 0.85, reach = 1.15) {
  const ca = Math.cos(o.ang), sa = Math.sin(o.ang);
  const R = Math.max(o.rx, o.ry) * (reach + 0.4) * S, cx = o.x * S, cy = o.y * S, rb = Math.max(1, Math.round(blurPx * S));
  const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R));
  const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R));
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w < 2 || h < 2) return;
  if (sq.length < w * h) { sq = new Float32Array(w * h); sq2 = new Float32Array(w * h); }
  let any = false;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = T[(y + y0) * W + x + x0]; sq[y * w + x] = v; if (v > 0.01) any = true; }
  if (!any) return;
  // separable box blur
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0, c = 0;
    for (let k = -rb; k <= rb; k++) { const xx = x + k; if (xx >= 0 && xx < w) { a += sq[y * w + xx]; c++; } }
    sq2[y * w + x] = a / c;
  }
  const t = now();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0, c = 0;
    for (let k = -rb; k <= rb; k++) { const yy = y + k; if (yy >= 0 && yy < h) { a += sq2[yy * w + x]; c++; } }
    const dx = (x + x0 - cx) / S, dy = (y + y0 - cy) / S;
    const u = (dx * ca + dy * sa) / o.rx, v = (-dx * sa + dy * ca) / o.ry;
    const wgt = clamp01((reach - Math.sqrt(u * u + v * v)) / 0.35) * strength;
    if (wgt <= 0) continue;
    const i = (y + y0) * W + x + x0, old = T[i];
    const nv = old + (a / c - old) * wgt;
    if (Math.abs(nv - old) > 0.003) { T[i] = nv; D[i] = t; }
  }
}

function print(o) {
  squash(o);
  const freq = Math.PI * 2 * o.rx / 3.1;
  const ca = Math.cos(o.ang), sa = Math.sin(o.ang);
  const haze = o.haze ?? 0.32;
  box(o.x, o.y, Math.max(o.rx, o.ry) * 1.7, (x, y, dx, dy, i, t) => {
    const u = (dx * ca + dy * sa) / o.rx, v = (-dx * sa + dy * ca) / o.ry;
    const r2 = u * u + v * v;
    if (r2 > 2.6) return;
    const r = Math.sqrt(r2);
    const wx = x / S, wy = y / S;
    const n = fbm(wx * 0.08 + o.k, wy * 0.08);
    // dirty halo of clay residue around the print
    if (haze > 0 && r > 0.85) {
      const hz = fbm(wx * 0.05 - o.k, wy * 0.05);
      deposit(i, haze * clamp01((1.6 - r) / 0.7) * clamp01((hz - 0.36) * 2.5) * o.load, t);
    }
    const edge = clamp01((1.08 + (n - 0.5) * 0.5 - r) / 0.38);
    if (edge <= 0) return;
    const pu = u + o.ox, pv = v + o.oy;
    let ph;
    if (o.pattern === 0) ph = Math.sqrt(pu * pu + pv * pv * 1.3);
    else if (o.pattern === 1) ph = pv < 0 ? Math.sqrt(pu * pu + pv * pv * 1.3) : Math.abs(pu) + pv * 0.12;
    else ph = -pv + 0.38 * Math.exp(-pu * pu * 2.2);
    ph += (n - 0.5) * 0.09;
    let ridge = 0.5 + 0.5 * Math.cos(ph * freq + o.phase);
    ridge = ridge * ridge * (3 - 2 * ridge);
    // places where the clay is a solid smudge and the ridges are lost
    const mush = clamp01((fbm(wx * 0.06 - o.k, wy * 0.06 + o.k) - 0.48) * 3.5) * (o.mush ?? 0.8);
    ridge = ridge + (1 - ridge) * mush;
    // wet clay already on the sheet fills the ridges and blends with the new print
    const e = T[i];
    ridge = ridge + (1 - ridge) * clamp01(e * 0.6);
    const patch = fbm(wx * 0.035 + o.k * 3, wy * 0.035 - o.k);
    const cov = clamp01((patch - o.dry) / 0.2);
    const press = 0.55 + 0.45 * (1 - r2);
    // clumps: thick gobs stuck to the skin
    const gob = clamp01((fbm(wx * 0.13 + o.k, wy * 0.13 - o.k) - 0.55) * 4) * (o.gobs ?? 1.1);
    let add = o.load * edge * press * ((o.fill ?? 0.58) + (1 - (o.fill ?? 0.58)) * ridge) * cov + gob * edge * o.load;
    add /= 1 + e * 0.7;
    if (o.cut) add *= clamp01(0.5 - ((u * o.cut[0] + v * o.cut[1]) - o.cut[2]) * 3);
    deposit(i, add, t);
  });
  squash(o, 1.2, 0.75, 1.6);   // soapy, slightly blurred print
}

// A finger dragged over the sheet: it pushes the wet clay along and smudges it, no stripes.
let snap = new Float32Array(0);
function smear(o, dirx, diry) {
  const rx = o.rx * 1.05 * S, ry = o.ry * 0.8 * S, R = Math.max(rx, ry) * 1.2;
  const cx = o.x * S, cy = o.y * S, shift = 3.2 * S, m = Math.ceil(shift) + 2;
  const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W - 1, Math.ceil(cx + R));
  const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(H - 1, Math.ceil(cy + R));
  if (x1 < x0 || y1 < y0) return;
  const sx0 = Math.max(0, x0 - m), sy0 = Math.max(0, y0 - m);
  const sx1 = Math.min(W - 1, x1 + m), sy1 = Math.min(H - 1, y1 + m);
  const sw = sx1 - sx0 + 1, shh = sy1 - sy0 + 1;
  if (snap.length < sw * shh) snap = new Float32Array(sw * shh);
  for (let y = sy0; y <= sy1; y++) snap.set(T.subarray(y * W + sx0, y * W + sx1 + 1), (y - sy0) * sw);
  const at = (px, py) => {
    px = Math.min(sw - 1.001, Math.max(0, px)); py = Math.min(shh - 1.001, Math.max(0, py));
    const xi = px | 0, yi = py | 0, fx = px - xi, fy = py - yi, j = yi * sw + xi;
    const a = snap[j], b = snap[j + 1], c = snap[j + sw], d = snap[j + sw + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const t = now();
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx, dy = y - cy;
      const along = (dx * dirx + dy * diry) / ry, across = (-dx * diry + dy * dirx) / rx;
      const r = Math.sqrt(along * along + across * across);
      if (r > 1.25) continue;
      const wx = x / S, wy = y / S;
      const n = fbm(wx * 0.07 + o.k, wy * 0.07);
      const e0 = clamp01((1.0 + (n - 0.5) * 0.3 - r) / 0.8), edge = e0 * e0 * (3 - 2 * e0);   // a wide, soft rim: one step of the drag melts into the next instead of leaving a scalloped edge
      if (edge <= 0) continue;
      const cur = snap[(y - sy0) * sw + (x - sx0)];
      const src = at(x - dirx * shift - sx0, y - diry * shift - sy0);
      let v = cur + (src - cur) * 0.5 * edge;                       // drag clay forward
      const along2 = (wx * dirx + wy * diry), across2 = (-wx * diry + wy * dirx), soft = 0.25 + 1.3 * fbm(along2 * 0.025 + o.k, across2 * 0.28 - o.k);   // dry streaks along the drag, like clay rubbed over skin
      v += o.load * 0.09 * edge * soft;                            // what is left on the finger
      v *= 1 - 0.04 * edge;                                        // a little sticks to the skin
      if (v < 0) v = 0; else if (v > 3.5) v = 3.5;
      const i = y * W + x;
      T[i] = v; D[i] = t;                                            // every pixel under the finger gets the same time, so the trail dries away evenly, not in bands
    }
  }
  touched(x0, y0, x1, y1);
}

// Lower part of a finger (between the joints): skin lines run across, no whorl.
function segment(o) {
  squash(o);
  const ca = Math.cos(o.ang), sa = Math.sin(o.ang);
  const freq = Math.PI * 2 * o.ry / 3.6;
  box(o.x, o.y, Math.max(o.rx, o.ry) * 1.5, (x, y, dx, dy, i, t) => {
    const u = (dx * ca + dy * sa) / o.rx, v = (-dx * sa + dy * ca) / o.ry;
    // slightly squared-off ellipse: finger segments are sausage-shaped
    const r = Math.pow(Math.pow(Math.abs(u), 2.6) + Math.pow(Math.abs(v), 2.2), 1 / 2.4);
    if (r > 1.5) return;
    const wx = x / S, wy = y / S;
    const n = fbm(wx * 0.08 + o.k, wy * 0.08);
    if (r > 0.9) {
      const hz = fbm(wx * 0.05 - o.k, wy * 0.05);
      deposit(i, 0.25 * clamp01((1.45 - r) / 0.55) * clamp01((hz - 0.4) * 2.5) * o.load, t);
    }
    const edge = clamp01((1.02 + (n - 0.5) * 0.5 - r) / 0.25);
    if (edge <= 0) return;
    let line = 0.5 + 0.5 * Math.cos((v + 0.12 * u * u + (n - 0.5) * 0.15) * freq + o.phase);
    line = line * line;
    const e = T[i];
    line = line + (1 - line) * clamp01(e * 0.6 + clamp01((fbm(wx * 0.06 - o.k, wy * 0.06) - 0.45) * 3));
    const cov = clamp01((fbm(wx * 0.035 + o.k * 3, wy * 0.035 - o.k) - o.dry) / 0.2);
    const press = 0.55 + 0.45 * (1 - Math.min(1, u * u));
    const gob = clamp01((fbm(wx * 0.13 + o.k, wy * 0.13 - o.k) - 0.57) * 4);
    let add = o.load * edge * press * (0.4 + 0.6 * line) * cov + gob * edge * o.load * 0.8;
    deposit(i, add / (1 + e * 0.7), t);
  });
  squash(o, 1.2, 0.75, 1.6);
}

// A whole finger lying on the sheet: tip print plus one or two lower segments with joint gaps.
function longFinger(x, y, opts = {}) {
  const tip = finger(x, y, Object.assign({ load: rnd(1.2, 1.6) }, opts));
  print(tip);
  const ax = -Math.sin(tip.ang), ay = Math.cos(tip.ang);   // along the finger, toward the palm
  const out = [tip];
  let dist = tip.ry, prev = tip, n = Math.random() < 0.55 ? 2 : 1;
  for (let j = 0; j < n; j++) {
    const ry = tip.ry * rnd(0.72, 0.85), rx = prev.rx * rnd(1.02, 1.08);
    dist += 3.5 + ry;                                        // the joint crease stays clean
    const sg = finger(x + ax * dist, y + ay * dist, {
      rx, ry, ang: tip.ang + rnd(-0.06, 0.06), load: tip.load * (j ? 0.6 : 0.85),
      dry: tip.dry + 0.08 * (j + 1), k: tip.k + 10 * (j + 1)
    });
    segment(sg); out.push(sg);
    dist += ry; prev = sg;
  }
  return out;
}

function blob(xc, yc, rad, load, flat = 0.5) {
  const k = Math.random() * 50;
  box(xc, yc, rad * 1.7, (x, y, dx, dy, i, t) => {
    const ang = Math.atan2(dy, dx);
    const wob = 1 + (vnoise(Math.cos(ang) * 2 + k, Math.sin(ang) * 2 + k) - 0.5) * 0.8;
    const r = Math.hypot(dx, dy) / rad / wob;
    if (r >= 1) return;
    const n = fbm(x / S * 0.12 + k, y / S * 0.12);
    deposit(i, load * Math.pow(1 - r * r, flat) * (0.7 + 0.6 * n), t);
  });
}

function dot(xc, yc, rad, load) {
  box(xc, yc, rad + 1, (x, y, dx, dy, i, t) => {
    const r = Math.hypot(dx, dy) / rad;
    if (r < 1) deposit(i, load * Math.sqrt(1 - r * r), t);
  });
}

function specks(x, y, spread, n, big = 1.4) {
  return;   // flying specks are switched off
  for (let j = 0; j < n; j++) {
    const a = Math.random() * Math.PI * 2, d = spread * rnd(0.9, 2.2);
    dot(x + Math.cos(a) * d, y + Math.sin(a) * d, rnd(0.45, big), rnd(0.6, 1.2));
  }
}

function drip(x, y, len, w, load) {
  for (let s = 0; s < len; s += 1.2) {
    const taper = 1 - (s / len) * 0.45;
    dot(x + Math.sin(s * 0.05) * 1.2, y + s, w * taper, load * 0.5);
  }
  dot(x, y + len, w * 1.5, load * 1.3);
}

function finger(x, y, opts = {}) {
  const size = (opts.size || rnd(0.92, 1.12)) * 1.3;                 // bigger marks
  return Object.assign({
    x, y, rx: 23 * size, ry: 30 * size,
    ang: rnd(-0.6, 0.6), load: rnd(1.35, 1.75), dry: rnd(0.08, 0.2),
    pattern: irnd(0, 2), phase: Math.random() * 6.28,
    ox: rnd(-0.2, 0.2), oy: rnd(-0.15, 0.25), k: Math.random() * 100, cut: null
  }, opts);
}

function autoSmear(f, dx, dy, len, decay = 0.985) {
  const g = Object.assign({}, f), sx = f.x, sy = f.y;
  for (let s = 0; s < len; s += 2) {
    g.x = sx + dx * s; g.y = sy + dy * s;
    smear(g, dx, dy); g.load *= decay;
  }
  return g;
}

/* ---------- ten variants ---------- */
const variants = [
  { name: 'Жирный отпечаток', run(x, y) {
      const f = finger(x, y, { load: rnd(1.6, 2.0), fill: 0.5 });
      print(f);
      if (Math.random() < 0.5) specks(x, y, f.rx, irnd(1, 4));
      return [f];
  } },
  { name: 'Хват', run(x, y) {
      const n = irnd(1, 3), base = rnd(-0.4, 0.4), gap = 42, long = Math.random() < 0.4 ? irnd(0, n - 1) : -1;   // one to three fingers, never more; sometimes one is pressed flat, its mark wider than a fingertip, a whole phalanx
      const out = [];
      for (let j = 0; j < n; j++) {
        const o = j - (n - 1) / 2;
        const px = x + Math.cos(base) * o * gap, py = y + Math.sin(base) * o * gap + o * o * 7;
        const f = finger(px, py, { ang: base + o * 0.18 + rnd(-0.1, 0.1), size: 1.02 - Math.abs(o) * 0.08 }); if (j === long) { f.rx *= 1.6; f.ry *= 1.2; }
        if (Math.random() < 0.25) f.cut = [rnd(-1, 1), rnd(-1, 1), rnd(0, 0.4)];
        print(f); out.push(f);
      }
      return out;
  } },
  { name: 'Мазок большим пальцем', run(x, y) {
      const f = finger(x, y, { size: rnd(1.25, 1.4), load: rnd(1.2, 1.5) });
      const a = Math.random() * Math.PI * 2;
      print(f);
      autoSmear(f, Math.cos(a), Math.sin(a), rnd(40, 90));
      return [f];
  } },
  { name: 'Съехавший палец', run(x, y) {
      const a = Math.random() * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a), off = rnd(8, 16);
      const f = finger(x, y, { load: rnd(0.9, 1.2) });
      print(f);
      autoSmear(f, dx, dy, off, 0.99);
      print(Object.assign({}, f, { x: x + dx * off, y: y + dy * off, ang: f.ang + rnd(-0.2, 0.2), phase: f.phase + 1.3, load: f.load * 0.8 }));
      return [f];
  } },
  { name: 'Комок глины', run(x, y) {
      blob(x + rnd(-6, 6), y + rnd(-6, 6), rnd(14, 22), rnd(1.6, 2.3), 0.35);
      const f = finger(x, y, { load: 1.2, dry: 0.05 });
      print(f);
      specks(x, y, 26, irnd(5, 10));
      return [f];
  } },
  { name: 'Ладонь', run(x, y) {
      const ang = rnd(-0.5, 0.5), ca = Math.cos(ang), sa = Math.sin(ang);
      const rx = rnd(48, 60), ry = rnd(40, 50), k = Math.random() * 50, load = rnd(1.2, 1.6);
      const cr = [[rnd(0.2, 0.5), rnd(-0.5, -0.2)], [rnd(-0.4, -0.1), rnd(0, 0.25)], [rnd(0.3, 0.6), rnd(0.3, 0.5)]];
      box(x, y, Math.max(rx, ry) * 1.5, (px, py, dx, dy, i, t) => {
        const u = (dx * ca + dy * sa) / rx, v = (-dx * sa + dy * ca) / ry;
        const r = Math.hypot(u, v);
        const wx = px / S, wy = py / S;
        const n = fbm(wx * 0.05 + k, wy * 0.05);
        const edge = clamp01((1.0 + (n - 0.5) * 0.6 - r) / 0.25);
        if (edge <= 0) return;
        let crease = 1;
        for (const [a, b] of cr) {
          const dv = Math.abs(v - (a * u * u + b));
          crease *= clamp01(dv * ry / 2.2);
        }
        const skin = 0.6 + 0.4 * vnoise(wx * 0.9 + k, wy * 0.9);
        const cov = clamp01((fbm(wx * 0.03 + k, wy * 0.03) - 0.25) / 0.25);
        const gob = clamp01((fbm(wx * 0.12 - k, wy * 0.12) - 0.6) * 4);
        deposit(i, load * edge * (0.25 + 0.75 * crease) * skin * cov + gob * edge, t);
      });
      return [finger(x, y, { size: 1.6, load: 0.9 })];
  } },
  { name: 'Шликер с подтёками', run(x, y) {
      const rad = rnd(22, 34), k = Math.random() * 50;
      box(x, y, rad * 1.6, (px, py, dx, dy, i, t) => {
        const ang = Math.atan2(dy, dx);
        const wob = 1 + (vnoise(Math.cos(ang) * 2.5 + k, Math.sin(ang) * 2.5 + k) - 0.5) * 0.6;
        const r = Math.hypot(dx, dy) / rad / wob;
        if (r >= 1) return;
        const ring = Math.exp(-Math.pow((1 - r) * 9, 2)) * 0.9;   // darker drying edge
        deposit(i, 0.45 * (0.8 + 0.4 * fbm(px / S * 0.1 + k, py / S * 0.1)) + ring, t);
      });
      const n = irnd(1, 3);
      for (let j = 0; j < n; j++) drip(x + rnd(-rad * 0.7, rad * 0.7), y + rad * 0.7, rnd(25, 90), rnd(2, 3.5), 1.2);
      return [finger(x, y, { load: 0.8, dry: 0.1 })];
  } },
  { name: 'Брызги', run(x, y) {
      blob(x, y, rnd(6, 10), 1.8, 0.4);
      const n = irnd(18, 34);
      for (let j = 0; j < n; j++) {
        const a = Math.random() * Math.PI * 2, d = 10 + Math.pow(Math.random(), 1.6) * 90;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        const rr = Math.max(1, rnd(1.5, 6) * (1 - d / 170));
        if (Math.random() < 0.25) {
          for (let s = 0; s < 10; s++) dot(px + Math.cos(a) * s * 1.2, py + Math.sin(a) * s * 1.2, rr * (1 - s / 12), 1.2);
        } else dot(px, py, rr, rnd(1, 2));
      }
      return [finger(x, y, { load: 0.9 })];
  } },
  { name: 'Протёр пальцами', run(x, y) {
      const a = rnd(-Math.PI, Math.PI), dx = Math.cos(a), dy = Math.sin(a);
      const nx = -dy, ny = dx, n = irnd(1, 3), len = rnd(90, 170), long = Math.random() < 0.4 ? irnd(0, n - 1) : -1;
      const out = [];
      for (let j = 0; j < n; j++) {
        const o = j - (n - 1) / 2;
        const f = finger(x + nx * o * 40 - dx * Math.abs(o) * 8, y + ny * o * 40 - dy * Math.abs(o) * 8, { size: 0.95, load: rnd(1.2, 1.6) }); if (j === long) { f.rx *= 1.6; f.ry *= 1.2; }
        print(f);
        autoSmear(f, dx, dy, len * (1 - Math.abs(o) * 0.15), 0.988);
        out.push(f);
      }
      return out;
  } },
  { name: 'Сухая крошка', run(x, y) {
      const f = finger(x, y, { load: rnd(0.6, 0.8), dry: rnd(0.35, 0.45), gobs: 0.3, cut: Math.random() < 0.5 ? [rnd(-1, 1), rnd(-1, 1), rnd(-0.1, 0.3)] : null });
      print(f);
      const n = irnd(14, 26);
      for (let j = 0; j < n; j++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 34;
        blob(x + Math.cos(a) * d, y + Math.sin(a) * d * 1.2, rnd(1.5, 5), rnd(1.2, 2.4), 0.3);
      }
      return [f];
  } },
  { name: 'Два пальца', run(x, y) {
      const base = rnd(-0.5, 0.5), gap = rnd(40, 48) * 1.3;
      const out = [];
      for (const o of [-0.5, 0.5]) {
        const f = finger(x + Math.cos(base) * o * gap, y + Math.sin(base) * o * gap + (o > 0 ? rnd(-6, 4) : 0),
                         { ang: base + o * 0.2 + rnd(-0.08, 0.08), size: o > 0 ? rnd(0.98, 1.08) : rnd(0.9, 1.0), load: rnd(1.2, 1.6) });
        print(f); out.push(f);
      }
      if (Math.random() < 0.4) specks(x, y, 30, (Math.random() * 3) | 0);
      return out;
  } },
  { name: 'Длинные пальцы', run(x, y) {
      if (Math.random() < 0.5) return longFinger(x, y);
      const base = rnd(-0.4, 0.4), gap = rnd(42, 48) * 1.3;
      return [
        ...longFinger(x - Math.cos(base) * gap / 2, y - Math.sin(base) * gap / 2, { ang: base - 0.08 }),
        ...longFinger(x + Math.cos(base) * gap / 2, y + Math.sin(base) * gap / 2 - 6, { ang: base + 0.08, size: 1.05 })
      ];
  } }
];

const kept = [0, 4];   // «Жирный отпечаток» and «Комок глины», mixed at random

if (!live) { alloc(); const render = () => { shade(0, 0, W - 1, H - 1, now() + 100); ctx.putImageData(img, 0, 0); };
  return { variants, finger, print, autoSmear, render,
    soak(hold, done) {   // the clay soaks away exactly as the marks on the page do: after a pause, every pixel thins out step by step, the thin film first and the thick lumps last
      const t0 = now(); let last = t0;
      (function step() { const t = now(); if (t - t0 < hold) return requestAnimationFrame(step);
        let left = false; if (t - last >= FADE_STEP) { last = t; for (let i = 0; i < T.length; i++) { const v = T[i]; if (v > 0) { const nv = v * 0.913 - 0.0054; T[i] = nv > 0.003 ? nv : 0; if (T[i] > 0) left = true; } } render(); } else left = true;
        if (left) requestAnimationFrame(step); else { render(); if (done) done(); } })(); } }; }   // a still sheet: no hands; it fades only when asked

/* ---------- input ---------- */
const hands = new Map();
const empty = el => !el.closest('a, .pic, .hc, .more, [data-year], .partner, .ov, nav, button, .close-cursor');

function quick(x, y, R) {                                              // a mark left by a click on a link, a picture or a window: it melts away sooner
  const t = now() - (HOLD - 0.7), x0 = Math.max(0, (x - R) * S | 0), x1 = Math.min(W - 1, (x + R) * S | 0), y0 = Math.max(0, (y - R) * S | 0), y1 = Math.min(H - 1, (y + R) * S | 0);
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const i = yy * W + xx; if (T[i] > 0 && D[i] > t) D[i] = t; }
}
// every click leaves a print, but never more than three fingers in one place: clicks close together while the marks are fresh share that budget, and once it is spent a click leaves nothing until they dry
const recent = [];
const room = (x, y) => { const t = now(); for (let i = recent.length - 1; i >= 0; i--) if (t - recent[i].t > HOLD + 1) recent.splice(i, 1);
  return 3 - recent.reduce((n, r) => n + (Math.hypot(r.x - x, r.y - y) < 170 ? r.n : 0), 0); };
addEventListener('pointerdown', e => {
  if (e.button) return;
  const left = room(e.clientX, e.clientY), keep = n => recent.push({ x: e.clientX, y: e.clientY, t: now(), n });
  if ((window.clayBlocked && window.clayBlocked()) || !empty(e.target)) {   // on a link, a picture or in a view: a quick print that goes sooner, no smear
    if (left >= 1) { (Math.random() < 0.5 ? variants[0] : variants[4]).run(e.clientX, e.clientY); keep(1); quick(e.clientX, e.clientY, 140); }
    return;
  }
  let fs;
  if (left <= 0) fs = [finger(e.clientX, e.clientY, { load: rnd(1.45, 1.85) })];   // the budget is spent: no new print, but a drag still smears
  else { const v = variants[kept[(Math.random() * kept.length) | 0]];   // one finger or a lump: small and middle-sized marks only, never the big several-finger blots
    fs = v.run(e.clientX, e.clientY) || []; keep(1); }
  hands.set(e.pointerId, { fs, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, smearing: false });
});

addEventListener('pointermove', e => {
  const h = hands.get(e.pointerId);
  if (!h || !h.fs.length) return;
  if (!e.buttons) { release(e); return; }                        // the button went up where we did not hear it
  const nx = e.clientX, ny = e.clientY;
  if (!h.smearing && Math.hypot(nx - h.sx, ny - h.sy) < 4) return;
  if (!h.smearing) { getSelection().removeAllRanges(); document.documentElement.style.userSelect = 'none'; }
  h.smearing = true; h.tx = nx; h.ty = ny;                       // only remember where the pointer is: the frame loop draws as much as it can afford
});

// each frame spends a fixed budget of smear steps, so a fast hand or a big mark never freezes the page; the trail simply follows a little behind
function pump() {
  for (const h of hands.values()) {
    if (!h.smearing) continue;
    const dx = h.tx - h.x, dy = h.ty - h.y, dist = Math.hypot(dx, dy); if (dist < 1) continue;
    const n = Math.max(2, Math.floor(10 / h.fs.length)), len = Math.min(dist, n * 3), st = Math.max(1, Math.ceil(len / 3)), ux = dx / dist, uy = dy / dist;
    for (const f of h.fs) {
      const bx = f.x, by = f.y;
      for (let k = 1; k <= st; k++) { f.x = bx + ux * len * k / st; f.y = by + uy * len * k / st; smear(f, ux, uy); f.load *= 0.9747; }       // the paint lasts longer (20% more than before)
    }
    h.x += ux * len; h.y += uy * len;
  }
}

function release(e) {
  const h = hands.get(e.pointerId);
  hands.delete(e.pointerId);
  if (!hands.size) document.documentElement.style.userSelect = '';
  if (h && h.smearing) for (const f of h.fs) {
    if (f.load > 0.6) print(Object.assign({}, f, { load: f.load * 0.7, ang: f.ang + rnd(-0.3, 0.3), haze: 0.05 }));
  }
}
addEventListener('pointerup', release);
addEventListener('pointercancel', release);

// Marks slowly sink away: after HOLD seconds each pixel thins out until the sheet is white again.
function fade(t) {
  const tw = Math.ceil(W / TILE);
  for (const idx of content) {
    const x0 = (idx % tw) * TILE, y0 = Math.floor(idx / tw) * TILE;
    const x1 = Math.min(W - 1, x0 + TILE - 1), y1 = Math.min(H - 1, y0 + TILE - 1);
    let left = false, changed = false;
    for (let y = y0; y <= y1; y++) {
      for (let i = y * W + x0, e = y * W + x1; i <= e; i++) {
        let v = T[i];
        if (v <= 0) continue;
        if (t - D[i] > HOLD) {
          v = FAST ? v * 0.86 - 0.009 : v * 0.913 - 0.0054;
          T[i] = v > 0.003 ? v : 0;
          changed = true;
        }
        if (T[i] > 0) left = true;
      }
    }
    if (changed && !tiles.has(idx)) {
      shade(x0, y0, x1, y1, t);
      ctx.putImageData(img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }
    if (!left) content.delete(idx);
  }
}

let shown = true;
function tick() {
  pump();
  const any = content.size > 0 || tiles.size > 0;                // with no clay on it the blended layer is taken out of the page, so it costs nothing and cannot smear what moves under it
  if (any !== shown) { shown = any; cv.style.display = any ? 'block' : 'none'; }
  const t = now(), tw = Math.ceil(W / TILE);
  if (t - lastFade >= FADE_STEP) { lastFade = t; fade(t); }
  for (const [idx, until] of tiles) {
    const x0 = (idx % tw) * TILE, y0 = Math.floor(idx / tw) * TILE;
    const x1 = Math.min(W - 1, x0 + TILE - 1), y1 = Math.min(H - 1, y0 + TILE - 1);
    shade(x0, y0, x1, y1, t);
    ctx.putImageData(img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    if (t > until) tiles.delete(idx);
  }
  requestAnimationFrame(tick);
}

let rt = 0;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(alloc, 150); });
alloc();
requestAnimationFrame(tick);
}
