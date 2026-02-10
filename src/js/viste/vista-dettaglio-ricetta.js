import {
  ottieniUtenteCorrente,
  ottieniRecensioniRicetta,
  ottieniUtenti,
  aggiornaRicettario,
  rimuoviRecensione
} from "../storage.js";
import { recuperaRicettaPerId } from "../gestione-api/api.js";
import { creaCardRecensione } from "../componenti/carte.js";
import {
  renderModaleRecensione,
  inizializzaModaleRecensione,
  apriModaleRecensione
} from "../componenti/modale-recensione.js";

export async function inizializzaVistaDettaglioRicetta(idRicetta) {
  const wrapper = document.getElementById("dettaglioRicetta");
  if (!idRicetta || !wrapper) {
    wrapper.innerHTML = '<p class="text-danger">Ricetta non trovata.</p>';
    return;
  }
  wrapper.innerHTML = '<p class="text-muted">Caricamento dettagli ricetta...</p>';
  const ricetta = await recuperaRicettaPerId(idRicetta);
  if (!ricetta) {
    wrapper.innerHTML = '<p class="text-danger">Impossibile recuperare la ricetta.</p>';
    return;
  }
  const youtubeId = estraiIdYoutube(ricetta.youtube);
  const youtubeThumb = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;
  const youtubeEmbed = youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : null;
  const utente = ottieniUtenteCorrente();
  const inRicettario = utente?.ricettario?.some(entry => entry.idRicetta === ricetta.id);
  const recensioneUtente = ottieniRecensioniRicetta(ricetta.id).find(
    recensione => recensione.idUtente === utente?.id
  );
  const badgeEtichette =
    ricetta.etichette?.length > 0
      ? ricetta.etichette
          .map(tag => `<span class="badge bg-accento text-uppercase">${tag}</span>`)
          .join(" ")
      : "";
  const ingredientiHtml = ricetta.ingredienti
    .map(item => `<li class="col mb-2">- ${item.quantita} ${item.nome}</li>`)
    .join("");
  const passiIstruzioni = ricetta.istruzioni
    ?.split(/\r?\n/)
    .map(step => step.trim())
    .filter(Boolean) ?? [];
  const istruzioniHtml =
    passiIstruzioni.length > 0
      ? `<ol class="ps-3 mb-0">${passiIstruzioni
          .map(step => `<li class="mb-2">${step}</li>`)
          .join("")}</ol>`
      : `<p class="testo-pre-linea mb-0">${ricetta.istruzioni}</p>`;

  wrapper.innerHTML = `
    <div class="col-12">
      <div class="card card-bagliore mb-4">
        <div class="card-body">
          <div class="row g-4 align-items-start">
            <div class="col-lg-5">
              <div class="ratio ratio-4x3 rounded overflow-hidden bg-dark-subtle">
                <img src="${ricetta.miniatura}" class="img-fluid h-100 w-100 adatta-copertura" alt="${ricetta.nome}" loading="lazy" />
              </div>
              <div class="d-flex gap-3 mt-3 justify-content-center">
                <button class="btn btn-primary flex-fill fw-semibold fs-6" id="bottoneRicettario">
                  ${inRicettario ? "Rimuovi dal ricettario" : "Aggiungi al ricettario"}
                </button>
                <button class="btn btn-contorno-accento flex-fill fw-semibold fs-6" id="bottoneRecensione">
                  ${recensioneUtente ? "Vedi la tua recensione" : "Scrivi recensione"}
                </button>
              </div>
              ${
                youtubeThumb
                  ? `<div class="card card-bagliore mt-3" id="anteprimaVideo" role="button" tabindex="0" aria-label="Guarda il video della ricetta">
                      <div class="position-relative overflow-hidden rounded">
                        <img src="${youtubeThumb}" alt="Anteprima video YouTube" class="img-fluid w-100" />
                        <span class="position-absolute top-50 start-50 translate-middle badge bg-accento text-dark px-3 py-2">
                          Play video
                        </span>
                      </div>
                    </div>`
                  : ""
              }
            </div>
            <div class="col-lg-7">
              <p class="text-uppercase testo-accento mb-2 fw-semibold" style="font-size: 1.05rem;">${ricetta.categoria} - ${ricetta.area}</p>
              <h1 class="h2 mb-3">${ricetta.nome}</h1>
              ${badgeEtichette ? `<div class="d-flex flex-wrap gap-2 mb-3">${badgeEtichette}</div>` : ""}
              <div class="d-flex align-items-center gap-2 small mb-4">
                <span class="text-muted">Fonte</span>
                <span class="mb-0">${
                  ricetta.fonte
                    ? `<a href="${ricetta.fonte}" target="_blank" rel="noopener">Visita la fonte</a>`
                    : "N/D"
                }</span>
              </div>
              <hr class="my-3" style="border-color: var(--cc-accent); opacity: 1;" />
              <div class="mb-4">
                <h2 class="h5 text-uppercase">Ingredienti</h2>
                <ul class="row row-cols-1 row-cols-md-2 list-unstyled small mb-0">
                  ${ingredientiHtml}
                </ul>
              </div>
              <hr class="my-3" style="border-color: var(--cc-accent); opacity: 1;" />
              <div>
                <h2 class="h5 text-uppercase">Istruzioni</h2>
                ${istruzioniHtml}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="col-12">
      <div class="card card-bagliore">
        <div class="card-body">
          <h2 class="h5 mb-3">Recensioni</h2>
          <div id="contenitoreRecensioni"></div>
        </div>
      </div>
    </div>
    ${renderModaleRecensione(ricetta)}
  `;

  const bottoneRicettario = document.getElementById("bottoneRicettario");
  bottoneRicettario?.addEventListener("click", () => {
    if (!utente) {
      window.location.hash = "#/accesso";
      return;
    }
    aggiornaRicettario(ricetta.id, !inRicettario);
    inizializzaVistaDettaglioRicetta(ricetta.id);
  });

  const bottoneRecensione = document.getElementById("bottoneRecensione");
  bottoneRecensione?.addEventListener("click", () => {
    if (!utente) {
      window.location.hash = "#/accesso";
      return;
    }
    apriModaleRecensione();
  });

  inizializzaModaleRecensione(ricetta, () => mostraElencoRecensioni(ricetta.id, ricetta, utente));

  mostraElencoRecensioni(ricetta.id, ricetta, utente);
  impostaRimozioneRecensioni(ricetta.id, ricetta, utente);
  if (youtubeEmbed) {
    inizializzaAnteprimaVideo(youtubeEmbed);
  }
}

export function mostraElencoRecensioni(idRicetta, ricettaCorrente, utente) {
  const contenitore = document.getElementById("contenitoreRecensioni");
  const recensioni = ottieniRecensioniRicetta(idRicetta);
  if (recensioni.length === 0) {
    contenitore.innerHTML =
      '<p class="text-muted">Ancora nessuna recensione per questa ricetta.</p>';
    return;
  }
  const utenti = ottieniUtenti();
  const schede = recensioni
    .map(recensione => {
      const ricettaFittizia = ricettaCorrente ?? { id: idRicetta, nome: "Ricetta" };
      const autore = utenti.find(u => u.id === recensione.idUtente)?.nomeUtente ?? "Utente";
      return creaCardRecensione(recensione, ricettaFittizia, autore, {
        mostraRimuovi: utente && recensione.idUtente === utente.id
      });
    })
    .join("");
  contenitore.innerHTML = `<div class="row g-3">${schede}</div>`;
}

function impostaRimozioneRecensioni(idRicetta, ricettaCorrente, utente) {
  const contenitore = document.getElementById("contenitoreRecensioni");
  if (!contenitore || !utente) return;
  contenitore.addEventListener("click", event => {
    const target = event.target.closest("[data-rimuovi-recensione]");
    if (!target) return;
    const idRecensione = target.dataset.rimuoviRecensione;
    const recipeId = target.dataset.ricettaId || idRicetta;
    if (!idRecensione || !recipeId) return;
    const conferma = window.confirm("Vuoi rimuovere questa recensione?");
    if (!conferma) return;
    const ok = rimuoviRecensione(recipeId, idRecensione, utente.id);
    if (ok) {
      inizializzaVistaDettaglioRicetta(recipeId);
    }
  });
}

function estraiIdYoutube(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function inizializzaAnteprimaVideo(embedUrl) {
  const anteprima = document.getElementById("anteprimaVideo");
  if (!anteprima) return;
  const attivaPlayer = () => {
    anteprima.innerHTML = `
      <div class="ratio ratio-16x9">
        <iframe src="${embedUrl}?autoplay=1" title="Video ricetta" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
      </div>
    `;
    anteprima.removeEventListener("click", attivaPlayer);
    anteprima.removeEventListener("keydown", onKeyDown);
  };
  const onKeyDown = evento => {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      attivaPlayer();
    }
  };
  anteprima.addEventListener("click", attivaPlayer);
  anteprima.addEventListener("keydown", onKeyDown);
}
