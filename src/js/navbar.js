import {
  ottieniUtenteCorrente,
  ottieniUtenti,
  impostaUtenteCorrente
} from "./storage.js";

// Gestione link autenticazione
export function impostaEventiAuthNav() {
  const linkAutenticazione = document.getElementById("ccLinkAccesso");
  if (!linkAutenticazione) return;
  linkAutenticazione.addEventListener("click", event => {
    if (linkAutenticazione.dataset.action === "logout") {
      event.preventDefault();
      gestisciLogout();
    }
  });
  aggiornaStatoAuthNav();
}

export function aggiornaStatoAuthNav() {
  const linkAutenticazione = document.getElementById("ccLinkAccesso");
  if (!linkAutenticazione) return;
  const utente = ottieniUtenteCorrente();
  if (utente) {
    linkAutenticazione.textContent = "Logout";
    linkAutenticazione.href = "#/home";
    linkAutenticazione.dataset.action = "logout";
  } else {
    const ciSonoUtenti = ottieniUtenti().length > 0;
    linkAutenticazione.textContent = "Registrati / Accedi";
    linkAutenticazione.href = ciSonoUtenti ? "#/accesso" : "#/registrazione";
    delete linkAutenticazione.dataset.action;
  }
}

export function gestisciLogout() {
  impostaUtenteCorrente(null);
  aggiornaStatoAuthNav();
  window.location.hash = "#/home";
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
