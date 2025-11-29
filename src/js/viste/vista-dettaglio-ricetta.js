import {
  ottieniUtenteCorrente,
  ottieniRecensioni,
  ottieniUtenti,
  salvaRecensioni,
  aggiornaRicettario,
  aggiornaNotaRicettario
} from "../storage.js";
import { garantisciRicettaInCache } from "../api.js";
import { creaFormRecensione, creaCardRecensione } from "../componenti/carte.js";
import { generaId } from "../ui.js";

export async function inizializzaVistaDettaglioRicetta(idRicetta) {
  const wrapper = document.getElementById("dettaglioRicetta");
  if (!idRicetta || !wrapper) {
    wrapper.innerHTML = '<p class="text-danger">Ricetta non trovata.</p>';
    return;
  }
  wrapper.innerHTML = '<p class="text-muted">Caricamento dettagli ricetta...</p>';
  const ricetta = await garantisciRicettaInCache(idRicetta);
  if (!ricetta) {
    wrapper.innerHTML = '<p class="text-danger">Impossibile recuperare la ricetta.</p>';
    return;
  }
  const utente = ottieniUtenteCorrente();
  const inRicettario = utente?.ricettario?.some(entry => entry.idRicetta === ricetta.id);
  const notaAttuale = utente?.ricettario?.find(entry => entry.idRicetta === ricetta.id)?.nota ?? "";

  wrapper.innerHTML = `
        <div class="col-lg-7">
            <div class="card card-bagliore mb-4">
                <img src="${ricetta.miniatura}" class="card-img-top" alt="${ricetta.nome}" />
                <div class="card-body">
                    <p class="text-uppercase testo-accento mb-1">${ricetta.categoria} - ${ricetta.area}</p>
                    <h1 class="h3 mb-3">${ricetta.nome}</h1>
                    <div class="mb-3">
                        <h2 class="h6 text-uppercase">Ingredienti</h2>
                        <ul class="list-unstyled small">
                            ${ricetta.ingredienti.map(item => `<li>- ${item.quantita} ${item.nome}</li>`).join("")}
                        </ul>
                    </div>
                    <div>
                        <h2 class="h6 text-uppercase">Istruzioni</h2>
                        <p class="testo-pre-linea">${ricetta.istruzioni}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-lg-5">
            <div class="card card-bagliore mb-4">
                <div class="card-body">
                    <h2 class="h5 mb-3">Ricettario personale</h2>
                    ${
                      utente
                        ? `
                            <button class="btn btn-primary w-100 mb-3" id="bottoneRicettario">${
                              inRicettario ? "Rimuovi dal ricettario" : "Aggiungi al ricettario"
                            }</button>
                            <label for="notaRicettario" class="form-label">Nota privata</label>
                            <textarea class="form-control" id="notaRicettario" rows="3" ${
                              inRicettario ? "" : "disabled"
                            }>${notaAttuale}</textarea>
                        `
                        : '<p class="text-muted">Accedi per salvare la ricetta e annotare le tue prove.</p>'
                    }
                </div>
            </div>
            <div class="card card-bagliore">
                <div class="card-body">
                    <h2 class="h5 mb-3">Recensioni</h2>
                    <div id="contenitoreRecensioni"></div>
                    ${
                      utente
                        ? creaFormRecensione(ricetta.id)
                        : '<p class="text-muted">Effettua il login per lasciare una recensione.</p>'
                    }
                </div>
            </div>
        </div>
    `;

  if (utente) {
    document.getElementById("bottoneRicettario").addEventListener("click", () => {
      aggiornaRicettario(ricetta.id, !inRicettario);
      inizializzaVistaDettaglioRicetta(ricetta.id);
    });
    const campoNota = document.getElementById("notaRicettario");
    campoNota?.addEventListener("change", () => {
      aggiornaNotaRicettario(ricetta.id, campoNota.value);
    });
    const formRecensione = document.getElementById("formRecensione");
    formRecensione?.addEventListener("submit", event => {
      event.preventDefault();
      gestisciInvioRecensione(ricetta.id, formRecensione);
    });
    compilaFormRecensione(ricetta.id, formRecensione);
  }

  mostraElencoRecensioni(ricetta.id, ricetta);
}

export function compilaFormRecensione(idRicetta, form) {
  if (!form) return;
  const utente = ottieniUtenteCorrente();
  const esistente = ottieniRecensioni().find(
    recensione => recensione.idRicetta === idRicetta && recensione.idUtente === utente?.id
  );
  if (!esistente) return;
  form.querySelector("#dataRecensione").value = esistente.dataPreparazione;
  form.querySelector("#difficoltaRecensione").value = esistente.difficolta;
  form.querySelector("#gustoRecensione").value = esistente.gusto;
  form.querySelector("#commentoRecensione").value = esistente.commento ?? "";
}

export function mostraElencoRecensioni(idRicetta, ricettaCorrente) {
  const contenitore = document.getElementById("contenitoreRecensioni");
  const recensioni = ottieniRecensioni().filter(recensione => recensione.idRicetta === idRicetta);
  if (recensioni.length === 0) {
    contenitore.innerHTML = '<p class="text-muted">Ancora nessuna recensione per questa ricetta.</p>';
    return;
  }
  const utenti = ottieniUtenti();
  const schede = recensioni
    .map(recensione => {
      const ricettaFittizia = ricettaCorrente ?? { id: idRicetta, nome: "Ricetta" };
      const autore = utenti.find(u => u.id === recensione.idUtente)?.nomeUtente ?? "Utente";
      return creaCardRecensione(recensione, ricettaFittizia, autore);
    })
    .join("");
  contenitore.innerHTML = schede;
}

export function gestisciInvioRecensione(idRicetta, form) {
  const utente = ottieniUtenteCorrente();
  if (!utente) {
    window.location.hash = "#/accesso";
    return;
  }
  const dataPreparazione = form.querySelector("#dataRecensione").value;
  const difficolta = Number(form.querySelector("#difficoltaRecensione").value);
  const gusto = Number(form.querySelector("#gustoRecensione").value);
  const commento = form.querySelector("#commentoRecensione").value.trim();
  if (!dataPreparazione || difficolta < 1 || gusto < 1) {
    return;
  }
  const recensioni = ottieniRecensioni();
  const indiceEsistente = recensioni.findIndex(
    recensione => recensione.idRicetta === idRicetta && recensione.idUtente === utente.id
  );
  const datiRecensione = {
    id: indiceEsistente !== -1 ? recensioni[indiceEsistente].id : generaId("recensione"),
    idRicetta,
    idUtente: utente.id,
    dataPreparazione,
    difficolta,
    gusto,
    commento
  };
  if (indiceEsistente !== -1) {
    recensioni[indiceEsistente] = datiRecensione;
  } else {
    recensioni.push(datiRecensione);
  }
  salvaRecensioni(recensioni);
  mostraElencoRecensioni(idRicetta);
}
