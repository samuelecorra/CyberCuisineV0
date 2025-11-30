import { ottieniUtenteCorrente, ottieniRecensioni, aggiornaRicettario } from "../storage.js";

let listenerRegistrato = false;
let modalElementi = null;
let azioneProgrammata = null;

export function impostaAzioniCarteRicetta() {
  if (listenerRegistrato) return;
  preparaModalConferma();
  document.addEventListener("click", gestisciClickAzioneRicetta);
  document.addEventListener("click", gestisciAperturaDettagliDaMedia);
  document.addEventListener("keydown", gestisciAperturaDettagliDaMedia);
  listenerRegistrato = true;
}

export function ottieniStatoAzioniUtente() {
  const utente = ottieniUtenteCorrente();
  const idsRicettario = new Set(utente?.ricettario?.map(entry => entry.idRicetta) ?? []);
  const idsRecensioni = new Set(
    ottieniRecensioni()
      .filter(recensione => recensione.idUtente === utente?.id)
      .map(recensione => recensione.idRicetta)
  );
  return { utente, idsRicettario, idsRecensioni };
}

function gestisciAperturaDettagliDaMedia(evento) {
  const trigger = evento.target.closest('[data-apri-dettaglio="true"]');
  if (!trigger) return;
  if (evento.type === "keydown" && evento.key !== "Enter" && evento.key !== " ") {
    return;
  }
  evento.preventDefault();
  const ricettaId = trigger.dataset.ricettaId;
  if (!ricettaId) return;
  window.location.hash = `#/ricetta/${ricettaId}`;
}

function gestisciClickAzioneRicetta(evento) {
  const pulsante = evento.target.closest("[data-azione-ricetta]");
  if (!pulsante) return;
  evento.preventDefault();
  const ricettaId = pulsante.dataset.ricettaId;
  if (!ricettaId) return;
  const ricettaNome = pulsante.dataset.ricettaNome || "questa ricetta";
  const azione = pulsante.dataset.azioneRicetta;
  const { utente } = ottieniStatoAzioniUtente();

  if (!utente) {
    mostraModalConferma(
      "Accesso richiesto",
      "Per utilizzare il ricettario e le recensioni devi accedere. Vuoi aprire la pagina di accesso?",
      () => {
        window.location.hash = "#/accesso";
      }
    );
    return;
  }

  if (azione === "cookbook") {
    const modalita = pulsante.dataset.cookbookMode === "remove" ? "remove" : "add";
    const titolo = modalita === "add" ? "Aggiungi al ricettario" : "Rimuovi dal ricettario";
    const messaggio =
      modalita === "add"
        ? `Vuoi aggiungere "${ricettaNome}" al tuo ricettario personale?`
        : `Vuoi rimuovere "${ricettaNome}" dal tuo ricettario?`;
    mostraModalConferma(titolo, messaggio, async () => {
      await aggiornaRicettario(ricettaId, modalita === "add");
      sincronizzaBottoniRicettario(ricettaId);
    });
    return;
  }

  if (azione === "review") {
    const modalita = pulsante.dataset.reviewMode === "view" ? "view" : "write";
    const titolo = modalita === "view" ? "Guarda la tua recensione" : "Scrivi recensione";
    const messaggio =
      modalita === "view"
        ? `Vuoi aprire la scheda di "${ricettaNome}" per rileggere la tua recensione?`
        : `Vuoi aprire la scheda di "${ricettaNome}" per scrivere una recensione?`;
    mostraModalConferma(titolo, messaggio, () => {
      window.location.hash = `#/ricetta/${ricettaId}`;
    });
  }
}

function preparaModalConferma() {
  modalElementi = {
    backdrop: document.getElementById("modalAzioniRicetta"),
    titolo: document.getElementById("modalAzioniTitolo"),
    messaggio: document.getElementById("modalAzioniMessaggio"),
    annulla: document.getElementById("modalAzioniAnnulla"),
    conferma: document.getElementById("modalAzioniConferma"),
    chiudi: document.getElementById("modalAzioniChiudi")
  };

  if (!modalElementi.backdrop) {
    console.warn(
      "Modal di conferma per le carte non trovata: verranno eseguite le azioni senza conferma."
    );
    return;
  }

  modalElementi.annulla?.addEventListener("click", chiudiModalAzioni);
  modalElementi.chiudi?.addEventListener("click", chiudiModalAzioni);
  modalElementi.backdrop.addEventListener("click", evento => {
    if (evento.target === modalElementi.backdrop) {
      chiudiModalAzioni();
    }
  });
  modalElementi.conferma?.addEventListener("click", async () => {
    if (!azioneProgrammata) {
      chiudiModalAzioni();
      return;
    }
    modalElementi.conferma.disabled = true;
    try {
      await azioneProgrammata();
    } catch (errore) {
      console.error("Errore durante l'esecuzione dell'azione sulla ricetta", errore);
    } finally {
      modalElementi.conferma.disabled = false;
      chiudiModalAzioni();
    }
  });
}

function mostraModalConferma(titolo, messaggio, onConfirm) {
  if (!modalElementi?.backdrop) {
    onConfirm?.();
    return;
  }
  azioneProgrammata = onConfirm;
  if (modalElementi.titolo) modalElementi.titolo.textContent = titolo;
  if (modalElementi.messaggio) modalElementi.messaggio.textContent = messaggio;
  modalElementi.backdrop.classList.remove("d-none");
  modalElementi.backdrop.setAttribute("aria-hidden", "false");
  modalElementi.conferma?.focus();
}

function chiudiModalAzioni() {
  if (!modalElementi?.backdrop) return;
  modalElementi.backdrop.classList.add("d-none");
  modalElementi.backdrop.setAttribute("aria-hidden", "true");
  azioneProgrammata = null;
}

function sincronizzaBottoniRicettario(idRicetta) {
  const { idsRicettario } = ottieniStatoAzioniUtente();
  const presente = idsRicettario.has(idRicetta);
  const selettoreId = escapeForSelector(idRicetta);
  const bottoni = document.querySelectorAll(
    `[data-azione-ricetta="cookbook"][data-ricetta-id="${selettoreId}"]`
  );
  bottoni.forEach(btn => {
    btn.dataset.cookbookMode = presente ? "remove" : "add";
    btn.textContent = presente ? "Rimuovi dal ricettario" : "Aggiungi al ricettario";
    btn.classList.toggle("btn-danger", presente);
    btn.classList.toggle("btn-primary", !presente);
  });
}

function escapeForSelector(valore) {
  if (window.CSS?.escape) {
    return window.CSS.escape(valore);
  }
  return String(valore).replace(/"/g, '\\"');
}
