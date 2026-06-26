'use strict';

// Blocco di visualizzazione OPZIONALE della Scheda personale (Milestone 1.1-A3-bis).
//
// IMPORTANTE — questa NON è cifratura. I dati della scheda restano in chiaro in
// localStorage (PERSONAL_CARD_KEY). Questo modulo aggiunge solo un *blocco di
// visualizzazione*: quando attivo e supportato, prima di mostrare la scheda il
// browser chiede una conferma biometrica/PIN tramite l'autenticatore di
// piattaforma (WebAuthn). Nessun backend, nessuna trasmissione, nessun dato
// biometrico gestito dall'app (lo gestisce il sistema operativo). `crypto.getRandomValues`
// è usato SOLO per generare la challenge richiesta dall'API WebAuthn: è un
// generatore di numeri casuali, NON cifratura dei dati.
//
// Anti-lock-out: l'utente non resta mai chiuso fuori dai propri dati. Dalla
// schermata di blocco è sempre possibile "Disattiva blocco visualizzazione";
// se la biometria/PIN non è disponibile o fallisce, si usa un confirm() di
// conferma e il blocco viene comunque rimosso.

import { PERSONAL_LOCK_KEY } from './config.js';
import { state } from './state.js';

const $ = id => document.getElementById(id);

// --- Persistenza del solo flag (device-only) -------------------------------

export function loadLock() {
  try {
    const raw = localStorage.getItem(PERSONAL_LOCK_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    state.cardLocked = !!(obj && obj.enabled);
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    state.cardLocked = false;
    return null;
  }
}

export function saveLock(credId) {
  state.cardLocked = true;
  try {
    localStorage.setItem(PERSONAL_LOCK_KEY, JSON.stringify({ enabled: true, credId: credId || '' }));
  } catch {
    /* storage non disponibile: il flag resta in memoria per la sessione */
  }
}

export function clearLock() {
  state.cardLocked = false;
  state.cardUnlocked = false;
  try {
    localStorage.removeItem(PERSONAL_LOCK_KEY);
  } catch {
    /* niente da fare */
  }
}

// --- Stato della UI: funzione PURA (testabile senza DOM) --------------------
// Ritorna quali elementi mostrare in base a { enabled, unlocked, supported }.
export function computeView({ enabled, unlocked, supported }) {
  if (!enabled) {
    return { content: true, lockScreen: false, btnOn: !!supported, btnOff: false, btnNow: false, unavail: !supported };
  }
  if (unlocked) {
    return { content: true, lockScreen: false, btnOn: false, btnOff: true, btnNow: true, unavail: false };
  }
  return { content: false, lockScreen: true, btnOn: false, btnOff: true, btnNow: false, unavail: false };
}

// --- Helper base64url (per l'id opaco della credenziale) --------------------

function bufToB64url(buf) {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBuf(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const str = atob(b64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

function randomBytes(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b); // solo RNG per la challenge WebAuthn, NON cifratura
  return b;
}

// --- WebAuthn ---------------------------------------------------------------

export function isWebAuthnSupported() {
  return !!(window.PublicKeyCredential && navigator.credentials &&
    typeof navigator.credentials.create === 'function' &&
    typeof navigator.credentials.get === 'function');
}

async function isPlatformAvailable() {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

async function registerCredential() {
  const publicKey = {
    challenge: randomBytes(32),
    rp: { name: 'PezzaliSisma', id: location.hostname },
    user: { id: randomBytes(16), name: 'scheda-personale', displayName: 'Scheda personale' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
    timeout: 60000,
    attestation: 'none'
  };
  const cred = await navigator.credentials.create({ publicKey });
  return bufToB64url(cred.rawId);
}

async function assertCredential(credId) {
  const publicKey = {
    challenge: randomBytes(32),
    rpId: location.hostname,
    allowCredentials: credId ? [{ type: 'public-key', id: b64urlToBuf(credId) }] : [],
    userVerification: 'required',
    timeout: 60000
  };
  await navigator.credentials.get({ publicKey }); // lancia se annullato/fallito
  return true;
}

// --- Wiring -----------------------------------------------------------------

export function initCardLock() {
  const panel = $('panelScheda');
  if (!panel) return;

  const stored = loadLock();
  let credId = stored ? stored.credId : '';
  state.cardUnlocked = false;
  let supported = false;

  const msg = $('cardLockMsg');
  const setMsg = (text, isError) => {
    if (!msg) return;
    msg.textContent = text || '';
    msg.classList.toggle('isError', !!isError);
  };
  const setUnlockMsg = text => { const n = $('cardUnlockMsg'); if (n) n.textContent = text || ''; };

  const show = (id, on) => { const n = $(id); if (n) n.hidden = !on; };

  function apply() {
    const v = computeView({ enabled: state.cardLocked, unlocked: state.cardUnlocked, supported });
    show('cardContent', v.content);
    show('cardLockScreen', v.lockScreen);
    show('cardLockOn', v.btnOn);
    show('cardLockOff', v.btnOff);
    show('cardLockNow', v.btnNow);
    show('cardLockUnavail', v.unavail);
  }

  apply(); // stato iniziale (prima del check asincrono di disponibilità)

  // Disponibilità autenticatore di piattaforma (asincrona).
  isPlatformAvailable().then(ok => { supported = ok; apply(); });

  // Attiva blocco.
  const onBtn = $('cardLockOn');
  if (onBtn) onBtn.addEventListener('click', async () => {
    if (!isWebAuthnSupported()) { setMsg('Blocco non disponibile su questo browser.', true); return; }
    setMsg('Configurazione del blocco…');
    try {
      const id = await registerCredential();
      saveLock(id);
      credId = id; // aggiorna l'id usato da sblocco/disattiva in questa sessione
      state.cardUnlocked = true; // appena attivato: visibile in questa sessione
      apply();
      setMsg('Blocco di visualizzazione attivato.');
    } catch {
      setMsg('Attivazione annullata o non riuscita. La scheda resta utilizzabile normalmente.', true);
    }
  });

  // Sblocca (richiede conferma biometrica/PIN).
  const unlockBtn = $('cardUnlock');
  if (unlockBtn) unlockBtn.addEventListener('click', async () => {
    setUnlockMsg('Verifica in corso…');
    try {
      await assertCredential(credId);
      state.cardUnlocked = true;
      apply();
      setUnlockMsg('');
    } catch {
      setUnlockMsg('Sblocco non riuscito. Riprova, oppure usa «Disattiva blocco visualizzazione».');
    }
  });

  // Blocca ora (riblocca subito, in memoria).
  const nowBtn = $('cardLockNow');
  if (nowBtn) nowBtn.addEventListener('click', () => {
    state.cardUnlocked = false;
    apply();
    setMsg('Scheda bloccata.');
  });

  // Disattiva blocco — ANTI-LOCK-OUT: biometria se possibile, altrimenti confirm().
  const offBtn = $('cardLockOff');
  if (offBtn) offBtn.addEventListener('click', async () => {
    let ok = false;
    if (isWebAuthnSupported() && credId) {
      try { ok = await assertCredential(credId); } catch { ok = false; }
    }
    if (!ok) {
      ok = typeof confirm === 'function'
        ? confirm('Disattivare il blocco di visualizzazione? La scheda resterà accessibile su questo dispositivo.')
        : true;
    }
    if (!ok) return;
    clearLock();
    state.cardUnlocked = true;
    apply();
    setMsg('Blocco di visualizzazione disattivato.');
  });
}
