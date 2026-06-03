// ============================================================================
//  VISTA ESPLORA — ricerca ricette + sfoglia catalogo completo (frammento esplora.html)
// ============================================================================
// Realizza il macro-scenario "ricerca di ricette culinarie". Due modalità:
//   - RICERCA mirata (per nome / ingrediente / lettera iniziale) → mostra i risultati filtrati;
//   - SFOGLIA TUTTO → mostra l'intero catalogo raggruppato per lettera con un indice alfabetico
//     laterale (ancore + scroll fluido) e un IntersectionObserver che evidenzia la lettera corrente.
// Entrambe le modalità leggono dalla cache locale del catalogo (già scaricato allo startup).
import {
  cercaRicettePerLettera,
  cercaRicettePerNome,
  cercaRicettePerIngrediente,
  precaricaCatalogoCompleto
} from "../gestione-api/api.js";
import { creaCardRicetta } from "../componenti/carte.js";
import { statoApp } from "../stato.js";
import { ottieniStatoAzioniUtente } from "../componenti/azioni-card.js";

const DURATA_INTERMEZZO_MS = 2000; // Piccolo delay per permettere allo spinner di essere percepito
const LETTERE_ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
let observerLettere = null; // IntersectionObserver per evidenziare la lettera attiva durante lo scroll

export function inizializzaVistaEsplora() {
  if (statoApp.risultatiRicerca.length > 0) {
    mostraRisultatiRicerca(statoApp.risultatiRicerca, {
      modalita: statoApp.modalitaEsplora
    });
  }
  const pulsanteCatalogo = document.getElementById("btnEsploraCatalogo");
  if (pulsanteCatalogo) {
    pulsanteCatalogo.addEventListener("click", gestisciCaricamentoCatalogo);
  }

  const selectTipo = document.getElementById("tipoRicerca");
  const campoTermine = document.getElementById("termineRicerca");
  const pulsanteRicerca = document.getElementById("btnEseguiRicerca");
  aggiornaPlaceholderRicerca();
  selectTipo?.addEventListener("change", () => aggiornaPlaceholderRicerca());
  pulsanteRicerca?.addEventListener("click", () => gestisciRicerca());
}

async function gestisciRicerca(tipoSelezionato) {
  const badgeConteggio = document.getElementById("conteggioRicerca");
  const contenitore = document.getElementById("risultatiRicerca");
  const selectTipo = document.getElementById("tipoRicerca");
  const campoTermine = document.getElementById("termineRicerca");
  if (!badgeConteggio || !contenitore) return;

  const tipo = tipoSelezionato || selectTipo?.value || "nome";
  const valoreInput = campoTermine?.value ?? "";
  let termine = valoreInput.trim();
  if (tipo === "lettera") {
    termine = (termine.charAt(0) || "").toLowerCase();
    if (campoTermine) {
      campoTermine.value = termine;
    }
  }

  mostraSezioneRisultati();
  badgeConteggio.textContent = "Ricerca in corso...";
  contenitore.innerHTML = '<p class="text-muted mb-0">Prepariamo i risultati...</p>';
  mostraSpinnerCatalogo();
  await attendiIntermezzo();

  // Dispatch in base alla modalità scelta nella select: ogni ramo filtra la cache locale del catalogo.
  let risultati = [];
  try {
    if (tipo === "nome") {
      risultati = await cercaRicettePerNome(termine);
    } else if (tipo === "ingrediente") {
      risultati = await cercaRicettePerIngrediente(termine);
    } else if (tipo === "lettera") {
      risultati = await cercaRicettePerLettera(termine);
    }
  } catch (errore) {
    console.error("Errore durante la ricerca", errore);
    badgeConteggio.textContent = "Errore di ricerca";
    contenitore.innerHTML =
      '<p class="text-danger">Impossibile completare la ricerca. Riprova.</p>';
  } finally {
    nascondiSpinnerCatalogo();
  }

  statoApp.risultatiRicerca = risultati;
  statoApp.modalitaEsplora = "search";
  mostraRisultatiRicerca(risultati, { modalita: "search" });
}

async function gestisciCaricamentoCatalogo() {
  const pulsante = document.getElementById("btnEsploraCatalogo");
  const contenitore = document.getElementById("risultatiRicerca");
  const badgeConteggio = document.getElementById("conteggioRicerca");
  if (!pulsante || !contenitore || !badgeConteggio) return;

  const testoOriginale = pulsante.textContent;
  pulsante.disabled = true;
  pulsante.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Caricamento...';
  mostraSezioneRisultati();
  badgeConteggio.textContent = "Caricamento catalogo...";
  contenitore.innerHTML = '<p class="text-muted mb-0">Recupero del catalogo in corso...</p>';
  mostraSpinnerCatalogo();

  try {
    await attendiIntermezzo();
    const ricette = await precaricaCatalogoCompleto();
    statoApp.catalogoCompleto = ricette;
    statoApp.risultatiRicerca = ricette;
    statoApp.modalitaEsplora = "catalogo";
    mostraRisultatiRicerca(ricette, { modalita: "catalogo" });
  } catch (errore) {
    console.error("Errore durante il caricamento del catalogo", errore);
    badgeConteggio.textContent = "Errore caricamento";
    contenitore.innerHTML =
      '<p class="text-danger mb-0">Impossibile caricare il catalogo completo. Riprova.</p>';
  } finally {
    pulsante.disabled = false;
    pulsante.textContent = testoOriginale;
    nascondiSpinnerCatalogo();
  }
}

function aggiornaPlaceholderRicerca() {
  const selectTipo = document.getElementById("tipoRicerca");
  const campoTermine = document.getElementById("termineRicerca");
  if (!selectTipo || !campoTermine) return;
  let placeholder = "Es. Arrabiata";
  campoTermine.removeAttribute("maxlength");
  if (selectTipo.value === "ingrediente") {
    placeholder = "Es. Chicken";
  } else if (selectTipo.value === "lettera") {
    placeholder = "Es. a";
    campoTermine.setAttribute("maxlength", "1");
    campoTermine.value = (campoTermine.value.trim().charAt(0) || "").toLowerCase();
  }
  campoTermine.placeholder = placeholder;
}

function mostraRisultatiRicerca(risultati = [], opzioni = {}) {
  mostraSezioneRisultati();
  const contenitore = document.getElementById("risultatiRicerca");
  const badgeConteggio = document.getElementById("conteggioRicerca");
  if (!contenitore || !badgeConteggio) return;
  const modalita = opzioni.modalita || "search";
  const catalogoCompleto = modalita === "catalogo";
  aggiornaLayoutCatalogo(catalogoCompleto);
  badgeConteggio.textContent = `${risultati.length} ricette`;
  if (risultati.length === 0) {
    contenitore.innerHTML =
      '<p class="text-muted mb-0">Nessun risultato. Prova con un altro termine.</p>';
    return;
  }
  const statoAzioni = ottieniStatoAzioniUtente();
  if (catalogoCompleto) {
    const gruppi = buildAlphabetGroups(risultati);
    renderAlphabetIndexBar(gruppi);
    renderCatalogWithSeparators(gruppi, statoAzioni);
    attachAlphabetNavHandlers(gruppi);
  } else {
    resetAlphabetNav(true);
    contenitore.innerHTML = risultati
      .map(ricetta =>
        creaCardRicetta(ricetta, {
          inRicettario: statoAzioni.idsRicettario.has(ricetta.id),
          haRecensione: statoAzioni.idsRecensioni.has(ricetta.id)
        })
      )
      .join("");
  }
}

function buildAlphabetGroups(ricette = []) {
  const groups = new Map();
  LETTERE_ALFABETO.forEach(lettera => groups.set(lettera, []));
  groups.set("#", []);

  ricette.forEach(ricetta => {
    const lettera = normalizzaLettera(ricetta?.nome);
    const gruppo = groups.get(lettera) || groups.get("#");
    gruppo.push(ricetta);
  });

  const order = [...LETTERE_ALFABETO];
  if (groups.get("#")?.length) {
    order.push("#");
  }

  const counts = {};
  order.forEach(lettera => {
    counts[lettera] = groups.get(lettera)?.length ?? 0;
  });

  return { groups, order, counts };
}

function renderCatalogWithSeparators(gruppi, statoAzioni) {
  const contenitore = document.getElementById("risultatiRicerca");
  if (!contenitore) return;
  let html = "";
  gruppi.order.forEach(lettera => {
    const elenco = gruppi.groups.get(lettera) || [];
    if (elenco.length === 0) return;
    const anchorId = lettera === "#" ? "letter-ALTRO" : `letter-${lettera}`;
    const titolo = lettera === "#" ? "Altro" : lettera;
    html += `
      <div class="col-12">
        <div class="alpha-separator" id="${anchorId}">
          <h3 class="alpha-title">${titolo}</h3>
          <span class="badge bg-accento ms-2">${elenco.length}</span>
        </div>
      </div>
    `;
    html += elenco
      .map(ricetta =>
        creaCardRicetta(ricetta, {
          inRicettario: statoAzioni.idsRicettario.has(ricetta.id),
          haRecensione: statoAzioni.idsRecensioni.has(ricetta.id)
        })
      )
      .join("");
  });
  contenitore.innerHTML =
    html || '<p class="text-muted mb-0">Nessuna ricetta disponibile nel catalogo.</p>';
}

function renderAlphabetIndexBar(gruppi) {
  const bar = document.getElementById("indiceAlfabeticoBar");
  if (!bar) return;

  const buttons = LETTERE_ALFABETO.map(lettera => {
    const count = gruppi.counts?.[lettera] ?? 0;
    const disabled = count === 0 ? "disabled" : "";
    return `
      <button
        class="btn btn-contorno-accento btn-sm alpha-btn"
        type="button"
        data-alpha-letter="${lettera}"
        ${disabled}
        aria-label="Vai alla lettera ${lettera}"
      >
        ${lettera}
      </button>
    `;
  }).join("");

  const extra =
    gruppi.counts?.["#"] > 0
      ? `
        <button
          class="btn btn-contorno-accento btn-sm alpha-btn"
          type="button"
          data-alpha-letter="#"
          aria-label="Vai alla sezione Altro"
        >
          #
        </button>
      `
      : "";

  bar.classList.remove("d-none");
  impostaOffsetIndice(bar);
  bar.innerHTML = `
    <div class="alpha-index d-flex flex-wrap gap-2 align-items-center">
      ${buttons}${extra}
    </div>
  `;
}

function attachAlphabetNavHandlers(gruppi) {
  resetAlphabetNav(false);
  const buttons = document.querySelectorAll("[data-alpha-letter]");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const lettera = btn.dataset.alphaLetter;
      const anchorId = lettera === "#" ? "letter-ALTRO" : `letter-${lettera}`;
      const target = document.getElementById(anchorId);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setLetteraAttiva(lettera);
    });
  });

  if (typeof IntersectionObserver !== "undefined") {
    const separatori = document.querySelectorAll(".alpha-separator");
    observerLettere = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id === "letter-ALTRO") {
              setLetteraAttiva("#");
            } else if (id?.startsWith("letter-")) {
              setLetteraAttiva(id.replace("letter-", ""));
            }
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    separatori.forEach(el => observerLettere.observe(el));
  }
}

function setLetteraAttiva(lettera) {
  document.querySelectorAll("[data-alpha-letter]").forEach(btn => {
    const attiva = btn.dataset.alphaLetter === lettera;
    btn.classList.toggle("alpha-btn-active", attiva);
  });
}

function resetAlphabetNav(pulisci) {
  if (observerLettere) {
    observerLettere.disconnect();
    observerLettere = null;
  }
  if (pulisci) {
    const bar = document.getElementById("indiceAlfabeticoBar");
    if (bar) {
      bar.innerHTML = "";
      bar.classList.add("d-none");
    }
  }
}

function aggiornaLayoutCatalogo(attivo) {
  const bar = document.getElementById("indiceAlfabeticoBar");
  if (!bar) return;
  if (attivo) {
    bar.classList.remove("d-none");
    impostaOffsetIndice(bar);
  } else {
    bar.classList.add("d-none");
  }
}

function impostaOffsetIndice(bar) {
  const header = document.querySelector(".cc-intestazione");
  let offset = 12;
  if (header) {
    const posizione = window.getComputedStyle(header).position;
    if (posizione === "fixed" || posizione === "sticky") {
      offset = header.getBoundingClientRect().height + 12;
    }
  }
  bar.style.setProperty("--alpha-top-offset", `${offset}px`);
}

function normalizzaLettera(nome) {
  const prima = String(nome ?? "").trim().charAt(0).toUpperCase();
  if (LETTERE_ALFABETO.includes(prima)) return prima;
  return "#";
}

function mostraSezioneRisultati() {
  const sezione = document.getElementById("sezioneRisultati");
  if (!sezione) return;
  sezione.classList.remove("d-none");
  sezione.setAttribute("aria-hidden", "false");
}

function mostraSpinnerCatalogo() {
  const spinner = document.getElementById("catalogoSpinner");
  if (!spinner) return;
  spinner.classList.remove("d-none");
  spinner.setAttribute("aria-hidden", "false");
}

function nascondiSpinnerCatalogo() {
  const spinner = document.getElementById("catalogoSpinner");
  if (!spinner) return;
  spinner.classList.add("d-none");
  spinner.setAttribute("aria-hidden", "true");
}

function attendiIntermezzo(ms = DURATA_INTERMEZZO_MS) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
