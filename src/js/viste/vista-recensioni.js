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

  // Event delegation sul contenitore: un solo handler intercetta i click su tutti i pulsanti
  // "Rimuovi recensione" (anche quelli rigenerati a ogni render). Usiamo l'ASSEGNAZIONE onclick
  // e NON addEventListener: questa funzione si auto-richiama dopo ogni rimozione (vedi sotto), ma
  // il nodo #elencoRecensioni NON viene ricreato (cambiamo solo il suo innerHTML), quindi più
  // addEventListener si accumulerebbero sullo stesso nodo a ogni passata. onclick invece SOSTITUISCE
  // sempre l'handler precedente → resta sempre uno solo (stesso pattern di vista-ricettario.js).
  contenitoreRecensioni.onclick = event => {
    const target = event.target.closest("[data-rimuovi-recensione]");
    if (!target) return;
    const idRecensione = target.dataset.rimuoviRecensione;
    const idRicetta = target.dataset.ricettaId;
    if (!idRecensione || !idRicetta) return;
    // Modale di conferma custom (no window.confirm nativo) coerente con il resto dell'app.
    mostraModalConfermaGenerica(
      "Rimuovi recensione",
      "Sei sicuro di voler rimuovere questa recensione? L'operazione non è reversibile.",
      () => {
        // rimuoviRecensione filtra via la recensione da "reviews:<idRicetta>"; il terzo argomento
        // (utente.id) garantisce che si possa rimuovere SOLO la propria. Poi ri-renderizziamo la lista.
        rimuoviRecensione(idRicetta, idRecensione, utente.id);
        inizializzaVistaRecensioni();
      }
    );
  };
}
