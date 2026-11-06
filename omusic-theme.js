/* Aplicar la preferencia antes de pintar la página evita destellos al recargar. */
(() => {
  'use strict';
  const key = 'omusic_theme';
  const root = document.documentElement;
  const system = window.matchMedia?.('(prefers-color-scheme: dark)');
  let selected = 'dark';
  const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>';
  const moon = '<path d="M20.5 14.1A8.7 8.7 0 0 1 9.9 3.5a9 9 0 1 0 10.6 10.6Z"/>';
  function sync() {
    const button = document.getElementById('om-theme-toggle');
    if (!button) return;
    const light = root.dataset.theme === 'light';
    const label = light ? 'Activar modo oscuro' : 'Activar modo claro';
    button.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (light ? moon : sun) + '</svg>';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.setAttribute('aria-pressed', String(light));
  }
  function set(mode, persist = true) {
    selected = ['light','dark','system'].includes(mode) ? mode : 'dark';
    const resolved = selected === 'system' ? (system?.matches ? 'dark' : 'light') : selected;
    root.dataset.themeMode = selected;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = resolved === 'light' ? '#f4f8f5' : '#080a0b';
    if (persist) { try { localStorage.setItem(key, selected); } catch {} }
    sync();
    window.dispatchEvent(new CustomEvent('omusic-theme-change',{detail:{mode:selected,resolved}}));
  }
  let saved = 'dark';
  try { saved = localStorage.getItem(key) || saved; } catch {}
  window.OMTheme = { set, sync, get mode(){return selected;}, toggle: () => set(root.dataset.theme === 'light' ? 'dark' : 'light') };
  set(saved, false);
  document.addEventListener('DOMContentLoaded', sync, { once: true });
  window.addEventListener('storage', event => { if (event.key === key) set(event.newValue, false); });
  system?.addEventListener?.('change',()=>{if(selected==='system')set('system',false);});
})();
