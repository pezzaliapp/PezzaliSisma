'use strict';

// "La mia famiglia" (Milestone 1.1-A2): luoghi importanti salvati SOLO su questo
// dispositivo (localStorage), mai trasmessi. Nessun backend, nessuna Modalità
// Evento (quella è A5): qui solo creazione, elenco ed eliminazione.

import { PLACES_KEY } from './config.js';
import { state } from './state.js';
import { locateOnce, geoErrorMessage } from './geolocation.js';
import { refreshShake } from './shakemap.js';

const $ = id => document.getElementById(id);

// Soglia (gradi) sotto la quale le coordinate coincidono con (0,0): ~0.0001° ≈
// 11 m. Un luogo a 0.0000, 0.0000 ("Null Island", oceano aperto) non è un luogo
// reale dell'utente: spesso è il risultato di un rilevamento GPS fallito.
const COORD_EPS = 1e-4;

// Valida una coppia di coordinate. Ritorna un messaggio d'errore o null se ok.
function validateCoords(la, lo) {
  if (!Number.isFinite(la) || la < -90 || la > 90) return 'Latitudine non valida (-90…90).';
  if (!Number.isFinite(lo) || lo < -180 || lo > 180) return 'Longitudine non valida (-180…180).';
  if (Math.abs(la) < COORD_EPS && Math.abs(lo) < COORD_EPS) {
    return 'Coordinate 0.0000, 0.0000 non valide: indica un luogo reale o usa «Usa la mia posizione attuale».';
  }
  return null;
}

// --- Persistenza (device-only) ---------------------------------------------

export function loadPlaces() {
  try {
    const raw = localStorage.getItem(PLACES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    state.places = Array.isArray(arr) ? arr : [];
  } catch {
    state.places = [];
  }
  return state.places;
}

function persist() {
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify(state.places));
  } catch {
    /* storage non disponibile: il luogo resta comunque in memoria per la sessione */
  }
}

function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'p' + Date.now() + Math.round(Math.random() * 1e6);
}

// Aggiunge un luogo validato. Ritorna { ok, error }.
export function addPlace({ label, name, lat, lon, note }) {
  const la = Number(lat);
  const lo = Number(lon);
  const err = validateCoords(la, lo);
  if (err) return { ok: false, error: err };
  const place = {
    id: newId(),
    label: (label || 'Altro').trim(),
    name: (name || '').trim(),
    lat: la,
    lon: lo,
    note: (note || '').trim()
  };
  state.places.push(place);
  persist();
  return { ok: true };
}

// Modifica in-place di un luogo esistente. Ritorna { ok, error }.
export function updatePlace(id, { label, name, lat, lon, note }) {
  const idx = state.places.findIndex(p => p.id === id);
  if (idx === -1) return { ok: false, error: 'Luogo non trovato.' };
  const la = Number(lat);
  const lo = Number(lon);
  const err = validateCoords(la, lo);
  if (err) return { ok: false, error: err };
  state.places[idx] = {
    ...state.places[idx],
    label: (label || 'Altro').trim(),
    name: (name || '').trim(),
    lat: la,
    lon: lo,
    note: (note || '').trim()
  };
  persist();
  return { ok: true };
}

export function removePlace(id) {
  state.places = state.places.filter(p => p.id !== id);
  persist();
}

export function clearPlaces() {
  state.places = [];
  persist();
}

// --- Rendering --------------------------------------------------------------

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function renderPlaces() {
  const list = $('placeList');
  const clearBtn = $('placeClear');
  if (!list) return;

  if (!state.places.length) {
    list.innerHTML = '<p class="placeEmpty">Nessun luogo salvato.</p>';
    if (clearBtn) clearBtn.hidden = true;
    return;
  }
  if (clearBtn) clearBtn.hidden = false;

  list.innerHTML = state.places.map(p => {
    const title = p.name ? `${escapeHtml(p.label)} — ${escapeHtml(p.name)}` : escapeHtml(p.label);
    const coords = `${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}`;
    const note = p.note ? `<small class="placeNote">${escapeHtml(p.note)}</small>` : '';
    return (
      `<div class="placeItem">` +
      `<div class="placeInfo"><strong>${title}</strong><small>${coords}</small>${note}</div>` +
      `<div class="placeActions">` +
      `<button type="button" class="ghost placeEdit" data-id="${p.id}" aria-label="Modifica ${title}">Modifica</button>` +
      `<button type="button" class="ghost danger placeDel" data-id="${p.id}" aria-label="Elimina ${title}">Elimina</button>` +
      `</div>` +
      `</div>`
    );
  }).join('');
}

// --- Wiring -----------------------------------------------------------------

export function initPlaces() {
  const form = $('placeForm');
  if (!form) return;

  loadPlaces();
  renderPlaces();

  const msg = $('placeMsg');
  const saveBtn = $('placeSave');
  const cancelBtn = $('placeCancel');
  let editingId = null; // null = aggiunta; altrimenti id del luogo in modifica

  const setMsg = (text, isError) => {
    if (!msg) return;
    msg.textContent = text || '';
    msg.classList.toggle('isError', !!isError);
  };

  const readForm = () => ({
    label: $('placeLabel').value,
    name: $('placeName').value,
    lat: $('placeLat').value,
    lon: $('placeLon').value,
    note: $('placeNote').value
  });

  const clearForm = () => {
    $('placeLabel').selectedIndex = 0;
    $('placeName').value = '';
    $('placeLat').value = '';
    $('placeLon').value = '';
    $('placeNote').value = '';
  };

  const exitEdit = () => {
    editingId = null;
    if (saveBtn) saveBtn.textContent = 'Salva luogo';
    if (cancelBtn) cancelBtn.hidden = true;
    clearForm();
  };

  const enterEdit = id => {
    const p = state.places.find(x => x.id === id);
    if (!p) return;
    editingId = id;
    $('placeLabel').value = p.label;
    $('placeName').value = p.name || '';
    $('placeLat').value = String(p.lat);
    $('placeLon').value = String(p.lon);
    $('placeNote').value = p.note || '';
    if (saveBtn) saveBtn.textContent = 'Salva modifiche';
    if (cancelBtn) cancelBtn.hidden = false;
    setMsg('Modifica del luogo in corso.');
    form.scrollIntoView({ block: 'nearest' });
    $('placeName').focus();
  };

  // "Usa la mia posizione attuale": riusa la posizione nota o ne richiede una.
  $('placeUsePos').addEventListener('click', async () => {
    if (state.userPos) {
      $('placeLat').value = state.userPos.lat.toFixed(5);
      $('placeLon').value = state.userPos.lon.toFixed(5);
      setMsg('Coordinate inserite dalla posizione attuale.');
      return;
    }
    setMsg('Rilevamento posizione…');
    try {
      const pos = await locateOnce();
      state.userPos = pos;
      $('placeLat').value = pos.lat.toFixed(5);
      $('placeLon').value = pos.lon.toFixed(5);
      setMsg('Coordinate inserite dalla posizione attuale.');
    } catch (err) {
      setMsg(geoErrorMessage(err), true);
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = readForm();
    const wasEditing = editingId != null;
    const res = wasEditing ? updatePlace(editingId, data) : addPlace(data);
    if (!res.ok) {
      setMsg(res.error, true);
      return;
    }
    exitEdit();
    setMsg(wasEditing ? 'Modifiche salvate su questo dispositivo.' : 'Luogo salvato su questo dispositivo.');
    renderPlaces();
    refreshShake(); // tiene allineata la scheda "Intensità stimata"
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      exitEdit();
      setMsg('Modifica annullata.');
    });
  }

  // Modifica / eliminazione singola (event delegation).
  $('placeList').addEventListener('click', e => {
    const editBtn = e.target.closest('.placeEdit');
    if (editBtn) {
      enterEdit(editBtn.getAttribute('data-id'));
      return;
    }
    const delBtn = e.target.closest('.placeDel');
    if (delBtn) {
      const id = delBtn.getAttribute('data-id');
      removePlace(id);
      if (editingId === id) exitEdit();
      renderPlaces();
      refreshShake(); // tiene allineata la scheda "Intensità stimata"
    }
  });

  // Cancella tutti.
  $('placeClear').addEventListener('click', () => {
    if (!state.places.length) return;
    clearPlaces();
    exitEdit();
    renderPlaces();
    refreshShake(); // tiene allineata la scheda "Intensità stimata"
    setMsg('Tutti i luoghi sono stati cancellati.');
  });
}
