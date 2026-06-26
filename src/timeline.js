'use strict';

import { fmtTime } from './geo.js';

// Timeline temporale con playback leggero (a passi discreti, niente animazioni
// per-frame pesanti). Il cursore filtra gli eventi con time <= cursore; al
// massimo (valore 100) mostra tutti (cursore = null).

const STEPS = 40;        // numero di passi del playback
const INTERVAL_MS = 320; // intervallo fra i passi

let onChange = null;     // callback(cursorMs | null)
let minT = 0;
let maxT = 0;
let timer = null;

const $ = id => document.getElementById(id);

function cursorFromValue(v) {
  if (v >= 100 || maxT <= minT) return null; // "Tutti"
  return minT + (v / 100) * (maxT - minT);
}

function updateLabel(v) {
  const cur = cursorFromValue(v);
  $('tlLabel').textContent = cur == null ? 'Tutti' : fmtTime(cur);
}

function setPlayIcon(playing) {
  $('tlPlay').textContent = playing ? '⏸' : '▶';
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  setPlayIcon(false);
}

function emit(v) {
  updateLabel(v);
  if (onChange) onChange(cursorFromValue(v));
}

function play() {
  const range = $('tlRange');
  // Se siamo già alla fine, riparti dall'inizio.
  if (Number(range.value) >= 100) range.value = '0';
  setPlayIcon(true);
  timer = setInterval(() => {
    let v = Number(range.value) + 100 / STEPS;
    if (v >= 100) {
      v = 100;
      range.value = String(v);
      emit(v);
      stop();
      return;
    }
    range.value = String(v);
    emit(v);
  }, INTERVAL_MS);
}

// Inizializza i controlli. `cb(cursorMs|null)` viene chiamata ad ogni variazione.
export function initTimeline(cb) {
  onChange = cb;
  const range = $('tlRange');
  const playBtn = $('tlPlay');

  range.addEventListener('input', () => {
    stop(); // lo scrub manuale interrompe il playback
    emit(Number(range.value));
  });
  playBtn.addEventListener('click', () => {
    if (timer) stop();
    else play();
  });
}

// Imposta l'intervallo temporale dei dati e riporta il cursore a "Tutti".
export function setTimelineRange(minTime, maxTime) {
  minT = minTime || 0;
  maxT = maxTime || 0;
  stop();
  const range = $('tlRange');
  range.value = '100';
  const disabled = !(maxT > minT);
  range.disabled = disabled;
  $('tlPlay').disabled = disabled;
  updateLabel(100);
}
