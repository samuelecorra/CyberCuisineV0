import { inizializzaStorage } from "./storage.js";
import { impostaEventiAuthNav } from "./navbar.js";
import { precaricaCatalogoRicette } from "./gestione-api/api.js";
import { gestisciCambioRoute } from "./router.js";
import { impostaAzioniCarteRicetta } from "./componenti/azioni-card.js";
import { statoApp } from "./stato.js";

// Inizializzazione app al caricamento della pagina iniziale (ovvero quando apriamo con liveserver index.html o ricarichiamo la pagina)
// PROMEMORIA: L'event listener prende in ingresso il nome dell'evento e una funzione di callback da eseguire quando l'evento viene scatenato,
// ergo ripassare adeguatamente l'argomento di addEventListener e suoi correlati prima di usarlo!
document.addEventListener("DOMContentLoaded", inizializzaApp);

// Gestione invio form con tasto Enter
document.addEventListener("keydown", gestisciInvioFormGenerico);

// Funzione principale di inizializzazione dell'app:
// E' essenzialmente una serie di chiamate a funzioni di setup e inizializzazione, tutte accorpate in un unico punto per chiarezza e manutenzione.
async function inizializzaApp() {
  await inizializzaStorage(); // Recupera dati da localStorage/sessionStorage
  impostaEventiAuthNav(); // Imposta eventi per autenticazione e navigazione
  impostaAzioniCarteRicetta(); // Imposta eventi per azioni sulle carte ricetta
  impostaRipristinoEsploraNav(); // Permette di resettare la vista esplora se già attiva
  statoApp.catalogoCompleto = await precaricaCatalogoRicette(); // Scarica il catalogo base una sola volta
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

// Funzione per impostare il reset della vista esplora quando si clicca sul link di navigazione
// se la vista è già attiva. In questo modo l'utente può facilmente ripulire i filtri e le ricerche
// fatte in precedenza senza dover ricaricare la pagina o navigare altrove e tornare indietro.
function impostaRipristinoEsploraNav() {
  const linkEsplora = document.getElementById("ccLinkEsplora");
  if (!linkEsplora) return;
  linkEsplora.addEventListener("click", async evento => {
    if (window.location.hash !== "#/esplora") return;
    evento.preventDefault();
    statoApp.risultatiRicerca = [];
    await gestisciCambioRoute();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
