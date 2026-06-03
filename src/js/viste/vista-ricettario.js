// ============================================================================
//  VISTA RICETTARIO — ricettario personale dell'utente (frammento ricettario.html)
// ============================================================================
// Rotta PROTETTA: mostra le ricette salvate dall'utente. Gli id stanno in "cookbook:<idUtente>";
// per ognuno ripeschiamo i dettagli (cache/API) e renderizziamo una card con pulsanti rimuovi/recensisci.
import { ottieniUtenteCorrente, aggiornaRicettario } from "../storage.js";
import { recuperaRicettaPerId } from "../gestione-api/api.js";
import { creaCardRicettario } from "../componenti/carte.js";

export async function inizializzaVistaRicettario() {
  const utente = ottieniUtenteCorrente();
  if (!utente) {
    window.location.hash = "#/accesso"; // doppia sicurezza: il router protegge già la rotta
    return;
  }
  const elenco = document.getElementById("elencoRicettario");
  const badge = document.getElementById("conteggioRicettario");
  elenco.innerHTML = '<p class="text-muted">Caricamento ricette...</p>';

  const ricetteSalvate = await Promise.all(
    (utente.ricettario ?? []).map(async voce => {
      const ricetta = await recuperaRicettaPerId(voce.idRicetta);
      return ricetta;
    })
  );
  const ricetteValide = ricetteSalvate.filter(Boolean);
  badge.textContent = `${ricetteValide.length} ricette`;
  if (ricetteValide.length === 0) {
    elenco.innerHTML =
      '<p class="text-muted">Il ricettario è vuoto. Visita una ricetta e salvala.</p>';
    return;
  }

  elenco.innerHTML = ricetteValide.map(ricetta => creaCardRicettario(ricetta)).join("");

  elenco.onclick = event => {
    const target = event.target;
    if (target.matches("[data-rimuovi-ricetta]")) {
      const idRicetta = target.dataset.rimuoviRicetta;
      aggiornaRicettario(idRicetta, false);
      inizializzaVistaRicettario();
    }
  };

  elenco.onchange = null;
}
