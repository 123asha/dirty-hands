// The published copy of the site, in _build/: the committed files as they are, every script minified (the files and the scripts inside the pages);
// the readable source stays in main, GitHub Pages shows _build from the gh-pages branch (tools/publish.sh)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { minify } from 'terser';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, '_build');
const NOTE = '/*! © 2026 Dirty Hands. All rights reserved. */';
const opts = { compress: { passes: 2 }, mangle: true, format: { comments: false, preamble: NOTE } };   // top-level names are left as they are: the scripts of a page call each other by them

fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
execSync(`git archive HEAD | tar -x -C "${out}"`, { cwd: root, stdio: 'inherit', shell: '/bin/bash' });   // exactly what is committed, nothing else (no originals, no local edits)
fs.rmSync(path.join(out, 'tools'), { recursive: true, force: true }); fs.rmSync(path.join(out, '.gitignore'), { force: true });
fs.writeFileSync(path.join(out, '.nojekyll'), '');   // GitHub Pages serves the files exactly as they are, without its own processing

let before = 0, after = 0;
for (const f of fs.readdirSync(out).filter(f => f.endsWith('.js'))) {
  const p = path.join(out, f), src = fs.readFileSync(p, 'utf8'), r = await minify(src, opts);
  fs.writeFileSync(p, r.code); before += src.length; after += r.code.length; }
for (const f of fs.readdirSync(out).filter(f => f.endsWith('.html'))) {
  const p = path.join(out, f); let html = fs.readFileSync(p, 'utf8'); const parts = [];
  let last = 0; const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g; let m;
  while ((m = re.exec(html))) { const attrs = m[1] || '', body = m[2];
    const plain = !/\bsrc=/.test(attrs) && body.trim() && (!/\btype=/.test(attrs) || /type="module"/.test(attrs));   // classic and module scripts; not JSON (ld+json, importmap) nor external ones
    parts.push(html.slice(last, m.index)); last = m.index + m[0].length;
    if (!plain) { parts.push(m[0]); continue; }
    const r = await minify(body, { ...opts, module: /type="module"/.test(attrs), format: { comments: false } });
    parts.push(`<script${attrs}>${r.code}</script>`); before += body.length; after += r.code.length; }
  parts.push(html.slice(last)); fs.writeFileSync(p, parts.join('')); }
console.log(`scripts ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB, in ${path.relative(root, out)}/`);
