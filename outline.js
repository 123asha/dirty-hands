// the outline of a work, traced from its own photo (shared by the full page and the phone page): the figure is read from the picture's transparency, or, on a photo with a plain background, from where it differs from that background; then its left and right edges, row by row, become one closed line in a 52 × 52 box
(() => {
  const N = 36, S = 120, cache = {};
  function trace(img) {
    const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d', { willReadFrequently: true });
    const sc = Math.min(S / img.width, S / img.height), dw = img.width * sc, dh = img.height * sc, ox = (S - dw) / 2, oy = (S - dh) / 2; g.drawImage(img, ox, oy, dw, dh);
    const d = g.getImageData(0, 0, S, S).data, px = (x, y) => (Math.round(y) * S + Math.round(x)) * 4;
    const cs = [[ox + 1, oy + 1], [ox + dw - 2, oy + 1], [ox + 1, oy + dh - 2], [ox + dw - 2, oy + dh - 2]].map(([x, y]) => px(x, y));
    const alpha = cs.some(i => d[i + 3] < 200), bg = [0, 1, 2].map(c => cs.reduce((a, i) => a + d[i + c], 0) / 4);   // a cut-out (transparent corners), or a photo on its own plain ground
    const on = (x, y) => { const i = (y * S + x) * 4; if (alpha) return d[i + 3] > 60; if (d[i + 3] < 60) return false; return Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 48; };
    const L = [], R = [];
    for (let y = 0; y < S; y++) { let l = -1, r = -1; for (let x = 0; x < S; x++) if (on(x, y)) { if (l < 0) l = x; r = x; } L.push(l); R.push(r); }
    // a row is part of the figure only where enough of it is: stray specks and shadows at the very edges are left out
    const rows = L.map((l, y) => l >= 0 && R[y] - l > 2 ? y : -1).filter(y => y >= 0); if (rows.length < 4) return null;
    const y0 = rows[0], y1 = rows[rows.length - 1], at = (A, y) => { for (let k = 0; k < S; k++) { for (const yy of [y - k, y + k]) if (yy >= y0 && yy <= y1 && L[yy] >= 0) return A[yy]; } return S / 2; };
    const sl = [], sr = [];
    for (let n = 0; n < N; n++) { const y = Math.round(y0 + (y1 - y0) * n / (N - 1)); sl.push(at(L, y)); sr.push(at(R, y) + 1); }
    const smooth = A => A.map((v, i) => i === 0 || i === A.length - 1 ? v : (A[i - 1] + 2 * v + A[i + 1]) / 4);   // a hand-drawn line, not the pixel steps
    const ls = smooth(sl), rs = smooth(sr), m = v => 4 + v * 44 / S, P = [];
    for (let n = 0; n < N; n++) P.push(m(rs[n]), m(y0 + (y1 - y0) * n / (N - 1)));              // down the right edge
    for (let n = N - 1; n >= 0; n--) P.push(m(ls[n]), m(y0 + (y1 - y0) * n / (N - 1)));         // and back up the left one
    return P;
  }
  // P: the outline as [x, y, x, y, ...] (always the same number of points, so one outline can flow into the next)
  window.outlineOf = (src, cb) => {
    const c = cache[src]; if (c && c.P !== undefined) return cb(c.P); if (c) return c.wait.push(cb);
    const e = cache[src] = { wait: [cb] }, img = new Image();
    img.onload = () => { try { e.P = trace(img); } catch (err) { e.P = null; } e.wait.forEach(f => f(e.P)); e.wait = []; };
    img.onerror = () => { e.P = null; e.wait.forEach(f => f(null)); e.wait = []; };
    img.src = src;
  };
  window.outlineD = P => { let s = ''; for (let i = 0; i < P.length; i += 2) s += (i ? 'L' : 'M') + P[i].toFixed(2) + ' ' + P[i + 1].toFixed(2); return s + 'Z'; };
})();
