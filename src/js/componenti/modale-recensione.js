import {
  ottieniUtenteCorrente,
  ottieniRecensioniRicetta,
  salvaRecensioniRicetta,
  generaIdRecensione
} from "../storage.js";

let contestoModale = {
  ricetta: null,
  onSalvata: null
};

export function renderModaleRecensione(ricetta) {
  return `
    <div
      class="cc-modal-backdrop d-none"
      id="modalRecensione"
      aria-hidden="true"
      data-confirm-button="modalRecensioneConferma"
    >
      <div class="cc-modal cc-modal-large" role="dialog" aria-labelledby="modalRecensioneTitolo" aria-modal="true">
        <div class="cc-modal-header d-flex justify-content-between align-items-center">
          <h2 class="h6 mb-0" id="modalRecensioneTitolo">Recensione per "${ricetta.nome}"</h2>
          <button class="cc-modal-close" type="button" id="modalRecensioneChiudi" aria-label="Chiudi modal">&times;</button>
        </div>
        <div class="cc-modal-body">
          <form id="formRecensioneModal" class="d-flex flex-column gap-3" data-ricetta-id="${ricetta.id}">
            <div class="row g-3 align-items-end">
              <div class="col-md-4">
                <label class="form-label" for="dataRecensione">Data di preparazione</label>
                <input type="date" class="form-control" id="dataRecensione" required />
              </div>
              <div class="col-md-4">
                <label class="form-label" for="difficoltaRecensione">Difficolta (1-5)</label>
                <select class="form-select" id="difficoltaRecensione" required>
                  <option value="5">5</option>
                  <option value="4">4</option>
                  <option value="3" selected>3</option>
                  <option value="2">2</option>
                  <option value="1">1</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label" for="gustoRecensione">Gusto (1-5)</label>
                <select class="form-select" id="gustoRecensione" required>
                  <option value="5">5</option>
                  <option value="4" selected>4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1</option>
                </select>
              </div>
            </div>
            <div>
              <label class="form-label" for="testoRecensione">Commento (opzionale)</label>
              <textarea class="form-control" id="testoRecensione" rows="4" placeholder="Note, varianti, abbinamenti..."></textarea>
            </div>
          </form>
        </div>
        <div class="cc-modal-footer">
          <button type="button" class="btn btn-contorno-accento" id="modalRecensioneAnnulla">Chiudi</button>
          <button type="submit" class="btn btn-primary" id="modalRecensioneConferma" form="formRecensioneModal">Salva recensione</button>
        </div>
      </div>
    </div>
  `;
}

export function inizializzaModaleRecensione(ricetta, onRecensioneSalvata) {
  contestoModale = { ricetta, onSalvata: onRecensioneSalvata };
  const { backdrop, chiudi, annulla, form } = ottieniElementiModal();
  if (!backdrop || !form) return;

  form.addEventListener("submit", gestisciInvioRecensione);
  chiudi?.addEventListener("click", () => chiudiModalRecensione(true));
  annulla?.addEventListener("click", () => chiudiModalRecensione(true));
  backdrop?.addEventListener("click", evento => {
    if (evento.target === backdrop) {
      chiudiModalRecensione(true);
    }
  });
}

export function apriModaleRecensione() {
  const { backdrop, form } = ottieniElementiModal();
  if (!backdrop || !form) return;
  compilaFormRecensione(form, contestoModale.ricetta?.id);
  backdrop.classList.remove("d-none");
  backdrop.setAttribute("aria-hidden", "false");
  const primoCampo = form.querySelector("input, select, textarea");
  primoCampo?.focus();
}

function chiudiModalRecensione(chiediConferma) {
  const { backdrop, form } = ottieniElementiModal();
  if (!backdrop || !form) return;
  if (chiediConferma && formSporco(form) && !window.confirm("Vuoi abbandonare la recensione?")) {
    return;
  }
  backdrop.classList.add("d-none");
  backdrop.setAttribute("aria-hidden", "true");
}

function gestisciInvioRecensione(evento) {
  evento.preventDefault();
  const form = evento.target;
  const utente = ottieniUtenteCorrente();
  if (!utente || !contestoModale.ricetta) {
    window.location.hash = "#/accesso";
    return;
  }
  const idRicetta = contestoModale.ricetta.id;
  const cookedAt = form.querySelector("#dataRecensione").value;
  const difficulty = Number(form.querySelector("#difficoltaRecensione").value);
  const taste = Number(form.querySelector("#gustoRecensione").value);
  const commento = form.querySelector("#testoRecensione").value.trim();
  if (!cookedAt || !difficulty || !taste) {
    form.reportValidity();
    return;
  }

  const recensioni = ottieniRecensioniRicetta(idRicetta);
  const indiceEsistente = recensioni.findIndex(
    recensione => recensione.idUtente === utente.id
  );
  const now = new Date().toISOString();
  const datiRecensione = {
    id: indiceEsistente !== -1 ? recensioni[indiceEsistente].id : generaIdRecensione(),
    userId: utente.id,
    cookedAt,
    difficulty,
    taste,
    commento,
    createdAt:
      indiceEsistente !== -1
        ? recensioni[indiceEsistente].createdAt ?? now
        : now,
    updatedAt: now
  };

  if (indiceEsistente !== -1) {
    recensioni[indiceEsistente] = datiRecensione;
  } else {
    recensioni.push(datiRecensione);
  }
  salvaRecensioniRicetta(idRicetta, recensioni);
  salvaSnapshotFormRecensione(form);
  chiudiModalRecensione(false);
  if (typeof contestoModale.onSalvata === "function") {
    contestoModale.onSalvata();
  }
}

function compilaFormRecensione(form, idRicetta) {
  const utente = ottieniUtenteCorrente();
  const esistente = ottieniRecensioniRicetta(idRicetta).find(
    recensione => recensione.idUtente === utente?.id
  );
  const oggi = new Date().toISOString().split("T")[0];
  form.querySelector("#dataRecensione").value = esistente?.cookedAt ?? oggi;
  form.querySelector("#difficoltaRecensione").value = String(esistente?.difficulty ?? 3);
  form.querySelector("#gustoRecensione").value = String(esistente?.taste ?? 4);
  form.querySelector("#testoRecensione").value = esistente?.commento ?? "";
  salvaSnapshotFormRecensione(form);
}

function formSporco(form) {
  try {
    const corrente = snapshotFormRecensione(form);
    const iniziale = form.dataset.initialSnapshot ? JSON.parse(form.dataset.initialSnapshot) : null;
    if (!iniziale) return false;
    return JSON.stringify(corrente) !== JSON.stringify(iniziale);
  } catch {
    return false;
  }
}

function snapshotFormRecensione(form) {
  return {
    data: form.querySelector("#dataRecensione")?.value || "",
    difficolta: form.querySelector("#difficoltaRecensione")?.value || "",
    gusto: form.querySelector("#gustoRecensione")?.value || "",
    testo: (form.querySelector("#testoRecensione")?.value || "").trim()
  };
}

function salvaSnapshotFormRecensione(form) {
  form.dataset.initialSnapshot = JSON.stringify(snapshotFormRecensione(form));
}

function ottieniElementiModal() {
  return {
    backdrop: document.getElementById("modalRecensione"),
    chiudi: document.getElementById("modalRecensioneChiudi"),
    annulla: document.getElementById("modalRecensioneAnnulla"),
    form: document.getElementById("formRecensioneModal")
  };
}
