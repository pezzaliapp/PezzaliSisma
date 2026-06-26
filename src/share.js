'use strict';

// Pulsante "Sto bene" (Milestone 1.1-A4): condivisione VOLONTARIA di un breve
// messaggio. Nessun invio automatico, nessun backend, nessuna trasmissione ai
// server dell'app. La Web Share API apre il menu del dispositivo: la scelta
// dell'app e l'invio sono interamente dell'utente. Fallback: copia negli appunti.
// Il messaggio NON include coordinate né dati personali in automatico.

export const DEFAULT_MESSAGE = 'Sto bene. Messaggio condiviso tramite PezzaliSisma.';

const $ = id => document.getElementById(id);

export function canWebShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

function canClipboard() {
  return typeof navigator !== 'undefined' && navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function';
}

// Condivide il testo tramite il menu del dispositivo (solo su gesto utente).
export async function shareText(text) {
  await navigator.share({ text });
}

// Copia il testo negli appunti; ritorna true se riuscito. Fallback con textarea
// temporanea + execCommand quando l'API Clipboard non è disponibile.
export async function copyText(text) {
  if (canClipboard()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* prova il fallback sottostante */
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}

export function initShare() {
  const input = $('shareInput');
  if (!input) return;

  const shareBtn = $('shareShare');
  const copyBtn = $('shareCopy');
  const unavail = $('shareUnavail');
  const msg = $('shareMsg');
  const setMsg = (text, isError) => {
    if (!msg) return;
    msg.textContent = text || '';
    msg.classList.toggle('isError', !!isError);
  };

  // Garantisce un testo predefinito non vuoto.
  if (!input.value.trim()) input.value = DEFAULT_MESSAGE;

  const supported = canWebShare();
  if (shareBtn) shareBtn.hidden = !supported;
  if (unavail) unavail.hidden = supported;

  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = input.value.trim() || DEFAULT_MESSAGE;
      try {
        await shareText(text);
        setMsg('Menu di condivisione aperto.');
      } catch (err) {
        // L'utente ha annullato: nessun errore da mostrare.
        if (err && err.name === 'AbortError') return;
        setMsg('Condivisione non riuscita: usa «Copia messaggio».', true);
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = input.value.trim() || DEFAULT_MESSAGE;
      const ok = await copyText(text);
      setMsg(ok ? 'Messaggio copiato negli appunti.' : 'Copia non riuscita: seleziona e copia manualmente.', !ok);
    });
  }
}
