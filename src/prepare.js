'use strict';

// Sezione "Preparazione & Emergenza" (Milestone 1.1-A1).
// Overlay accessibile con contenuti statici (consultabili offline), navigazione
// a schede (Prima / Durante / Dopo / Numeri utili). Nessuna libreria, nessun
// backend, nessuna previsione: solo informazioni di supporto.

const $ = id => document.getElementById(id);

export function initPrepare() {
  const overlay = $('prepOverlay');
  const openBtn = $('prepBtn');
  const closeBtn = $('prepClose');
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
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });

  // Navigazione a schede accessibile (role=tab/tabpanel, frecce sinistra/destra).
  const tabs = Array.from(overlay.querySelectorAll('[role="tab"]'));

  function selectTab(tab) {
    tabs.forEach(t => {
      const selected = t === tab;
      t.setAttribute('aria-selected', selected ? 'true' : 'false');
      t.tabIndex = selected ? 0 : -1;
      const panel = $(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });
}
