// ============================================================================
//  VISTA RICETTARIO — ricettario personale dell'utente (frammento ricettario.html)
// ============================================================================
// Rotta PROTETTA: mostra le ricette salvate dall'utente. Gli id stanno in "cookbook:<idUtente>";
// per ognuno ripeschiamo i dettagli (cache/API) e renderizziamo una card con: campo NOTA PRIVATA
// (textarea + "Salva nota"), pulsante recensione e pulsante di rimozione dal ricettario.
import {
  ottieniUtenteCorrente,
  aggiornaRicettario,
  aggiornaNotaRicettario,
  ottieniRecensioni
} from "../storage.js";
import { recuperaRicettaPerId } from "../gestione-api/api.js";
import { creaCardRicettario } from "../componenti/carte.js";
import { mostraModalConfermaRicettario } from "../componenti/azioni-card.js";

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

  // Costruiamo un Set degli id ricette che l'utente ha già recensito, per adattare il label del pulsante.
  const idsRecensiti = new Set(
    ottieniRecensioni()
      .filter(r => r.idUtente === utente.id)
      .map(r => r.idRicetta)
  );

  // Mappa idRicetta → nota privata, ricavata dal ricettario dell'utente (cookbook:<id>.notesByRecipeId,
  // esposto da ottieniUtenteCorrente come lista { idRicetta, nota }). Serve a precompilare le textarea.
  const noteById = new Map(
    (utente.ricettario ?? []).map(voce => [voce.idRicetta, voce.nota ?? ""])
  );

  elenco.innerHTML = ricetteValide
    .map(ricetta =>
      creaCardRicettario(ricetta, {
        haRecensione: idsRecensiti.has(ricetta.id),
        nota: noteById.get(ricetta.id) ?? ""
      })
    )
    .join("");

  // Un solo handler delegato sul contenitore gestisce DUE azioni delle card, distinte per attributo
  // data-*: rimozione ricetta (con modale di conferma) e salvataggio della nota privata.
  // Uso onclick (riassegnazione idempotente) così le ri-renderizzazioni non accumulano listener.
  elenco.onclick = event => {
    // 1) Salvataggio nota privata: leggo la textarea gemella (stesso id) e persisto in cookbook:<id>.
    const bottoneNota = event.target.closest("[data-salva-nota]");
    if (bottoneNota) {
      const idRicetta = bottoneNota.dataset.salvaNota;
      const textarea = elenco.querySelector(`[data-nota-ricetta="${CSS.escape(idRicetta)}"]`);
      if (!textarea) return;
      // >>> SCRITTURA nel web storage <<<
      // DEVTOOLS: Application → Local Storage → "cookbook:<tuoId>": dopo "Salva nota" il testo
      // compare in notesByRecipeId sotto la chiave di questa ricetta (resta privato, niente recensioni).
      aggiornaNotaRicettario(idRicetta, textarea.value.trim());
      mostraFeedbackNota(idRicetta);
      return;
    }
    // 2) Rimozione ricetta dal ricettario (con conferma): se confermata, ri-renderizza la vista.
    const bottoneRimuovi = event.target.closest("[data-rimuovi-ricetta]");
    if (!bottoneRimuovi) return;
    const idRicetta = bottoneRimuovi.dataset.rimuoviRicetta;
    const nomeRicetta = bottoneRimuovi.dataset.rimuoviNome || "questa ricetta";
    mostraModalConfermaRicettario(
      `Vuoi rimuovere "${nomeRicetta}" dal tuo ricettario?`,
      async () => {
        await aggiornaRicettario(idRicetta, false);
        inizializzaVistaRicettario();
      }
    );
  };
}

// Mostra per ~2s l'indicatore "Nota salvata ✓" accanto al pulsante di salvataggio della ricetta data.
function mostraFeedbackNota(idRicetta) {
  const feedback = document.querySelector(`[data-nota-feedback="${CSS.escape(idRicetta)}"]`);
  if (!feedback) return;
  feedback.classList.remove("d-none");
  setTimeout(() => feedback.classList.add("d-none"), 2000);
}
