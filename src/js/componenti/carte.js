// ============================================================================
//  COMPONENTI "CARD" — generatori di markup riutilizzabili (template string)
// ============================================================================
// Queste funzioni NON toccano il DOM: restituiscono solo stringhe HTML che le viste poi inseriscono
// con innerHTML. Centralizzare qui i template evita di duplicare la stessa struttura in più viste e
// tiene coerente l'aspetto delle card in tutta l'app (home, esplora, ricettario, recensioni).

// Card ricetta usata in home ed esplora. `stato` dice se la ricetta è già nel ricettario dell'utente
// e se l'utente l'ha già recensita, così i pulsanti mostrano l'etichetta giusta (Aggiungi/Rimuovi, ecc.).
export function creaCardRicetta(ricetta, stato = {}) {
  const { inRicettario = false, haRecensione = false } = stato;
  const cookbookMode = inRicettario ? "remove" : "add";
  const cookbookLabel = inRicettario ? "Rimuovi dal ricettario" : "Aggiungi al ricettario";
  const cookbookClass = inRicettario ? "btn btn-danger w-100" : "btn btn-primary w-100";
  const reviewMode = haRecensione ? "view" : "write";
  const reviewLabel = haRecensione ? "Guarda la tua recensione" : "Scrivi recensione";
  const nomeRicettaAttr = escapeHtmlAttribute(ricetta.nome ?? "");

  return `
        <div class="col-12 col-sm-6 col-md-4 col-lg-3">
            <div class="card card-bagliore h-100">
                <div
                    class="card-media"
                    role="button"
                    tabindex="0"
                    data-apri-dettaglio="true"
                    data-ricetta-id="${ricetta.id}"
                    aria-label="Apri i dettagli di ${nomeRicettaAttr}"
                >
                    <img src="${ricetta.miniatura}" class="card-img-top" alt="${ricetta.nome}" loading="lazy" />
                </div>
                <div class="card-body d-flex flex-column">
                    <h3 class="h5">${ricetta.nome}</h3>
                    <p class="text-muted mb-2">${ricetta.categoria} - ${ricetta.area}</p>
                    <div class="mt-auto d-grid gap-2">
                        <button
                            class="${cookbookClass} btn-azione-ricetta"
                            data-azione-ricetta="cookbook"
                            data-cookbook-mode="${cookbookMode}"
                            data-ricetta-id="${ricetta.id}"
                            data-ricetta-nome="${nomeRicettaAttr}"
                        >
                            ${cookbookLabel}
                        </button>
                        <button
                            class="btn btn-contorno-accento w-100 btn-azione-ricetta"
                            data-azione-ricetta="review"
                            data-review-mode="${reviewMode}"
                            data-ricetta-id="${ricetta.id}"
                            data-ricetta-nome="${nomeRicettaAttr}"
                        >
                            ${reviewLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function creaCardRicettario(ricetta, { haRecensione = false } = {}) {
  const nomeRicettaAttr = escapeHtmlAttribute(ricetta.nome ?? "");
  const reviewLabel = haRecensione ? "Modifica recensione" : "Scrivi recensione";
  return `
        <div class="col-md-6">
            <div class="card card-bagliore h-100">
                <div class="row g-0 h-100">
                    <div class="col-md-4">
                        <div
                          class="cc-card-clickable h-100"
                          role="button"
                          tabindex="0"
                          data-apri-dettaglio="true"
                          data-ricetta-id="${ricetta.id}"
                          aria-label="Apri i dettagli di ${nomeRicettaAttr}"
                        >
                          <img src="${ricetta.miniatura}" class="img-fluid rounded-start h-100 adatta-copertura" alt="${ricetta.nome}" />
                        </div>
                    </div>
                    <div class="col-md-8">
                        <div class="card-body d-flex flex-column">
                            <h3
                              class="h5 cc-card-title cc-card-clickable"
                              role="button"
                              tabindex="0"
                              data-apri-dettaglio="true"
                              data-ricetta-id="${ricetta.id}"
                              aria-label="Apri i dettagli di ${nomeRicettaAttr}"
                            >
                              ${ricetta.nome}
                            </h3>
                            <p class="text-muted mb-2">${ricetta.categoria} - ${ricetta.area}</p>
                            <div class="mt-auto d-flex gap-2">
                                <button
                                  class="btn btn-contorno-accento btn-azione-ricetta"
                                  data-azione-ricetta="review"
                                  data-review-mode="write"
                                  data-review-direct="true"
                                  data-ricetta-id="${ricetta.id}"
                                  data-ricetta-nome="${nomeRicettaAttr}"
                                >
                                  ${reviewLabel}
                                </button>
                                <button
                                  class="btn btn-danger"
                                  data-rimuovi-ricetta="${ricetta.id}"
                                  data-rimuovi-nome="${nomeRicettaAttr}"
                                >
                                  Rimuovi dal ricettario
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Card recensione: mostra autore, ricetta, data di preparazione e i due voti 1-5 (difficoltà/gusto),
// più l'eventuale commento. `opzioni.mostraRimuovi` aggiunge il pulsante di rimozione (solo al proprietario).
export function creaCardRecensione(recensione, ricetta, autore = "Utente", opzioni = {}) {
  const difficolta = formattaVoto(recensione.difficulty ?? recensione.difficolta);
  const gusto = formattaVoto(recensione.taste ?? recensione.valutazione ?? recensione.gusto);
  const dataPreparazione =
    recensione.cookedAt ?? recensione.dataPreparazione ?? "Data non disponibile";
  const pulsanteRimuovi = opzioni.mostraRimuovi
    ? `<button class="btn btn-danger" data-rimuovi-recensione="${recensione.id}" data-ricetta-id="${recensione.idRicetta}">Rimuovi recensione</button>`
    : "";
  return `
        <div class="col-md-6" data-card-ricetta-id="${recensione.idRicetta ?? ""}">
            <div class="card card-bagliore h-100">
                <div class="card-body d-flex flex-column">
                    <p class="small testo-accento mb-1">${autore}</p>
                    <h3 class="h5">${ricetta?.nome ?? "Ricetta"}</h3>
                    <p class="text-muted">Preparata il ${dataPreparazione}</p>
                    <p class="mb-1">Difficolta: <strong>${difficolta}</strong></p>
                    <p class="mb-1">Gusto: <strong>${gusto}</strong></p>
                    <p class="small text-muted">${recensione.commento || "Nessun commento."}</p>
                    <div class="mt-auto d-flex align-items-center gap-2 flex-wrap">
                      <a class="btn btn-contorno-accento" href="#/ricetta/${recensione.idRicetta}">Vai alla ricetta</a>
                      ${pulsanteRimuovi}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Formatta un voto numerico come "n/5"; se assente/non valido mostra "N/D".
function formattaVoto(valore) {
  const numero = Number(valore);
  if (!numero || Number.isNaN(numero)) return "N/D";
  return `${numero}/5`;
}

// Esegue l'escape dei caratteri speciali prima di inserire il nome della ricetta dentro un ATTRIBUTO
// HTML (es. data-ricetta-nome="..."). Evita che un nome con virgolette o < > rompa il markup
// generato dalle template string. Piccola buona pratica anche se i dati arrivano da TheMealDB.
function escapeHtmlAttribute(valore = "") {
  return String(valore)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
