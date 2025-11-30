import { statoApp } from "../stato.js";
import { cercaRicettePerNome, cercaRicettePerIngrediente, cercaRicettePerLettera } from "../api.js";
import { memorizzaRicette } from "../storage.js";
import { creaCardRicetta } from "../componenti/carte.js";
import { ottieniStatoAzioniUtente } from "../azioni-card.js";

export function inizializzaVistaRicerca() {
  mostraRisultatiRicerca(statoApp.risultatiRicerca);
  const pulsanti = document.querySelectorAll("#controlliRicerca button[data-ricerca]");
  pulsanti.forEach(btn => {
    btn.addEventListener("click", async () => {
      const tipo = btn.dataset.ricerca;
      await gestisciRicerca(tipo);
    });
  });
}

export async function gestisciRicerca(tipo) {
  const badgeConteggio = document.getElementById("conteggioRicerca");
  badgeConteggio.textContent = "Ricerca in corso...";
  let risultati = [];
  try {
    if (tipo === "nome") {
      const valore = document.getElementById("ricercaNome").value;
      risultati = await cercaRicettePerNome(valore);
    } else if (tipo === "ingrediente") {
      const valore = document.getElementById("ricercaIngrediente").value;
      risultati = await cercaRicettePerIngrediente(valore);
    } else if (tipo === "lettera") {
      const valore = document.getElementById("ricercaLettera").value;
      risultati = await cercaRicettePerLettera(valore);
    }
    memorizzaRicette(risultati);
  } catch (errore) {
    console.error("Errore durante la ricerca", errore);
    badgeConteggio.textContent = "Errore di ricerca";
    const contenitore = document.getElementById("risultatiRicerca");
    if (contenitore) {
      contenitore.innerHTML =
        '<p class="text-danger">Impossibile completare la ricerca. Riprova.</p>';
    }
  }
  statoApp.risultatiRicerca = risultati;
  mostraRisultatiRicerca(risultati);
}

export function mostraRisultatiRicerca(risultati = []) {
  const contenitore = document.getElementById("risultatiRicerca");
  const badgeConteggio = document.getElementById("conteggioRicerca");
  if (!contenitore || !badgeConteggio) return;
  badgeConteggio.textContent = `${risultati.length} ricette`;
  if (risultati.length === 0) {
    contenitore.innerHTML =
      '<p class="text-muted">Nessun risultato. Prova con un altro termine.</p>';
    return;
  }
  const { idsRicettario, idsRecensioni } = ottieniStatoAzioniUtente();
  contenitore.innerHTML = risultati
    .map(ricetta =>
      creaCardRicetta(ricetta, {
        inRicettario: idsRicettario.has(ricetta.id),
        haRecensione: idsRecensioni.has(ricetta.id)
      })
    )
    .join("");
}
