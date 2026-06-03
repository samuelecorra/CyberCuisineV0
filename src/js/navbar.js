// ============================================================================
//  NAVBAR + STATO DI AUTENTICAZIONE
// ============================================================================
// La navbar è il "termometro" visivo della sessione: mostra "Registrati / Accedi" se non sei
// loggato, oppure il menu "Ciao <nome>" con Profilo e Logout se lo sei. Lo stato vero risiede
// nel web storage (Local Storage → chiave "session"); qui lo leggiamo e adattiamo l'interfaccia.
import { ottieniUtenteCorrente, ottieniUtenti, impostaUtenteCorrente } from "./storage.js";

// Aggancia gli eventi della navbar legati all'auth e prepara la modale di conferma logout.
// Chiamata una volta sola allo startup (da main.js).
export function impostaEventiAuthNav() {
  const linkAutenticazione = document.getElementById("ccLinkAccesso");
  if (!linkAutenticazione) return;
  const logoutTrigger = document.getElementById("ccLogoutTrigger");
  preparaModalLogout();
  // Il click su "Logout" non disconnette subito: apre prima la modale di conferma.
  logoutTrigger?.addEventListener("click", event => {
    event.preventDefault();
    mostraModalLogout();
  });
  aggiornaStatoAuthNav();
}

// Sincronizza l'aspetto della navbar con lo stato di login. Viene richiamata dopo login, logout
// e a ogni cambio di rotta (dal router), così la navbar è sempre coerente con la sessione.
export function aggiornaStatoAuthNav() {
  const linkAutenticazione = document.getElementById("ccLinkAccesso");
  const menuUtente = document.getElementById("ccUserMenu");
  const salutoUtente = document.getElementById("ccUserGreeting");
  if (!linkAutenticazione || !menuUtente || !salutoUtente) return;
  // ottieniUtenteCorrente legge "session".currentUserId e recupera l'utente da "users".
  const utente = ottieniUtenteCorrente();
  if (utente) {
    // Loggato: nascondi il link Accedi, mostra il menu utente con il saluto personalizzato.
    linkAutenticazione.classList.add("d-none");
    menuUtente.classList.remove("d-none");
    const nomePreferito = (utente.nome ?? utente.nomeUtente ?? "Chef").trim() || "Chef";
    salutoUtente.textContent = `Ciao ${nomePreferito}`;
  } else {
    // Non loggato: il link punta alla registrazione se non esiste ancora nessun utente,
    // altrimenti direttamente al login (piccola comodità per chi è già registrato).
    const ciSonoUtenti = ottieniUtenti().length > 0;
    linkAutenticazione.classList.remove("d-none");
    linkAutenticazione.href = ciSonoUtenti ? "#/accesso" : "#/registrazione";
    linkAutenticazione.textContent = "Registrati / Accedi";
    menuUtente.classList.add("d-none");
  }
}

// >>> MOMENTO CHIAVE DEL LOGOUT <<<
// impostaUtenteCorrente(null) riscrive "session" come { currentUserId: null, loginAt: null }.
// DEVTOOLS: F12 → Application → Local Storage → chiave "session": dopo il logout currentUserId
// torna a null. NB: l'array "users" NON viene toccato (l'account resta registrato), e nemmeno
// il ricettario/recensioni: il logout chiude solo la sessione, non cancella i dati dell'utente.
export function gestisciLogout() {
  impostaUtenteCorrente(null);
  aggiornaStatoAuthNav(); // la navbar torna a "Registrati / Accedi"
  window.location.hash = "#/home"; // torniamo alla home pubblica
}

let modalLogoutElementi = null;
let modalLogoutInstance = null;

function preparaModalLogout() {
  modalLogoutElementi = {
    modal: document.getElementById("modalLogout"),
    annulla: document.getElementById("modalLogoutAnnulla"),
    conferma: document.getElementById("modalLogoutConferma"),
    chiudi: document.getElementById("modalLogoutChiudi")
  };

  if (!modalLogoutElementi.modal) {
    console.warn("Modal di logout non trovata, il logout avverrà senza conferma.");
    return;
  }

  modalLogoutElementi.annulla?.addEventListener("click", chiudiModalLogout);
  modalLogoutElementi.chiudi?.addEventListener("click", chiudiModalLogout);
  modalLogoutElementi.conferma?.addEventListener("click", () => {
    chiudiModalLogout();
    gestisciLogout();
  });
}

function mostraModalLogout() {
  if (!modalLogoutElementi?.modal) {
    gestisciLogout();
    return;
  }
  mostraBootstrapModal(modalLogoutElementi.modal);
  modalLogoutElementi.conferma?.focus();
}

function chiudiModalLogout() {
  if (!modalLogoutElementi?.modal) return;
  nascondiBootstrapModal(modalLogoutElementi.modal);
}

// Evidenziazione nav
export function aggiornaNavigazioneAttiva(hashDestinazione) {
  const collegamentiNav = document.querySelectorAll("#ccLinkNavigazione .nav-link");
  collegamentiNav.forEach(link => {
    const hashLink = link.getAttribute("href");
    if (!hashLink || !hashLink.startsWith("#/")) {
      link.classList.remove("active");
      return;
    }
    const attivo = hashDestinazione.startsWith(hashLink);
    if (attivo) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function mostraBootstrapModal(modal) {
  const BootstrapModal = window.bootstrap?.Modal;
  if (!BootstrapModal) {
    modal.classList.add("show");
    modal.style.display = "block";
    modal.removeAttribute("aria-hidden");
    return;
  }
  modalLogoutInstance =
    modalLogoutInstance ?? BootstrapModal.getOrCreateInstance(modal, { backdrop: true, keyboard: true });
  modalLogoutInstance.show();
}

function nascondiBootstrapModal(modal) {
  const BootstrapModal = window.bootstrap?.Modal;
  if (!BootstrapModal) {
    modal.classList.remove("show");
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    return;
  }
  const istanza = modalLogoutInstance ?? BootstrapModal.getOrCreateInstance(modal);
  istanza.hide();
}
