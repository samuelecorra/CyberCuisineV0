import { cercaRicettePerLettera } from "../api.js";
import { creaCardRicetta } from "../componenti/carte.js";
import { statoApp } from "../stato.js";
import { memorizzaRicette } from "../storage.js";
import { ottieniStatoAzioniUtente } from "../azioni-card.js";

const LETTERE = "abcdefghijklmnopqrstuvwxyz".split("");

export function inizializzaVistaEsplora() {
  aggiornaBarraLettere(false);
  aggiornaHeroCatalogo(statoApp.catalogoCompleto.length > 0);
  const pulsanteCatalogo = document.getElementById("btnEsploraCatalogo");
  if (pulsanteCatalogo) {
    pulsanteCatalogo.addEventListener("click", gestisciCaricamentoCatalogo);
  }

  // Se abbiamo già il catalogo in memoria, lo mostriamo subito
  if (statoApp.catalogoCompleto.length > 0) {
    const gruppi = raggruppaPerLettera(statoApp.catalogoCompleto);
    renderizzaCatalogo(gruppi);
  }
}

async function gestisciCaricamentoCatalogo() {
  const pulsante = document.getElementById("btnEsploraCatalogo");
  const contenitore = document.getElementById("contenutoCatalogo");
  if (!pulsante || !contenitore) return;

  const testoOriginale = pulsante.textContent;
  pulsante.disabled = true;
  pulsante.innerHTML =
    '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Caricamento...';
  contenitore.innerHTML = '<p class="text-muted mb-0">Recupero del catalogo in corso...</p>';
  mostraSpinnerCatalogo();

  try {
    const ricette = await recuperaCatalogoCompleto();
    statoApp.catalogoCompleto = ricette;
    memorizzaRicette(ricette);
    const gruppi = raggruppaPerLettera(ricette);
    renderizzaCatalogo(gruppi);
    aggiornaHeroCatalogo(true);
  } catch (errore) {
    console.error("Errore durante il caricamento del catalogo", errore);
    contenitore.innerHTML =
      '<p class="text-danger mb-0">Impossibile caricare il catalogo completo. Riprova.</p>';
    aggiornaHeroCatalogo(false);
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

function raggruppaPerLettera(ricette) {
  const mappa = {};
  ricette.forEach(ricetta => {
    const iniziale = (ricetta.nome?.[0] ?? "#").toUpperCase();
    const lettera = /^[A-Z]/i.test(iniziale) ? iniziale : "#";
    if (!mappa[lettera]) mappa[lettera] = [];
    mappa[lettera].push(ricetta);
  });

  return Object.entries(mappa)
    .sort((a, b) => a[0].localeCompare(b[0], "it"))
    .map(([lettera, elenco]) => ({
      lettera,
      ricette: elenco.sort((a, b) => a.nome.localeCompare(b.nome, "it"))
    }));
}

function renderizzaCatalogo(gruppi) {
  const contenitore = document.getElementById("contenutoCatalogo");
  const ancore = document.getElementById("ancoreLettere");
  const badgeLettere = document.getElementById("conteggioLettere");
  if (!contenitore || !ancore) return;
  const { idsRicettario, idsRecensioni } = ottieniStatoAzioniUtente();

  if (gruppi.length === 0) {
    contenitore.innerHTML = '<p class="text-muted mb-0">Nessuna ricetta trovata nel catalogo.</p>';
    ancore.innerHTML = "";
    if (badgeLettere) badgeLettere.textContent = "0";
    aggiornaBarraLettere(false);
    return;
  }

  contenitore.innerHTML = gruppi
    .map(gruppo => {
      const sezioneId = `sezione-${gruppo.lettera.toLowerCase()}`;
      return `
            <div id="${sezioneId}">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <h3 class="h5 mb-0">${gruppo.lettera}</h3>
                    <span class="badge bg-accento">${gruppo.ricette.length}</span>
                </div>
                <div class="row g-4">
                    ${gruppo.ricette
                      .map(ricetta =>
                        creaCardRicetta(ricetta, {
                          inRicettario: idsRicettario.has(ricetta.id),
                          haRecensione: idsRecensioni.has(ricetta.id)
                        })
                      )
                      .join("")}
                </div>
            </div>
        `;
    })
    .join('<hr class="text-secondary opacity-50" />');

  ancore.innerHTML = gruppi
    .map(
      gruppo =>
        `<button class="btn btn-sm btn-contorno-accento w-100" data-ancora="${gruppo.lettera}">${gruppo.lettera}</button>`
    )
    .join("");

  ancore.querySelectorAll("button[data-ancora]").forEach(bottone => {
    bottone.addEventListener("click", () => {
      const lettera = bottone.dataset.ancora;
      const destinazione = document.getElementById(`sezione-${lettera.toLowerCase()}`);
      if (destinazione) {
        destinazione.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  if (badgeLettere) {
    badgeLettere.textContent = gruppi.length.toString();
  }

  aggiornaBarraLettere(true);
}

function aggiornaBarraLettere(visibile) {
  const dock = document.getElementById("lettersDock");
  if (!dock) return;
  dock.classList.toggle("d-none", !visibile);
  dock.setAttribute("aria-hidden", visibile ? "false" : "true");
}

function aggiornaHeroCatalogo(nascondi) {
  const hero = document.getElementById("heroCatalogoEsplora");
  if (!hero) return;
  hero.classList.toggle("d-none", nascondi);
  hero.setAttribute("aria-hidden", nascondi ? "true" : "false");
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
