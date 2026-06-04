// ============================================================================
//  AZIONI SULLE CARD RICETTA — event delegation globale
// ============================================================================
// PATTERN "event delegation": invece di attaccare un listener a ogni pulsante (le card vengono
// rigenerate di continuo via innerHTML, quindi i listener andrebbero persi), registriamo UN solo
// listener sul document e capiamo cosa è stato cliccato leggendo gli attributi data-* del bersaglio.
// Vantaggi: funziona anche per gli elementi creati DOPO, e si registra una sola volta (vedi flag).
import { ottieniUtenteCorrente, ottieniRecensioni, aggiornaRicettario } from "../storage.js";
import { apriModaleRecensione } from "./modale-recensione.js";
import { statoApp } from "../stato.js";

let listenerRegistrato = false; // evita doppie registrazioni (impostaAzioni... è idempotente)
let modalElementi = null;
let azioneProgrammata = null; // callback da eseguire alla conferma della modale

// Chiamata una volta allo startup (main.js): prepara la modale di conferma e registra i listener globali.
export function impostaAzioniCarteRicetta() {
  if (listenerRegistrato) return;
  preparaModalConferma();
  document.addEventListener("click", gestisciClickAzioneRicetta); // pulsanti ricettario/recensione
  document.addEventListener("click", gestisciAperturaDettagliDaMedia); // click sull'immagine → dettaglio
  document.addEventListener("keydown", gestisciAperturaDettagliDaMedia); // idem da tastiera (Invio/Spazio)
  listenerRegistrato = true;
}

// Fotografa lo stato dell'utente utile alle card: quali ricette sono già nel ricettario e quali ha
// già recensito. Usiamo dei Set per avere controlli .has() in tempo costante quando renderizziamo
// decine di card, così ogni card sa subito se mostrare "Aggiungi" o "Rimuovi", "Scrivi" o "Guarda".
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
    const direct = pulsante.dataset.reviewDirect === "true";
    if (direct) {
      apriModaleRecensione(
        {
          id: ricettaId,
          nome: ricettaNome || "questa ricetta"
        },
        null
      );
      return;
    }
    const titolo = modalita === "view" ? "Guarda la tua recensione" : "Scrivi recensione";
    const messaggio =
      modalita === "view"
        ? `Vuoi andare alle tue recensioni per rileggere quella di "${ricettaNome}"?`
        : `Vuoi aprire la scheda di "${ricettaNome}" per scrivere una recensione?`;
    mostraModalConferma(titolo, messaggio, () => {
      if (modalita === "view") {
        // Segna quale recensione evidenziare nello stato in-memory, poi naviga a #/recensioni.
        // La vista-recensioni.js legge questo valore dopo il render e fa autoscroll + highlight.
        statoApp.highlightRecensioneId = ricettaId;
        window.location.hash = "#/recensioni";
      } else {
        window.location.hash = `#/ricetta/${ricettaId}`;
      }
    });
  }
}

function preparaModalConferma() {
  modalElementi = {
    modal: document.getElementById("modalAzioniRicetta"),
    titolo: document.getElementById("modalAzioniTitolo"),
    messaggio: document.getElementById("modalAzioniMessaggio"),
    annulla: document.getElementById("modalAzioniAnnulla"),
    conferma: document.getElementById("modalAzioniConferma"),
    chiudi: document.getElementById("modalAzioniChiudi")
  };

  if (!modalElementi.modal) {
    console.warn(
      "Modal di conferma per le carte non trovata: verranno eseguite le azioni senza conferma."
    );
    return;
  }

  modalElementi.annulla?.addEventListener("click", chiudiModalAzioni);
  modalElementi.chiudi?.addEventListener("click", chiudiModalAzioni);
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

// Variante pubblica riutilizzabile dalla vista ricettario: stessa modale, titolo fisso rimozione.
export function mostraModalConfermaRicettario(messaggio, onConfirm) {
  mostraModalConferma("Rimuovi dal ricettario", messaggio, onConfirm);
}

function mostraModalConferma(titolo, messaggio, onConfirm) {
  if (!modalElementi?.modal) {
    onConfirm?.();
    return;
  }
  azioneProgrammata = onConfirm;
  if (modalElementi.titolo) modalElementi.titolo.textContent = titolo;
  if (modalElementi.messaggio) modalElementi.messaggio.textContent = messaggio;
  mostraBootstrapModal(modalElementi.modal);
  modalElementi.conferma?.focus();
}

function chiudiModalAzioni() {
  if (!modalElementi?.modal) return;
  nascondiBootstrapModal(modalElementi.modal);
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

function mostraBootstrapModal(modal) {
  const BootstrapModal = window.bootstrap?.Modal;
  if (!BootstrapModal) {
    modal.classList.add("show");
    modal.style.display = "block";
    modal.removeAttribute("aria-hidden");
    return;
  }
  const istanza = BootstrapModal.getOrCreateInstance(modal, { backdrop: true, keyboard: true });
  istanza.show();
}

function nascondiBootstrapModal(modal) {
  const BootstrapModal = window.bootstrap?.Modal;
  if (!BootstrapModal) {
    modal.classList.remove("show");
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    return;
  }
  const istanza = BootstrapModal.getOrCreateInstance(modal);
  istanza.hide();
}
