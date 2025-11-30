import { ottieniUtenteCorrente } from "../storage.js";
import { cercaRicettePerArea, descriviArea } from "../api.js";
import { creaCardRicetta } from "../componenti/carte.js";
import { ottieniStatoAzioniUtente } from "../azioni-card.js";

export async function inizializzaVistaHomeLoggata() {
  const utente = ottieniUtenteCorrente();
  const grigliaOrigine = document.getElementById("grigliaOrigine");
  const grigliaResidenza = document.getElementById("grigliaResidenza");
  const badgeOrigine = document.getElementById("conteggioOrigine");
  const badgeResidenza = document.getElementById("conteggioResidenza");

  if (!utente) {
    if (grigliaOrigine)
      grigliaOrigine.innerHTML = '<p class="text-muted">Accedi per vedere le ricette.</p>';
    if (grigliaResidenza)
      grigliaResidenza.innerHTML = '<p class="text-muted">Accedi per vedere le ricette.</p>';
    if (badgeOrigine) badgeOrigine.textContent = "0 ricette";
    if (badgeResidenza) badgeResidenza.textContent = "0 ricette";
    return;
  }

  const { paeseOrigine, paeseResidenza } = utente;
  const statoAzioni = ottieniStatoAzioniUtente();

  // Origine
  if (!paeseOrigine) {
    grigliaOrigine.innerHTML =
      '<p class="text-muted">Imposta il paese di origine nel profilo per vedere suggerimenti.</p>';
    badgeOrigine.textContent = "0 ricette";
  } else {
    grigliaOrigine.innerHTML = '<p class="text-muted">Caricamento ricette...</p>';
    const ricetteOrigine = await cercaRicettePerArea(paeseOrigine, 4);
    badgeOrigine.textContent = `${ricetteOrigine.length} ricette`;
    const etichettaOrigine = descriviArea(paeseOrigine);
    grigliaOrigine.innerHTML =
      ricetteOrigine.length > 0
        ? ricetteOrigine
            .map(ricetta =>
              creaCardRicetta(ricetta, {
                inRicettario: statoAzioni.idsRicettario.has(ricetta.id),
                haRecensione: statoAzioni.idsRecensioni.has(ricetta.id)
              })
            )
            .join("")
        : `<p class="text-muted">Nessuna ricetta trovata per ${etichettaOrigine}.</p>`;
  }

  // Residenza
  if (!paeseResidenza) {
    grigliaResidenza.innerHTML =
      '<p class="text-muted">Imposta il paese di residenza nel profilo per vedere suggerimenti.</p>';
    badgeResidenza.textContent = "0 ricette";
  } else {
    grigliaResidenza.innerHTML = '<p class="text-muted">Caricamento ricette...</p>';
    const ricetteResidenza = await cercaRicettePerArea(paeseResidenza, 4);
    badgeResidenza.textContent = `${ricetteResidenza.length} ricette`;
    const etichettaResidenza = descriviArea(paeseResidenza);
    grigliaResidenza.innerHTML =
      ricetteResidenza.length > 0
        ? ricetteResidenza
            .map(ricetta =>
              creaCardRicetta(ricetta, {
                inRicettario: statoAzioni.idsRicettario.has(ricetta.id),
                haRecensione: statoAzioni.idsRecensioni.has(ricetta.id)
              })
            )
            .join("")
        : `<p class="text-muted">Nessuna ricetta trovata per ${etichettaResidenza}.</p>`;
  }
}
