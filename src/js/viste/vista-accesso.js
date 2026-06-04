// ============================================================================
//  VISTA ACCESSO (LOGIN) — frammento login.html
// ============================================================================
// Qui avviene il LOGIN. È uno dei punti che il prof vorrà vedere nei DevTools.
// Flusso completo del web storage durante il login:
//   1) leggiamo l'array "users" (Local Storage) e cerchiamo l'utente per username/email;
//   2) verifichiamo la password tramite HASH (auth.js), non in chiaro;
//   3) se "Ricordami" è spuntato salviamo l'identificatore in Session Storage ("cc_accesso_ricorda");
//   4) impostaUtenteCorrente() scrive in Local Storage la chiave "session" → { currentUserId, loginAt }.
// Da quel momento l'utente risulta loggato in tutta l'app.

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

  // Messaggio post-registrazione
  const compilatoDaPostRegistrazione = mostraMessaggioPostRegistrazione();
  pulisciPrefillLegacy({
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
    // "Ricordami": salviamo solo username e displayName in localStorage, MAI la password.
    // DEVTOOLS: F12 → Application → Local Storage → "cc_remembered_accounts".
    // La password NON è presente: la typewriter animation compila solo il campo username;
    // l'utente deve sempre digitare la password manualmente (sicurezza preservata).
    if (checkRicorda?.checked) {
      salvaAccountRicordato({
        username: utente.email || utente.username || utente.nomeUtente || identificatore,
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

function pulisciPrefillLegacy({
  inputIdentificatore,
  inputPassword,
  checkRicorda,
  conservaCompilazione = false
}) {
  try {
    sessionStorage.removeItem("cc_accesso_ricorda");
  } catch (e) {
    // silenzioso
  }
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

  // Compila con typewriter SOLO il campo username — la password non è mai salvata.
  // L'utente deve digitarla manualmente: la sicurezza (hash+salt) è preservata.
  await digitaNelCampo(contesto.inputIdentificatore, account.username);
  if (contesto.checkRicorda) {
    contesto.checkRicorda.checked = true;
  }
  // Focus sul campo password così l'utente inizia subito a digitarla
  contesto.inputPassword?.focus();
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

function salvaAccountRicordato(account) {
  const normalizzato = normalizzaAccountRicordato({
    ...account,
    lastUsed: Date.now()
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
    // silenzioso: se lo storage è pieno o disabilitato, semplicemente non ricordiamo l'identificatore
  }
}

function normalizzaAccountRicordato(account) {
  if (!account || typeof account !== "object") return null;
  const username = String(account.username ?? "").trim();
  const displayName = String(account.displayName ?? "").trim();
  const lastUsed = Number(account.lastUsed);
  // Valido se ha almeno l'username; la password NON viene mai salvata né letta qui.
  if (!username) return null;
  return {
    username,
    displayName,
    lastUsed: Number.isFinite(lastUsed) ? lastUsed : Date.now()
  };
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
