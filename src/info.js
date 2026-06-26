'use strict';

// Box informativi (Come funziona / Fonti dati / Privacy / Limiti scientifici).
// Overlay accessibile, nessuna libreria: apertura/chiusura, ESC, focus.

const $ = id => document.getElementById(id);

export function initInfo() {
  const overlay = $('infoOverlay');
  const openBtn = $('infoBtn');
  const closeBtn = $('infoClose');
  const footerLink = $('infoLink');
  if (!overlay || !openBtn || !closeBtn) return;

  let lastFocus = null;

  function open() {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('noScroll');
    closeBtn.focus();
  }
  function close() {
    overlay.hidden = true;
    document.body.classList.remove('noScroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  if (footerLink) footerLink.addEventListener('click', e => { e.preventDefault(); open(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });
}
