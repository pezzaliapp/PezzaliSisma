'use strict';

import { REQUEST_TIMEOUT_MS } from '../config.js';

// Fetch JSON con timeout esplicito (AbortController). Lancia un errore chiaro
// in caso di timeout, problema di rete o risposta non valida.
export async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
