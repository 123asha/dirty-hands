// the gymnasts in the pile, through a shader: a little domed and glazed like the other pictures of the site, and as they turn they seem to move by themselves.
// The three of them are separate pieces (photos/gym-1..3.webp, each in the same frame as the whole picture): each goes round at a speed of her own,
// and her arms and legs swing as you scroll (the picture bent about her middle, the more the further out), so they seem to move by themselves. Their own colours, no light or shadow added.
window.gymGL = (el, srcs) => {
  const cv = document.createElement('canvas'); cv.className = 'gym-gl'; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none';
  const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
  if (!gl) return null;
  const mk = (type, code) => { const sh = gl.createShader(type); gl.shaderSource(sh, code); gl.compileShader(sh); return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : (console.warn(gl.getShaderInfoLog(sh)), null); };
  const vs = mk(gl.VERTEX_SHADER, 'attribute vec2 a; varying vec2 v; void main(){ v = a * .5 + .5; gl_Position = vec4(a, 0., 1.); }');
  const fs = mk(gl.FRAGMENT_SHADER, `precision highp float;
    uniform sampler2D t1, t2, t3; uniform vec2 res; uniform float mv, t, tw, sp; varying vec2 v;
    vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c) * p; }
    vec4 tap(sampler2D tx, vec2 uv) { return (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) ? vec4(0.) : texture2D(tx, vec2(uv.x, 1. - uv.y)); }
    // one figure: carried round the middle of the picture a little ahead of or behind the others, and bent about its own middle, the more the further from it,
    // so the arms and the legs swing while the body holds: as if she were moving them herself
    vec2 place(vec2 q, float off, vec2 cen, float bend, float wob) {
      vec2 home = .5 + (cen - .5) * 1.12;                                // each a little further out from the middle than in the panel, and a little smaller: room between them, so they never touch
      vec2 d = (rot(q, -off) + .5 - home) / .9; float r = length(d);
      d = rot(d, -bend * (.35 + .65 * smoothstep(.0, .24, r)));   // the whole of her turns a little, the more the further out: the body and the legs move together, the angle between them opening and closing
      d += wob * vec2(sin(d.y * 12. + sp * 3.), sin(d.x * 11. - sp * 2.6));
      return cen + d; }   // (read from the picture where she stands in the panel)
    void main(){
      float asp = res.x / res.y;
      vec2 q = (v - .5) * vec2(max(asp, 1.), max(1. / asp, 1.)) * 1.16;   // the square picture held whole in the box, with room round it for the swinging limbs
      float r2 = min(dot(q, q) * 4., 1.);
      q *= 1. - .08 * (1. - r2);                                          // a slight dome: the middle comes a little towards us
      // each at a speed of her own: one goes round a little faster, one a little slower; and each swings her limbs on a rhythm of her own as you scroll
      float o1 = .08 * sin(sp * .9 + .4) - tw * .5, o2 = .08 * sin(sp * 1.2 + 2.3) + tw * .4, o3 = .07 * sin(sp * .7 + 4.4) - tw * .3;   // a little ahead or behind, never so far that they meet
      float b1 = .5 * sin(sp * 2.1 + .3) + tw * 1.4, b2 = .5 * sin(sp * 1.7 + 2.1) - tw * 1.3, b3 = .46 * sin(sp * 2.5 + 4.) + tw * 1.2;
      float wob = .006 + .014 * mv;
      vec4 c1 = tap(t1, place(q, o1, vec2(.632, .655), b1, wob)), c2 = tap(t2, place(q, o2, vec2(.370, .651), b2, wob)), c3 = tap(t3, place(q, o3, vec2(.514, .288), b3, wob));
      vec4 o = vec4(c1.rgb * c1.a, c1.a); o = vec4(c2.rgb * c2.a, c2.a) + (1. - c2.a) * o; o = vec4(c3.rgb * c3.a, c3.a) + (1. - c3.a) * o;
      gl_FragColor = o;
    }`);
  if (!vs || !fs) return null;
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = n => gl.getUniformLocation(pr, n);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); ready = false; running = false; cv.style.display = 'none'; el.classList.remove('gym-on'); });   // if the browser takes the drawing away, the plain picture of the gymnasts is there instead, never an empty space
  let ready = false, loaded = 0, on = false, running = false, spin = 0, last = null, mv = 0, tw = 0;
  srcs.forEach((src, k) => { const img = new Image(); img.onload = () => {
    gl.activeTexture(gl.TEXTURE0 + k); const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(u('t' + (k + 1)), k);
    if (++loaded === srcs.length) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); ready = true; if (on) { cv.style.display = ''; el.classList.add('gym-on'); start(); } }
  }; img.src = src; });
  const seen = () => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 2 && getComputedStyle(el).opacity !== '0'; };
  function frame(now) {
    if (!on || !ready || !seen()) { running = false; return; }   // nothing to draw off the screen: it starts again with the next scroll
    const vel = last == null ? 0 : spin - last; last = spin;
    mv += (Math.min(1, Math.abs(vel) / 2.5) - mv) * .08; tw += (Math.max(-.3, Math.min(.3, vel * .05)) - tw) * .1;
    const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(el.clientWidth * dpr), h = Math.round(el.clientHeight * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u('res'), w, h); gl.uniform1f(u('mv'), mv); gl.uniform1f(u('tw'), tw); gl.uniform1f(u('t'), now / 1000); gl.uniform1f(u('sp'), spin * Math.PI / 180);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }
  const start = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
  return {
    set(isOn, s) {   // from the page's own scroll handler: whether the gymnasts are showing, and how far they have turned (degrees)
      spin = s;
      if (isOn !== on) { on = isOn; if (on && cv.parentNode !== el) el.appendChild(cv); if (!on) { cv.style.display = 'none'; el.classList.remove('gym-on'); last = null; } }
      if (on && ready) { cv.style.display = ''; el.classList.add('gym-on'); start(); }
    }
  };
};
