import { ottieniUtenteCorrente, ottieniRecensioni, ottieniUtenti } from "../storage.js";
import { garantisciRicettaInCache } from "../gestione-api/api.js";
import { creaCardRecensione } from "../componenti/carte.js";

export async function inizializzaVistaRecensioni() {
  const utente = ottieniUtenteCorrente();
  if (!utente) {
    window.location.hash = "#/accesso";
    return;
  }
  const contenitoreRecensioni = document.getElementById("elencoRecensioni");
  const recensioni = ottieniRecensioni().filter(recensione => recensione.idUtente === utente.id);
  const utenti = ottieniUtenti();
  if (recensioni.length === 0) {
    contenitoreRecensioni.innerHTML = '<p class="text-muted">Ancora nessuna recensione salvata.</p>';
    return;
  }
  const schedeRecensioni = await Promise.all(
    recensioni.map(async recensione => {
      const ricetta = await garantisciRicettaInCache(recensione.idRicetta);
      const autore = utenti.find(u => u.id === recensione.idUtente)?.nomeUtente ?? "Utente";
      return creaCardRecensione(recensione, ricetta, autore);
    })
  );
  contenitoreRecensioni.innerHTML = schedeRecensioni.join("");
}
