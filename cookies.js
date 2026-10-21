// the cookie note: shown once, on the first visit to any page, and gone for good after OK (remembered in this browser only)
(() => {
  let seen = false; try { seen = localStorage.getItem('dh-cookies') === '1'; } catch (e) {}
  if (seen) return;
  const css = document.createElement('style');
  css.textContent = `.ck { position: fixed; left: 50%; bottom: calc(20px + env(safe-area-inset-bottom)); translate: -50% 12px; z-index: 5000; width: min(440px, calc(100vw - 32px)); box-sizing: border-box; padding: 16px; background: #fff; color: #000; border: 1px solid #000;
    font-family: "CoFo Sans", -apple-system, "Helvetica Neue", Arial, sans-serif; font-size: 15px; line-height: 19px; letter-spacing: -.01em; opacity: 0; transition: opacity .5s cubic-bezier(.2,.8,.2,1), translate .5s cubic-bezier(.2,.8,.2,1); }
    .ck.on { opacity: 1; translate: -50% 0; }
    .ck p { margin: 0; }
    .ck button { all: unset; cursor: pointer; margin-top: 16px; display: inline-block; padding-bottom: .12em; background: linear-gradient(currentColor, currentColor) 100% 100% / 100% 1px no-repeat; transition: background-size .9s cubic-bezier(.4,0,.2,1); }
    .ck button:hover { background-size: 0 1px; }`;
  const box = document.createElement('div'); box.className = 'ck'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Cookies');
  box.innerHTML = '<p>This site uses only essential cookies and your browser’s storage, to keep a few settings such as the sound. Nothing is used to track you.</p><button type="button">OK</button>';
  const show = () => { document.head.append(css); document.body.append(box); requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('on'))); };
  box.querySelector('button').addEventListener('click', () => { try { localStorage.setItem('dh-cookies', '1'); } catch (e) {} box.classList.remove('on'); setTimeout(() => box.remove(), 600); });
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', () => setTimeout(show, 1200)); else setTimeout(show, 1200);
})();
