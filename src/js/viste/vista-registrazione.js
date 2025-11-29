import { ottieniUtenteCorrente, ottieniUtenti, impostaUtenteCorrente, salvaUtenti } from "../storage.js";
import { mostraAvviso, generaId } from "../ui.js";
import { aggiornaStatoAuthNav } from "../navbar.js";

export function inizializzaVistaRegistrazione() {
  if (ottieniUtenteCorrente()) {
    window.location.hash = "#/home";
    return;
  }
  const form = document.getElementById("formRegistrazione");
  const boxAvviso = document.getElementById("avvisoRegistrazione");
  form?.addEventListener("submit", event => {
    event.preventDefault();
    const nomeUtente = document.getElementById("usernameRegistrazione").value.trim();
    const email = document.getElementById("emailRegistrazione").value.trim();
    const password = document.getElementById("passwordRegistrazione").value.trim();
    const confermaPassword = document
      .getElementById("confermaPasswordRegistrazione")
      .value.trim();

    if (!nomeUtente || !email || !password) {
      mostraAvviso(boxAvviso, "Compila tutti i campi obbligatori.");
      return;
    }
    if (password.length < 6) {
      mostraAvviso(boxAvviso, "La password deve contenere almeno 6 caratteri.");
      return;
    }
    if (password !== confermaPassword) {
      mostraAvviso(boxAvviso, "Le password non coincidono.");
      return;
    }
    const utenti = ottieniUtenti();
    const giaEsiste = utenti.some(
      utente => utente.nomeUtente === nomeUtente || utente.email === email
    );
    if (giaEsiste) {
      mostraAvviso(boxAvviso, "Username o email già utilizzati.");
      return;
    }

    const nuovoUtente = {
      id: generaId("utente"),
      nomeUtente,
      email,
      password,
      ricettario: []
    };
    utenti.push(nuovoUtente);
    salvaUtenti(utenti);
    impostaUtenteCorrente(nuovoUtente);
    aggiornaStatoAuthNav();
    window.location.hash = "#/profilo";
  });
}
