import { inizializzaStorage } from "./storage.js";
import { impostaEventiAuthNav } from "./navbar.js";
import { precaricaRicetteInEvidenza } from "./api.js";
import { gestisciCambioRoute } from "./router.js";
import { impostaAzioniCarteRicetta } from "./azioni-card.js";

// Inizializzazione app al caricamento della pagina iniziale (ovvero quando apriamo con liveserver index.html o ricarichiamo la pagina)
// PROMEMORIA: L'event listener prende in ingresso il nome dell'evento e una funzione di callback da eseguire quando l'evento viene scatenato,
// ergo ripassare adeguatamente l'argomento di addEventListener e suoi correlati prima di usarlo!
document.addEventListener("DOMContentLoaded", inizializzaApp);

// Gestione invio form e modali con tasto Enter
document.addEventListener("keydown", gestisciInvioFormGenerico);
document.addEventListener("keydown", gestisciInvioModalGenerico);

// Funzione principale di inizializzazione dell'app:
// E' essenzialmente una serie di chiamate a funzioni di setup e inizializzazione, tutte accorpate in un unico punto per chiarezza e manutenzione.
async function inizializzaApp() {
  inizializzaStorage(); // Recupera dati da localStorage/sessionStorage
  impostaEventiAuthNav(); // Imposta eventi per autenticazione e navigazione
  impostaAzioniCarteRicetta(); // Imposta eventi per azioni sulle carte ricetta
  await precaricaRicetteInEvidenza(); // Precarica ricette in evidenza per performance
  window.addEventListener("hashchange", gestisciCambioRoute); // Gestione cambio route
  await gestisciCambioRoute(); // Gestione route iniziale al caricamento della pagina
}

// Ho deciso di includere nello script main.js anche la gestione degli invii di form/modali con il tasto Enter,
// dato che è una funzionalità globale che interessa tutta l'applicazione e non solo un modulo specifico.
// In questo modo evito di dover ripetere lo stesso codice in più file, mantenendo la gestione centralizzata e coerente.
function gestisciInvioFormGenerico(evento) {
  if (evento.key !== "Enter") return;
  const target = evento.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.tagName === "TEXTAREA") return;
  const form = target.closest("form");
  if (!form) {
    const pannelloRicerca = target.closest("#controlliRicerca");
    if (!pannelloRicerca) return;
    const bottoneRicerca = pannelloRicerca.querySelector("button[data-ricerca-trigger]");
    if (!bottoneRicerca) return;
    evento.preventDefault();
    bottoneRicerca.click();
    return;
  }
  evento.preventDefault();
  const submitter = form.querySelector("button[type='submit']");
  if (submitter) {
    submitter.click();
    return;
  }
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
  } else {
    form.submit();
  }
}

function gestisciInvioModalGenerico(evento) {
  if (evento.key !== "Enter") return;
  const target = evento.target;
  if (!(target instanceof HTMLElement)) return;
  const modal = target.closest(".cc-modal-backdrop:not(.d-none)");
  if (!modal) return;
  const confirmId = modal.dataset.confirmButton;
  if (!confirmId) return;
  const bottoneConferma = document.getElementById(confirmId);
  if (!bottoneConferma) return;
  evento.preventDefault();
  bottoneConferma.click();
}
