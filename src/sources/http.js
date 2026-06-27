'use strict';

import { REQUEST_TIMEOUT_MS } from '../config.js';

// Fetch JSON con timeout esplicito (AbortController) e CLASSIFICAZIONE dell'errore.
// L'errore lanciato espone `kind`:
//   'timeout' | 'server' (HTTP 5xx) | 'client' (HTTP 4xx) | 'network' (rete/CORS/parse)
// e, per gli HTTP, `status`.
//
// Ritenta UNA volta i soli errori TRANSITORI (5xx o rete), utile perché alcune
// sorgenti (es. INGV FDSN) restituiscono 500 in modo intermittente. NON ritenta i
// timeout (si preferisce il fallback rapido) né i 4xx (errore della richiesta).
export async function fetchJson(url, { retries = 1, retryDelayMs = 700 } = {}) {
  let lastErr = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
      if (!res.ok) {
        const e = new Error('HTTP ' + res.status);
        e.kind = res.status >= 500 ? 'server' : 'client';
        e.status = res.status;
        throw e;
      }
      return await res.json();
    } catch (err) {
      let e = err;
      if (err && err.name === 'AbortError') {
        e = new Error('timeout');
        e.kind = 'timeout';
      } else if (!e || e.kind == null) {
        // Errore di rete/CORS o parsing JSON non valido.
        const wrapped = new Error((e && e.message) || 'network');
        wrapped.kind = 'network';
        e = wrapped;
      }
      lastErr = e;

      const retriable = e.kind === 'server' || e.kind === 'network';
      if (attempt < retries && retriable) {
        await new Promise(r => setTimeout(r, retryDelayMs));
        continue; // nuovo tentativo
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}
