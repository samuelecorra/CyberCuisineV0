import { ottieniUtenteCorrente, ottieniUtenti, impostaUtenteCorrente } from "./storage.js";

// Gestione link autenticazione
export function impostaEventiAuthNav() {
  const linkAutenticazione = document.getElementById("ccLinkAccesso");
  if (!linkAutenticazione) return;
  const logoutTrigger = document.getElementById("ccLogoutTrigger");
  preparaModalLogout();
  logoutTrigger?.addEventListener("click", event => {
    event.preventDefault();
    mostraModalLogout();
  });
  aggiornaStatoAuthNav();
}

export function aggiornaStatoAuthNav() {
  const linkAutenticazione = document.getElementById("ccLinkAccesso");
  const menuUtente = document.getElementById("ccUserMenu");
  const salutoUtente = document.getElementById("ccUserGreeting");
  if (!linkAutenticazione || !menuUtente || !salutoUtente) return;
  const utente = ottieniUtenteCorrente();
  if (utente) {
    linkAutenticazione.classList.add("d-none");
    menuUtente.classList.remove("d-none");
    const nomePreferito = (utente.nome ?? utente.nomeUtente ?? "Chef").trim() || "Chef";
    salutoUtente.textContent = `Ciao ${nomePreferito}`;
  } else {
    const ciSonoUtenti = ottieniUtenti().length > 0;
    linkAutenticazione.classList.remove("d-none");
    linkAutenticazione.href = ciSonoUtenti ? "#/accesso" : "#/registrazione";
    linkAutenticazione.textContent = "Registrati / Accedi";
    menuUtente.classList.add("d-none");
  }
}

export function gestisciLogout() {
  impostaUtenteCorrente(null);
  aggiornaStatoAuthNav();
  window.location.hash = "#/home";
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
