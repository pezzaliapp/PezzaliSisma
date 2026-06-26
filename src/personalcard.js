'use strict';

// "Scheda personale" (Milestone 1.1-A3): dati facoltativi salvati SOLO su questo
// dispositivo (localStorage), mai trasmessi. Nessun backend, nessun fetch/beacon,
// nessuna cifratura (la protezione è il blocco schermo del dispositivo). Il
// blocco di visualizzazione con WebAuthn è rimandato ad A3-bis (piano dedicato).

import { PERSONAL_CARD_KEY } from './config.js';
import { state } from './state.js';

const $ = id => document.getElementById(id);

// Campi della scheda: chiave interna, id input nel DOM, etichetta, tipo.
const FIELDS = [
  { key: 'nome', el: 'cardNome', label: 'Nome' },
  { key: 'iceName', el: 'cardIceName', label: 'Contatto ICE' },
  { key: 'icePhone', el: 'cardIcePhone', label: 'Telefono ICE', tel: true },
  { key: 'blood', el: 'cardBlood', label: 'Gruppo sanguigno' },
  { key: 'allergie', el: 'cardAllergie', label: 'Allergie' },
  { key: 'farmaci', el: 'cardFarmaci', label: 'Farmaci importanti' },
  { key: 'patologie', el: 'cardPatologie', label: 'Patologie rilevanti' },
  { key: 'indirizzo', el: 'cardIndirizzo', label: 'Indirizzo' },
  { key: 'note', el: 'cardNote', label: 'Note' }
];

// --- Persistenza (device-only) ---------------------------------------------

export function loadCard() {
  try {
    const raw = localStorage.getItem(PERSONAL_CARD_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    state.card = obj && typeof obj === 'object' ? obj : null;
  } catch {
    state.card = null;
  }
  return state.card;
}

export function saveCard(data) {
  const card = {};
  for (const f of FIELDS) card[f.key] = (data[f.key] || '').trim();
  state.card = card;
  try {
    localStorage.setItem(PERSONAL_CARD_KEY, JSON.stringify(card));
  } catch {
    /* storage non disponibile: la scheda resta in memoria per la sessione */
  }
  return card;
}

export function clearCard() {
  state.card = null;
  try {
    localStorage.removeItem(PERSONAL_CARD_KEY);
  } catch {
    /* niente da fare */
  }
}

// True se la scheda contiene almeno un campo non vuoto.
function hasData(card) {
  return !!card && FIELDS.some(f => (card[f.key] || '').trim() !== '');
}

// --- Rendering --------------------------------------------------------------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Riempie il form con i dati salvati (o lo svuota).
function fillForm(card) {
  for (const f of FIELDS) {
    const node = $(f.el);
    if (node) node.value = card ? (card[f.key] || '') : '';
  }
}

// Riepilogo di sola lettura: mostra solo i campi non vuoti; il telefono ICE come
// link tel: (utile in emergenza).
export function renderCard() {
  const box = $('cardSummary');
  if (!box) return;
  if (!hasData(state.card)) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  const rows = FIELDS
    .filter(f => (state.card[f.key] || '').trim() !== '')
    .map(f => {
      const val = state.card[f.key].trim();
      let shown;
      if (f.tel) {
        const href = 'tel:' + val.replace(/\s+/g, '');
        shown = `<a href="${escapeHtml(href)}">${escapeHtml(val)}</a>`;
      } else {
        shown = escapeHtml(val).replace(/\n/g, '<br>');
      }
      return `<div class="cardRow"><span>${escapeHtml(f.label)}</span><b>${shown}</b></div>`;
    })
    .join('');
  box.innerHTML = '<h3>Scheda salvata</h3>' + rows;
  box.hidden = false;
}

// --- Wiring -----------------------------------------------------------------

export function initCard() {
  const form = $('cardForm');
  if (!form) return;

  loadCard();
  fillForm(state.card);
  renderCard();

  const msg = $('cardMsg');
  const setMsg = (text, isError) => {
    if (!msg) return;
    msg.textContent = text || '';
    msg.classList.toggle('isError', !!isError);
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = {};
    for (const f of FIELDS) data[f.key] = $(f.el) ? $(f.el).value : '';
    saveCard(data);
    renderCard();
    setMsg(hasData(state.card)
      ? 'Scheda salvata su questo dispositivo.'
      : 'Scheda vuota: nessun dato da salvare.');
  });

  $('cardClear').addEventListener('click', () => {
    if (!hasData(state.card) && !localStorage.getItem(PERSONAL_CARD_KEY)) {
      setMsg('Nessuna scheda da cancellare.');
      return;
    }
    const ok = typeof confirm === 'function'
      ? confirm('Cancellare tutti i dati della Scheda personale da questo dispositivo?')
      : true;
    if (!ok) return;
    clearCard();
    fillForm(null);
    renderCard();
    setMsg('Scheda cancellata da questo dispositivo.');
  });
}
