// ============================================================================
//  VISTA RECENSIONI — tutte le recensioni scritte dall'utente (frammento reviews.html)
// ============================================================================
// Rotta PROTETTA: raccoglie da tutte le chiavi "reviews:*" le recensioni il cui userId è quello
// dell'utente loggato, ne mostra le card e consente di rimuoverle. È una vista "aggregata" comoda
// per l'utente (le stesse recensioni sono visibili anche nella scheda della singola ricetta).
import {
  ottieniUtenteCorrente,
  ottieniRecensioni,
  ottieniUtenti,
  rimuoviRecensione
} from "../storage.js";
import { recuperaRicettaPerId } from "../gestione-api/api.js";
import { creaCardRecensione } from "../componenti/carte.js";
import { statoApp } from "../stato.js";
import { mostraModalConfermaGenerica } from "../componenti/azioni-card.js";

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
    contenitoreRecensioni.innerHTML =
      '<p class="text-muted">Ancora nessuna recensione salvata.</p>';
    return;
  }
  const schedeRecensioni = await Promise.all(
    recensioni.map(async recensione => {
      const ricetta = await recuperaRicettaPerId(recensione.idRicetta);
      const autore = utenti.find(u => u.id === recensione.idUtente)?.nomeUtente ?? "Utente";
      return creaCardRecensione(recensione, ricetta, autore, { mostraRimuovi: true });
    })
  );
  contenitoreRecensioni.innerHTML = schedeRecensioni.join("");

  // Se arriviamo qui da "Guarda la tua recensione", highlightRecensioneId è valorizzato:
  // scorriamo fino alla card corrispondente e la evidenziamo con un glow intermittente.
  const idDaEvidenziare = statoApp.highlightRecensioneId;
  statoApp.highlightRecensioneId = null; // consumiamo il valore, non deve ripetersi ai refresh
  if (idDaEvidenziare) {
    // Piccolo delay per lasciar completare il paint del DOM prima dello scroll
    setTimeout(() => {
      const card = contenitoreRecensioni.querySelector(
        `[data-card-ricetta-id="${CSS.escape(idDaEvidenziare)}"]`
      );
      if (!card) return;
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.add("cc-recensione-highlight");
      // Rimuoviamo la classe dopo 3s (durata dell'animazione CSS)
      setTimeout(() => card.classList.remove("cc-recensione-highlight"), 3000);
    }, 120);
  }

  contenitoreRecensioni.addEventListener("click", event => {
    const target = event.target.closest("[data-rimuovi-recensione]");
    if (!target) return;
    const idRecensione = target.dataset.rimuoviRecensione;
    const idRicetta = target.dataset.ricettaId;
    if (!idRecensione || !idRicetta) return;
    mostraModalConfermaGenerica(
      "Rimuovi recensione",
      "Sei sicuro di voler rimuovere questa recensione? L'operazione non è reversibile.",
      () => {
        rimuoviRecensione(idRicetta, idRecensione, utente.id);
        inizializzaVistaRecensioni();
      }
    );
  });
}
