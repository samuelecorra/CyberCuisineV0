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
  return `
        <div class="col-md-6">
            <div class="card card-bagliore h-100">
                <div class="card-body">
                    <p class="small testo-accento mb-1">${autore}</p>
                    <h3 class="h5">${ricetta?.nome ?? "Ricetta"}</h3>
                    <p class="text-muted">Preparata il ${recensione.dataPreparazione}</p>
                    <p class="mb-1">Difficoltà: <strong>${recensione.difficolta}/5</strong></p>
                    <p class="mb-1">Gusto: <strong>${recensione.gusto}/5</strong></p>
                    <p class="small text-muted">${recensione.commento || "Nessun commento."}</p>
                    <a class="btn btn-contorno-accento" href="#/ricetta/${
                      recensione.idRicetta
                    }">Vai alla ricetta</a>
                </div>
            </div>
        </div>
    `;
}

export function creaFormRecensione(idRicetta) {
  const oggi = new Date().toISOString().split("T")[0];
  return `
        <hr class="border-secondary my-4" />
        <h3 class="h6 text-uppercase">La tua recensione</h3>
        <form id="formRecensione" class="mt-3" data-ricetta-id="${idRicetta}">
            <div class="mb-2">
                <label class="form-label" for="dataRecensione">Data preparazione</label>
                <input type="date" class="form-control" id="dataRecensione" value="${oggi}" required />
            </div>
            <div class="mb-2">
                <label class="form-label" for="difficoltaRecensione">Difficoltà (1-5)</label>
                <input type="number" class="form-control" id="difficoltaRecensione" min="1" max="5" value="3" required />
            </div>
            <div class="mb-2">
                <label class="form-label" for="gustoRecensione">Gusto (1-5)</label>
                <input type="number" class="form-control" id="gustoRecensione" min="1" max="5" value="4" required />
            </div>
            <div class="mb-3">
                <label class="form-label" for="commentoRecensione">Commento</label>
                <textarea class="form-control" id="commentoRecensione" rows="2" placeholder="Note personali"></textarea>
            </div>
            <button class="btn btn-contorno-accento w-100" type="submit">Salva recensione</button>
        </form>
    `;
}

function escapeHtmlAttribute(valore = "") {
  return String(valore)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
