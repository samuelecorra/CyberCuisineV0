import { PERCORSI } from "./rotte.js";
import { statoApp } from "./stato.js";
import { ottieniUtenteCorrente } from "./storage.js";
import { aggiornaNavigazioneAttiva, aggiornaStatoAuthNav } from "./navbar.js";

export async function gestisciCambioRoute() {
  nascondiBarraLettere();
  const percorsoPrecedente = statoApp.percorsoAttivo;
  let hash = window.location.hash || "#/home";
  if (!hash.startsWith("#/")) {
    hash = "#/home";
  }

  let chiavePercorso = hash;
  let parametroDinamico = null;

  if (hash.startsWith("#/ricetta/")) {
    chiavePercorso = "#/ricetta";
    parametroDinamico = hash.split("/")[2];
  }

  const configurazionePercorso = PERCORSI[chiavePercorso];
  if (!configurazionePercorso) {
    mostraNonTrovato();
    return;
  }

  const utente = ottieniUtenteCorrente();

  if (configurazionePercorso.protetta && !utente) {
    window.location.hash = "#/accesso";
    return;
  }

  deallocaCatalogoEsplora(percorsoPrecedente, hash);
  statoApp.percorsoAttivo = hash;
  try {
    const frammentoDaUsare =
      utente && configurazionePercorso.frammentoProtetto
        ? configurazionePercorso.frammentoProtetto
        : configurazionePercorso.frammento;
    const onLoadDaUsare =
      utente && configurazionePercorso.alCaricamentoProtetto
        ? configurazionePercorso.alCaricamentoProtetto
        : configurazionePercorso.alCaricamento;

    const frammentoCaricato = await caricaFrammento(frammentoDaUsare);
    const contenitoreApp = document.getElementById("app");
    contenitoreApp.innerHTML = frammentoCaricato;

    if (typeof onLoadDaUsare === "function") {
      await onLoadDaUsare(parametroDinamico);
    }

    aggiornaNavigazioneAttiva(hash);
    aggiornaStatoAuthNav();
  } catch (errore) {
    console.error("Errore durante il rendering della route", errore);
    mostraErroreRoute();
  }
}

async function caricaFrammento(percorsoFrammento) {
  if (statoApp.cacheFrammenti[percorsoFrammento]) {
    return statoApp.cacheFrammenti[percorsoFrammento];
  }
  const risposta = await fetch(percorsoFrammento);
  if (!risposta.ok) {
    throw new Error("Impossibile caricare la vista");
  }
  const html = await risposta.text();
  statoApp.cacheFrammenti[percorsoFrammento] = html;
  return html;
}

function mostraNonTrovato() {
  const contenitoreApp = document.getElementById("app");
  contenitoreApp.innerHTML = `
        <section class="text-center py-5">
            <h1 class="display-6">Pagina non trovata</h1>
            <p class="text-muted">Il percorso richiesto non esiste. Torna alla <a href="#/home">home</a>.</p>
        </section>
    `;
}

function mostraErroreRoute() {
  const contenitoreApp = document.getElementById("app");
  contenitoreApp.innerHTML = `
        <section class="text-center py-5">
            <h1 class="display-6">Errore imprevisto</h1>
            <p class="text-muted">Si è verificato un problema nel caricamento della vista. Riprova tra qualche istante.</p>
        </section>
    `;
}

function nascondiBarraLettere() {
  const dock = document.getElementById("lettersDock");
  if (!dock) return;
  dock.classList.add("d-none");
  dock.setAttribute("aria-hidden", "true");
}

function deallocaCatalogoEsplora(percorsoPrecedente, nuovoPercorso) {
  if (percorsoPrecedente === "#/esplora" && nuovoPercorso !== "#/esplora") {
    statoApp.catalogoCompleto = [];
  }
}
