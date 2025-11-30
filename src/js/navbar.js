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

function preparaModalLogout() {
  modalLogoutElementi = {
    backdrop: document.getElementById("modalLogout"),
    annulla: document.getElementById("modalLogoutAnnulla"),
    conferma: document.getElementById("modalLogoutConferma"),
    chiudi: document.getElementById("modalLogoutChiudi")
  };

  if (!modalLogoutElementi.backdrop) {
    console.warn("Modal di logout non trovata, il logout avverrà senza conferma.");
    return;
  }

  modalLogoutElementi.annulla?.addEventListener("click", chiudiModalLogout);
  modalLogoutElementi.chiudi?.addEventListener("click", chiudiModalLogout);
  modalLogoutElementi.backdrop.addEventListener("click", evento => {
    if (evento.target === modalLogoutElementi.backdrop) {
      chiudiModalLogout();
    }
  });
  modalLogoutElementi.conferma?.addEventListener("click", () => {
    chiudiModalLogout();
    gestisciLogout();
  });
}

function mostraModalLogout() {
  if (!modalLogoutElementi?.backdrop) {
    gestisciLogout();
    return;
  }
  modalLogoutElementi.backdrop.classList.remove("d-none");
  modalLogoutElementi.backdrop.setAttribute("aria-hidden", "false");
  modalLogoutElementi.conferma?.focus();
}

function chiudiModalLogout() {
  if (!modalLogoutElementi?.backdrop) return;
  modalLogoutElementi.backdrop.classList.add("d-none");
  modalLogoutElementi.backdrop.setAttribute("aria-hidden", "true");
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
