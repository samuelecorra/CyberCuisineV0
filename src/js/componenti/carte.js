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

export function creaCardRicettario(ricetta, nota = "") {
  return `
        <div class="col-md-6">
            <div class="card card-bagliore h-100">
                <div class="row g-0 h-100">
                    <div class="col-md-4">
                        <img src="${ricetta.miniatura}" class="img-fluid rounded-start h-100 adatta-copertura" alt="${ricetta.nome}" />
                    </div>
                    <div class="col-md-8">
                        <div class="card-body d-flex flex-column">
                            <h3 class="h5">${ricetta.nome}</h3>
                            <p class="text-muted mb-2">${ricetta.categoria} - ${ricetta.area}</p>
                            <div class="mb-3">
                                <label class="form-label">Nota privata</label>
                                <textarea class="form-control" rows="2" data-nota-ricetta="${ricetta.id}">${nota}</textarea>
                            </div>
                            <div class="mt-auto d-flex gap-2">
                                <a class="btn btn-contorno-accento" href="#/ricetta/${ricetta.id}">Dettagli</a>
                                <button class="btn btn-danger" data-rimuovi-ricetta="${ricetta.id}">Rimuovi</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function creaCardRecensione(recensione, ricetta, autore = "Utente") {
  const valutazione = recensione.valutazione ?? recensione.gusto ?? null;
  const difficolta = recensione.difficolta ?? "N/D";
  const tempo = recensione.tempoPreparazione ? `${recensione.tempoPreparazione} min` : "N/D";
  const consigliata =
    recensione.consigliata === "no"
      ? "No"
      : recensione.consigliata === "forse"
        ? "Forse"
        : "Sì";
  return `
        <div class="col-md-6">
            <div class="card card-bagliore h-100">
                <div class="card-body">
                    <p class="small testo-accento mb-1">${autore}</p>
                    <h3 class="h5">${ricetta?.nome ?? "Ricetta"}</h3>
                    <p class="text-muted">Preparata il ${recensione.dataPreparazione ?? "Data non disponibile"}</p>
                    <p class="mb-1">Valutazione: <strong>${valutazione ? `${valutazione}/5` : "N/D"}</strong></p>
                    <p class="mb-1">Difficoltà: <strong>${difficolta}</strong></p>
                    <p class="mb-1">Tempo: <strong>${tempo}</strong></p>
                    <p class="mb-1">La consiglieresti? <strong>${consigliata}</strong></p>
                    <p class="small text-muted">${recensione.commento || "Nessun commento."}</p>
                    <a class="btn btn-contorno-accento" href="#/ricetta/${
                      recensione.idRicetta
                    }">Vai alla ricetta</a>
                </div>
            </div>
        </div>
    `;
}

function escapeHtmlAttribute(valore = "") {
  return String(valore)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
