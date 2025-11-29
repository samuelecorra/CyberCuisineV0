import {
  ottieniUtenteCorrente,
  salvaUtente,
  rimuoviUtente
} from "../storage.js";
import { mostraAvviso } from "../ui.js";
import { gestisciLogout } from "../navbar.js";

export function inizializzaVistaProfilo() {
  const utente = ottieniUtenteCorrente();
  if (!utente) {
    window.location.hash = "#/accesso";
    return;
  }

  mostraInfoProfilo(utente);
  const form = document.getElementById("formProfilo");
  const avvisoSuccessoProfilo = document.getElementById("avvisoProfiloSuccesso");
  const avvisoErroreProfilo = document.getElementById("avvisoProfiloErrore");
  const bottoneLogout = document.getElementById("bottoneLogout");
  const bottoneElimina = document.getElementById("bottoneEliminaProfilo");

  document.getElementById("emailProfilo").value = utente.email;

  form?.addEventListener("submit", event => {
    event.preventDefault();
    const email = document.getElementById("emailProfilo").value.trim();
    if (!email) {
      mostraAvviso(avvisoErroreProfilo, "Email obbligatoria.");
      return;
    }
    const profiloAggiornato = { ...utente, email };
    salvaUtente(profiloAggiornato);
    mostraInfoProfilo(profiloAggiornato);
    mostraAvviso(avvisoSuccessoProfilo, "Profilo aggiornato con successo.", "success");
  });

  bottoneLogout?.addEventListener("click", gestisciLogout);

  bottoneElimina?.addEventListener("click", () => {
    const confermaEliminazione = confirm("Sei sicuro di voler eliminare il profilo?");
    if (!confermaEliminazione) return;
    rimuoviUtente(utente.id);
    gestisciLogout();
  });
}

export function mostraInfoProfilo(utente) {
  const contenitoreProfilo = document.getElementById("infoProfilo");
  const conteggioRicettario = utente.ricettario?.length ?? 0;
  contenitoreProfilo.innerHTML = `
        <ul class="list-group list-group-flush">
            <li class="list-group-item bg-transparent text-white"><strong>Username:</strong> ${
              utente.nomeUtente
            }</li>
            <li class="list-group-item bg-transparent text-white"><strong>Email:</strong> ${
              utente.email
            }</li>
            <li class="list-group-item bg-transparent text-white"><strong>Ricette salvate:</strong> ${conteggioRicettario}</li>
        </ul>
    `;
}
