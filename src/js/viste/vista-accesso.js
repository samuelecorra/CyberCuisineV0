import { ottieniUtenteCorrente, ottieniUtenti, impostaUtenteCorrente } from "../storage.js";
import { mostraAvviso } from "../ui.js";
import { aggiornaStatoAuthNav } from "../navbar.js";

export function inizializzaVistaLogin() {
  if (ottieniUtenteCorrente()) {
    window.location.hash = "#/home";
    return;
  }
  const form = document.getElementById("formLogin");
  const boxAvviso = document.getElementById("avvisoLogin");
  form?.addEventListener("submit", event => {
    event.preventDefault();
    const identificatore = document.getElementById("identificatoreLogin").value.trim();
    const password = document.getElementById("passwordLogin").value.trim();
    const utenti = ottieniUtenti();
    const utente = utenti.find(
      u =>
        (u.nomeUtente === identificatore || u.email === identificatore) && u.password === password
    );
    if (!utente) {
      mostraAvviso(boxAvviso, "Credenziali non valide.");
      return;
    }
    impostaUtenteCorrente(utente);
    aggiornaStatoAuthNav();
    window.location.hash = "#/home";
  });
}
