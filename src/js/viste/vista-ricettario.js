import {
  ottieniUtenteCorrente,
  aggiornaRicettario,
  aggiornaNotaRicettario
} from "../storage.js";
import { garantisciRicettaInCache } from "../api.js";
import { creaCardRicettario } from "../componenti/carte.js";

export async function inizializzaVistaRicettario() {
  const utente = ottieniUtenteCorrente();
  if (!utente) {
    window.location.hash = "#/accesso";
    return;
  }
  const elenco = document.getElementById("elencoRicettario");
  const badge = document.getElementById("conteggioRicettario");
  elenco.innerHTML = '<p class="text-muted">Caricamento ricette...</p>';

  const ricetteSalvate = await Promise.all(
    (utente.ricettario ?? []).map(async voce => {
      const ricetta = await garantisciRicettaInCache(voce.idRicetta);
      return { ricetta, nota: voce.nota ?? "" };
    })
  );
  badge.textContent = `${ricetteSalvate.filter(item => item.ricetta).length} ricette`;
  if (ricetteSalvate.length === 0) {
    elenco.innerHTML =
      '<p class="text-muted">Il ricettario è vuoto. Visita una ricetta e salvala.</p>';
    return;
  }

  elenco.innerHTML = ricetteSalvate
    .filter(item => item.ricetta)
    .map(({ ricetta, nota }) => creaCardRicettario(ricetta, nota))
    .join("");

  elenco.onclick = event => {
    const target = event.target;
    if (target.matches("[data-rimuovi-ricetta]")) {
      const idRicetta = target.dataset.rimuoviRicetta;
      aggiornaRicettario(idRicetta, false);
      inizializzaVistaRicettario();
    }
  };

  elenco.onchange = event => {
    const target = event.target;
    if (target.matches("[data-nota-ricetta]")) {
      const idRicetta = target.dataset.notaRicetta;
      aggiornaNotaRicettario(idRicetta, target.value);
    }
  };
}
