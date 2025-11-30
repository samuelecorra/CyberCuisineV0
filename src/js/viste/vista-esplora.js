import { cercaRicettePerLettera, cercaRicettePerNome, cercaRicettePerIngrediente } from "../gestione-api/api.js";
import { creaCardRicetta } from "../componenti/carte.js";
import { statoApp } from "../stato.js";
import { memorizzaRicette } from "../storage.js";
import { ottieniStatoAzioniUtente } from "../componenti/azioni-card.js";

const LETTERE = "abcdefghijklmnopqrstuvwxyz".split("");

export function inizializzaVistaEsplora() {
  if (statoApp.risultatiRicerca.length > 0) {
    mostraRisultatiRicerca(statoApp.risultatiRicerca);
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

  let risultati = [];
  try {
    if (tipo === "nome") {
      risultati = await cercaRicettePerNome(termine);
    } else if (tipo === "ingrediente") {
      risultati = await cercaRicettePerIngrediente(termine);
    } else if (tipo === "lettera") {
      risultati = await cercaRicettePerLettera(termine);
    }
    memorizzaRicette(risultati);
  } catch (errore) {
    console.error("Errore durante la ricerca", errore);
    badgeConteggio.textContent = "Errore di ricerca";
    contenitore.innerHTML =
      '<p class="text-danger">Impossibile completare la ricerca. Riprova.</p>';
  } finally {
    nascondiSpinnerCatalogo();
  }

  statoApp.risultatiRicerca = risultati;
  mostraRisultatiRicerca(risultati);
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
    const ricette = await recuperaCatalogoCompleto();
    statoApp.catalogoCompleto = ricette;
    statoApp.risultatiRicerca = ricette;
    memorizzaRicette(ricette);
    mostraRisultatiRicerca(ricette);
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

async function recuperaCatalogoCompleto() {
  if (statoApp.catalogoCompleto.length > 0) return statoApp.catalogoCompleto;
  const richieste = LETTERE.map(lettera => cercaRicettePerLettera(lettera));
  const risultati = await Promise.all(richieste);
  const appiattito = risultati.flat().filter(Boolean);

  // Evito duplicati per id
  const ricetteUniche = [];
  const idsVisti = new Set();
  appiattito.forEach(ricetta => {
    if (ricetta && !idsVisti.has(ricetta.id)) {
      idsVisti.add(ricetta.id);
      ricetteUniche.push(ricetta);
    }
  });
  return ricetteUniche;
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

function mostraRisultatiRicerca(risultati = []) {
  mostraSezioneRisultati();
  const contenitore = document.getElementById("risultatiRicerca");
  const badgeConteggio = document.getElementById("conteggioRicerca");
  if (!contenitore || !badgeConteggio) return;
  badgeConteggio.textContent = `${risultati.length} ricette`;
  if (risultati.length === 0) {
    contenitore.innerHTML =
      '<p class="text-muted mb-0">Nessun risultato. Prova con un altro termine.</p>';
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
