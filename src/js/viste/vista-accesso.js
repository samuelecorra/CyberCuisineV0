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
  const bottoneSubmit = form?.querySelector('button[type="submit"]');

  // Se arriviamo qui subito dopo la registrazione, mostriamo il messaggio salvato in Session Storage.
  mostraMessaggioPostRegistrazione();

  // Prefill se l'utente aveva scelto "Ricordami": leggiamo l'identificatore da Session Storage.
  // DEVTOOLS: F12 → Application → Session Storage → chiave "cc_accesso_ricorda".
  const credenzialiSalvate = caricaCredenzialiSalvate();
  if (credenzialiSalvate) {
    document.getElementById("identificatoreLogin").value = credenzialiSalvate.identificatore;
    checkRicorda.checked = true;
  }
  form?.addEventListener("submit", async event => {
    event.preventDefault(); // niente reload della pagina: gestiamo tutto in JS (SPA)
    const identificatore = document.getElementById("identificatoreLogin").value.trim();
    const password = document.getElementById("passwordLogin").value.trim();
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
    // "Ricordami": scriviamo SOLO l'identificatore (mai la password) in Session Storage.
    // DEVTOOLS: spunta la casella e fai login → compare la chiave "cc_accesso_ricorda".
    if (checkRicorda?.checked) {
      salvaCredenziali(identificatore);
    } else {
      rimuoviCredenzialiSalvate();
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

// Chiave di Session Storage usata per il "Ricordami". Session Storage (non Local) significa che
// il dato vive solo finché la SCHEDA del browser resta aperta: chiusa la scheda, sparisce.
const CHIAVE_RICORDA = "cc_accesso_ricorda";

// Salva in Session Storage SOLO l'identificatore (username/email), mai la password.
function salvaCredenziali(identificatore) {
  try {
    sessionStorage.setItem(CHIAVE_RICORDA, JSON.stringify({ identificatore }));
  } catch (e) {
    // silenzioso: se lo storage è pieno o disabilitato, semplicemente non ricordiamo l'identificatore
  }
}

// Legge l'identificatore salvato (se presente) per il prefill del campo login.
function caricaCredenzialiSalvate() {
  try {
    const raw = sessionStorage.getItem(CHIAVE_RICORDA);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Rimuove l'identificatore ricordato (quando l'utente fa login senza spuntare "Ricordami").
function rimuoviCredenzialiSalvate() {
  try {
    sessionStorage.removeItem(CHIAVE_RICORDA);
  } catch (e) {
    // silenzioso
  }
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
    if (!payload) return;
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
  } catch (e) {
    // ignora
  }
}
