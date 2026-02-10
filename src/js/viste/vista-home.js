import { ottieniCatalogoOrdinato } from "../gestione-api/api.js";
import { creaCardRicetta } from "../componenti/carte.js";
import { ottieniStatoAzioniUtente } from "../componenti/azioni-card.js";

export function inizializzaVistaHome() {
  const griglia = document.getElementById("grigliaHomeFeatured");
  const badge = document.getElementById("conteggioHomeFeatured");
  if (!griglia || !badge) return;

  const catalogo = ottieniCatalogoOrdinato();
  if (catalogo.length === 0) {
    badge.textContent = "0 ricette";
    griglia.innerHTML =
      '<p class="text-muted">Nessuna ricetta disponibile al momento. Riprova tra poco.</p>';
    return;
  }

  const selezione = estraiCasuali(catalogo, 4);
  const statoAzioni = ottieniStatoAzioniUtente();
  badge.textContent = `${selezione.length} ricette`;
  griglia.innerHTML = selezione
    .map(ricetta =>
      creaCardRicetta(ricetta, {
        inRicettario: statoAzioni.idsRicettario.has(ricetta.id),
        haRecensione: statoAzioni.idsRecensioni.has(ricetta.id)
      })
    )
    .join("");
}

function estraiCasuali(elenco, numero) {
  const copia = [...elenco];
  const selezione = [];
  while (copia.length > 0 && selezione.length < numero) {
    const indice = Math.floor(Math.random() * copia.length);
    selezione.push(copia.splice(indice, 1)[0]);
  }
  return selezione;
}
