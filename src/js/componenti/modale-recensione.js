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

let modalInstance = null;
let modalInizializzata = false;

export function apriModaleRecensione(ricetta, onRecensioneSalvata) {
  if (!ricetta) return;
  contestoModale = { ricetta, onSalvata: onRecensioneSalvata };
  const modal = assicuraModale();
  aggiornaTitolo(ricetta.nome);
  compilaFormRecensione(modal.querySelector("#formRecensioneModal"), ricetta.id);
  mostraModale(modal);
}

function assicuraModale() {
  let modal = document.getElementById("modalRecensione");
  if (!modal) {
    document.body.insertAdjacentHTML("beforeend", templateModaleRecensione());
    modal = document.getElementById("modalRecensione");
  }
  if (!modalInizializzata) {
    inizializzaEventi(modal);
    modalInizializzata = true;
  }
  return modal;
}

function templateModaleRecensione() {
  return `
    <div
      class="modal fade"
      id="modalRecensione"
      tabindex="-1"
      aria-labelledby="modalRecensioneTitolo"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content cc-modal">
          <div class="modal-header border-0">
            <h2 class="h6 mb-0" id="modalRecensioneTitolo">Recensione</h2>
            <button
              class="cc-modal-close"
              type="button"
              aria-label="Chiudi modal"
              data-bs-dismiss="modal"
            >&times;</button>
          </div>
          <div class="modal-body">
            <form id="formRecensioneModal" class="d-flex flex-column gap-3">
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
          <div class="modal-footer border-0">
            <button type="button" class="btn btn-contorno-accento" data-bs-dismiss="modal">Chiudi</button>
            <button type="submit" class="btn btn-primary" id="modalRecensioneConferma" form="formRecensioneModal">Salva recensione</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function inizializzaEventi(modal) {
  const form = modal.querySelector("#formRecensioneModal");
  if (form) {
    form.addEventListener("submit", gestisciInvioRecensione);
  }
}

function mostraModale(modal) {
  const BootstrapModal = window.bootstrap?.Modal;
  if (!BootstrapModal) {
    modal.classList.add("show");
    modal.style.display = "block";
    modal.removeAttribute("aria-hidden");
    return;
  }
  if (!modalInstance) {
    modalInstance = new BootstrapModal(modal, { backdrop: true, keyboard: true });
  }
  modalInstance.show();
}

function nascondiModale(modal) {
  if (modalInstance) {
    modalInstance.hide();
    return;
  }
  modal.classList.remove("show");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

function aggiornaTitolo(nomeRicetta) {
  const titolo = document.getElementById("modalRecensioneTitolo");
  if (titolo) {
    titolo.textContent = nomeRicetta ? `Recensione per "${nomeRicetta}"` : "Recensione";
  }
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
  const modal = document.getElementById("modalRecensione");
  if (modal) {
    nascondiModale(modal);
  }
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
}
