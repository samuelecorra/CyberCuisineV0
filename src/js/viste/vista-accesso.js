// ============================================================================
//  VISTA ACCESSO (LOGIN) — frammento login.html
// ============================================================================
// Qui avviene il LOGIN. È uno dei punti che il prof vorrà vedere nei DevTools.
// Flusso completo del web storage durante il login:
//   1) leggiamo l'array "users" (Local Storage) e cerchiamo l'utente per username/email;
//   2) verifichiamo la password tramite HASH (auth.js), non in chiaro;
//   3) se "Ricordami" è spuntato salviamo l'account in Local Storage ("cc_remembered_accounts")
//      con la password CIFRATA AES-GCM (mai in chiaro); vedi salvaAccountRicordato più sotto;
//   4) impostaUtenteCorrente() scrive in Local Storage la chiave "session" → { currentUserId, loginAt }.
// Da quel momento l'utente risulta loggato in tutta l'app.
// NB: il "Ricordami" NON usa il Session Storage: vive in Local Storage ("cc_remembered_accounts")
// con password cifrata AES-GCM. L'unica chiave di Session Storage dell'app è "cc_post_signup".

import { ottieniUtenteCorrente, ottieniUtenti, impostaUtenteCorrente } from "../storage.js";
import { mostraAvviso } from "../ui.js";
import { aggiornaStatoAuthNav } from "../navbar.js";
import { verificaPassword } from "../auth.js";

const CHIAVE_ACCOUNT_RICORDATI = "cc_remembered_accounts";
const DELAY_MODAL_ACCOUNT_MS = 2000;
const TYPEWRITER_MIN_MS = 30;
const TYPEWRITER_MAX_MS = 50;
const MICRO_DELAY_CAMPI_MS = 180;
const MAX_ACCOUNT_RICORDATI = 10;

export function inizializzaVistaLogin() {
  // Se c'è già una sessione attiva (chiave "session".currentUserId valorizzata) non ha senso
  // restare sul login: redirigiamo alla home.
  if (ottieniUtenteCorrente()) {
    window.location.hash = "#/home";
    return;
  }
  const form = document.getElementById("formLogin");
  const boxAvviso = document.getElementById("avvisoLogin");
  const checkRicorda = document.getElementById("ricordaAccesso");
  const inputIdentificatore = document.getElementById("identificatoreLogin");
  const inputPassword = document.getElementById("passwordLogin");
  const bottoneSubmit =
    document.getElementById("bottoneAccediLogin") ?? form?.querySelector('button[type="submit"]');
  const modalAccount = document.getElementById("modalAccountRicordati");
  const listaAccount = document.getElementById("listaAccountRicordati");
  const contestoAutoCompilazione = {
    form,
    modalAccount,
    listaAccount,
    inputIdentificatore,
    inputPassword,
    checkRicorda,
    bottoneSubmit,
    compilazioneInCorso: false
  };

  // Messaggio post-registrazione: se arriviamo dalla registrazione mostra l'alert di successo e
  // precompila l'identificatore (ritorna true). In tal caso NON azzeriamo i campi qui sotto.
  const compilatoDaPostRegistrazione = mostraMessaggioPostRegistrazione();
  resettaCampiLoginIniziali({
    inputIdentificatore,
    inputPassword,
    checkRicorda,
    conservaCompilazione: compilatoDaPostRegistrazione
  });

  pianificaModalAccountRicordati(contestoAutoCompilazione);

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const identificatore = inputIdentificatore?.value.trim() ?? "";
    const password = inputPassword?.value.trim() ?? "";
    if (!identificatore || !password) {
      mostraAvviso(boxAvviso, "Inserisci username/email e password.");
      return;
    }
    // LETTURA dal web storage: array di tutti gli utenti registrati (Local Storage → "users").
    const utenti = ottieniUtenti();
    const utente = utenti.find(
      u => u.nomeUtente === identificatore || u.username === identificatore || u.email === identificatore
    );
    if (!utente) {
      // Messaggio volutamente generico (non diciamo "utente inesistente" vs "password errata")
      // per non rivelare se un certo username/email esiste: piccola buona pratica di sicurezza.
      mostraAvviso(boxAvviso, "Credenziali non valide.");
      return;
    }
    // VERIFICA PASSWORD via hash: ricalcoliamo SHA-256(salt:password) e confrontiamo con utente.passwordHash.
    const ok = await verificaPassword(password, utente);
    if (!ok) {
      mostraAvviso(boxAvviso, "Credenziali non valide.");
      return;
    }
    // "Ricordami": salviamo la password CIFRATA con AES-GCM usando il passwordHash come chiave.
    // DEVTOOLS → "cc_remembered_accounts": si vede un blob Base64, mai la password in chiaro.
    // Per decifrare serve il passwordHash dello stesso utente già in "users" → sicurezza equivalente
    // a non salvarla affatto per chi non ha già accesso allo storage.
    if (checkRicorda?.checked) {
      await salvaAccountRicordato({
        username: utente.email || utente.username || utente.nomeUtente || identificatore,
        password, // cifrata con AES-GCM prima di scrivere, mai in chiaro sullo storage
        passwordHash: utente.passwordHash,
        displayName: ricavaNomeDisplay(utente),
        lastUsed: Date.now()
      });
    }
    mostraSpinnerAccesso();
    bottoneSubmit?.setAttribute("disabled", "disabled");
    // Piccolo ritardo "scenografico" per far percepire lo spinner; al termine apriamo la sessione.
    setTimeout(() => {
      // >>> MOMENTO CHIAVE DEL LOGIN <<<
      // impostaUtenteCorrente scrive la chiave "session" in Local Storage: { currentUserId, loginAt }.
      // DEVTOOLS: tieni d'occhio "session": currentUserId passa da null all'id di questo utente,
      // e loginAt registra il timestamp ISO dell'accesso.
      impostaUtenteCorrente(utente);
      aggiornaStatoAuthNav(); // la navbar passa da "Registrati / Accedi" al menu "Ciao <nome>"
      nascondiSpinnerAccesso();
      bottoneSubmit?.removeAttribute("disabled");
      window.location.hash = "#/home"; // la home loggata mostra ricette per paese di origine/residenza
    }, 1100);
  });
}

// Reset difensivo dei campi all'apertura della pagina di login: parte da un form pulito (nessun
// identificatore/password precompilati, "Ricordami" non spuntato). Eccezione: se arriviamo dalla
// registrazione (conservaCompilazione=true) NON tocchiamo i campi, così l'email appena registrata
// resta precompilata. La compilazione automatica dal picker "account ricordati" avviene DOPO, su
// azione esplicita dell'utente, quindi non è in conflitto con questo reset iniziale.
function resettaCampiLoginIniziali({
  inputIdentificatore,
  inputPassword,
  checkRicorda,
  conservaCompilazione = false
}) {
  if (conservaCompilazione) return;
  if (inputIdentificatore) inputIdentificatore.value = "";
  if (inputPassword) inputPassword.value = "";
  if (checkRicorda) checkRicorda.checked = false;
}

function pianificaModalAccountRicordati(contesto) {
  window.setTimeout(() => {
    if (!contesto.form?.isConnected || !contesto.modalAccount?.isConnected) return;
    const accounts = caricaAccountRicordati();
    if (!accounts.length) return;
    popolaListaAccountRicordati(accounts, contesto);
    const modal = ottieniIstanzaModalBootstrap(contesto.modalAccount);
    modal?.show();
  }, DELAY_MODAL_ACCOUNT_MS);
}

function popolaListaAccountRicordati(accounts, contesto) {
  if (!contesto.listaAccount) return;
  contesto.listaAccount.innerHTML = "";
  const frammento = document.createDocumentFragment();

  accounts.forEach(account => {
    const bottone = document.createElement("button");
    bottone.type = "button";
    bottone.className = "list-group-item list-group-item-action cc-remember-account";
    bottone.setAttribute("role", "option");

    const avatar = document.createElement("span");
    avatar.className = "cc-remember-avatar";
    avatar.textContent = ottieniIniziali(account.displayName || account.username);

    const meta = document.createElement("span");
    meta.className = "cc-remember-meta";

    const identificatore = document.createElement("span");
    identificatore.className = "cc-remember-identifier";
    identificatore.textContent = account.username;
    meta.appendChild(identificatore);

    if (account.displayName) {
      const display = document.createElement("span");
      display.className = "cc-remember-display";
      display.textContent = account.displayName;
      meta.appendChild(display);
    }

    bottone.appendChild(avatar);
    bottone.appendChild(meta);
    bottone.addEventListener("click", () => {
      if (contesto.compilazioneInCorso) return;
      contesto.compilazioneInCorso = true;
      bottone.classList.add("is-selected");
      selezionaAccountRicordato(account, contesto).finally(() => {
        contesto.compilazioneInCorso = false;
      });
    });

    frammento.appendChild(bottone);
  });

  contesto.listaAccount.appendChild(frammento);
}

async function selezionaAccountRicordato(account, contesto) {
  const modal = ottieniIstanzaModalBootstrap(contesto.modalAccount);
  if (!contesto.modalAccount || !contesto.inputIdentificatore) return;

  if (modal) {
    await new Promise(resolve => {
      contesto.modalAccount.addEventListener("hidden.bs.modal", resolve, { once: true });
      modal.hide();
    });
  }

  // Typewriter sull'username
  await digitaNelCampo(contesto.inputIdentificatore, account.username);
  await attendi(MICRO_DELAY_CAMPI_MS);

  // Decifra la password (AES-GCM) usando il passwordHash dell'utente già in "users"
  let passwordDecifrata = null;
  if (account.encryptedPassword && account.iv) {
    const { ottieniUtenti } = await import("../storage.js");
    const utenti = ottieniUtenti();
    const utente = utenti.find(
      u => u.username === account.username || u.email === account.username || u.nomeUtente === account.username
    );
    if (utente?.passwordHash) {
      passwordDecifrata = await decifraPassword(account.encryptedPassword, account.iv, utente.passwordHash);
    }
  }

  if (passwordDecifrata && contesto.inputPassword) {
    await digitaNelCampo(contesto.inputPassword, passwordDecifrata);
    if (contesto.checkRicorda) contesto.checkRicorda.checked = true;
    contesto.bottoneSubmit?.focus();
  } else {
    // Fallback: la decifratura è fallita (es. utente eliminato e ricreato) → focus manuale
    if (contesto.checkRicorda) contesto.checkRicorda.checked = true;
    contesto.inputPassword?.focus();
  }
}

function ottieniIstanzaModalBootstrap(modalElement) {
  const modalApi = window.bootstrap?.Modal;
  if (!modalApi || !modalElement) return null;
  return modalApi.getOrCreateInstance(modalElement);
}

async function digitaNelCampo(campo, testo) {
  if (!campo || !campo.isConnected) return;
  const valore = String(testo ?? "");
  campo.focus();
  campo.value = "";
  for (const carattere of valore) {
    if (!campo.isConnected) return;
    campo.value += carattere;
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    await attendi(numeroRandomIntero(TYPEWRITER_MIN_MS, TYPEWRITER_MAX_MS));
  }
}

function attendi(ms) {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function numeroRandomIntero(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function caricaAccountRicordati() {
  try {
    const raw = localStorage.getItem(CHIAVE_ACCOUNT_RICORDATI);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizzaAccountRicordato)
      .filter(Boolean)
      .sort((a, b) => b.lastUsed - a.lastUsed);
  } catch (e) {
    return [];
  }
}

async function salvaAccountRicordato({ username, password, passwordHash, displayName, lastUsed }) {
  // Cifratura AES-GCM: la password in chiaro non viene mai scritta nel localStorage.
  // In DevTools si vede solo il blob Base64 (encryptedPassword + iv).
  let encryptedPassword = null;
  let iv = null;
  if (password && passwordHash) {
    try {
      const cifrato = await cifraPassword(password, passwordHash);
      encryptedPassword = cifrato.encryptedPassword;
      iv = cifrato.iv;
    } catch {
      // silenzioso: se la cifratura fallisce salviamo senza password (fallback graceful)
    }
  }
  const normalizzato = normalizzaAccountRicordato({
    username, displayName, lastUsed: lastUsed ?? Date.now(), encryptedPassword, iv
  });
  if (!normalizzato) return;
  try {
    const accounts = caricaAccountRicordati();
    const indiceEsistente = accounts.findIndex(
      item => item.username.toLowerCase() === normalizzato.username.toLowerCase()
    );
    if (indiceEsistente >= 0) {
      accounts[indiceEsistente] = { ...accounts[indiceEsistente], ...normalizzato };
    } else {
      accounts.push(normalizzato);
    }
    const ordinati = accounts.sort((a, b) => b.lastUsed - a.lastUsed).slice(0, MAX_ACCOUNT_RICORDATI);
    localStorage.setItem(CHIAVE_ACCOUNT_RICORDATI, JSON.stringify(ordinati));
  } catch (e) {
    // silenzioso
  }
}

function normalizzaAccountRicordato(account) {
  if (!account || typeof account !== "object") return null;
  const username = String(account.username ?? "").trim();
  const displayName = String(account.displayName ?? "").trim();
  const lastUsed = Number(account.lastUsed);
  if (!username) return null;
  return {
    username,
    displayName,
    lastUsed: Number.isFinite(lastUsed) ? lastUsed : Date.now(),
    encryptedPassword: account.encryptedPassword ?? null, // blob AES-GCM in Base64
    iv: account.iv ?? null // initialization vector AES-GCM in Base64
  };
}

// ── Funzioni crittografiche per la password cifrata ──────────────────────────

// Importa il passwordHash (SHA-256, 32 byte) come chiave AES-256-GCM.
// Usiamo il hash già calcolato in fase di registrazione: non servono nuove operazioni crypto.
async function importaChiaveAes(passwordHash) {
  const raw = Uint8Array.from(atob(passwordHash), c => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

// Cifra la password con AES-256-GCM. Restituisce { iv, encryptedPassword } entrambi in Base64.
async function cifraPassword(password, passwordHash) {
  const key = await importaChiaveAes(passwordHash);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bit IV standard per AES-GCM
  const encoded = new TextEncoder().encode(password);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const toBase64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  return { iv: toBase64(iv.buffer), encryptedPassword: toBase64(ciphertext) };
}

// Decifra la password. Restituisce la stringa in chiaro, o null se la decifratura fallisce.
async function decifraPassword(encryptedPassword, iv, passwordHash) {
  try {
    const key = await importaChiaveAes(passwordHash);
    const fromBase64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(iv) },
      key,
      fromBase64(encryptedPassword)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null; // passwordHash non corrisponde o dati corrotti → fallback silenzioso
  }
}

function ricavaNomeDisplay(utente) {
  if (!utente) return "";
  const nomeCompleto = [utente.firstName, utente.lastName]
    .map(parte => String(parte ?? "").trim())
    .filter(Boolean)
    .join(" ");
  if (nomeCompleto) return nomeCompleto;
  return String(utente.username || utente.nomeUtente || "").trim();
}

function ottieniIniziali(testo) {
  const parti = String(testo || "")
    .split(/[\s@._-]+/)
    .map(parte => parte.trim())
    .filter(Boolean);
  if (parti.length === 0) return "CC";
  if (parti.length === 1) return parti[0].slice(0, 2).toUpperCase();
  return `${parti[0][0] || ""}${parti[1][0] || ""}`.toUpperCase();
}

function mostraSpinnerAccesso() {
  const spinner = document.getElementById("loginSpinner");
  if (!spinner) return;
  spinner.classList.remove("d-none");
  spinner.setAttribute("aria-hidden", "false");
}

function nascondiSpinnerAccesso() {
  const spinner = document.getElementById("loginSpinner");
  if (!spinner) return;
  spinner.classList.add("d-none");
  spinner.setAttribute("aria-hidden", "true");
}

// Mostra il messaggio "account creato, accedi" salvato dalla registrazione in Session Storage.
// È un messaggio "usa e getta": lo leggiamo e subito lo rimuoviamo (removeItem) così non riappare.
// DEVTOOLS: dopo una registrazione, in Session Storage compare e poi sparisce la chiave "cc_post_signup".
function mostraMessaggioPostRegistrazione() {
  try {
    const payload = sessionStorage.getItem("cc_post_signup");
    if (!payload) return false;
    sessionStorage.removeItem("cc_post_signup");
    const dati = JSON.parse(payload);
    const boxAvviso = document.getElementById("avvisoLogin");
    if (boxAvviso) {
      mostraAvviso(
        boxAvviso,
        dati?.messaggio || "Account creato con successo. Accedi per continuare.",
        "success"
      );
    }
    if (dati?.identificatore) {
      document.getElementById("identificatoreLogin").value = dati.identificatore;
      document.getElementById("passwordLogin").focus();
    }
    return Boolean(dati?.identificatore);
  } catch (e) {
    // ignora
    return false;
  }
}
