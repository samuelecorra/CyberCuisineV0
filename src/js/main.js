import { inizializzaStorage } from "./storage.js";
import { impostaEventiAuthNav } from "./navbar.js";
import { precaricaCatalogoCompleto } from "./gestione-api/api.js";
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
// L'ORDINE È IMPORTANTE e rispecchia il requisito di startup della specifica (PDF, pag. 3):
//   "Allo startup... tutti i dati necessari (JSON) devono essere SCARICATI dalle API di TheMealDB,
//    MEMORIZZATI nel web storage e VISUALIZZATI nell'applicazione web."
async function inizializzaApp() {
  // 1) Prepara/migra le strutture del web storage (chiavi: app:meta, users, session, recipes:cache, areas:cache).
  //    DEVTOOLS: F12 → Application → Local Storage. Dopo questa riga compaiono le chiavi base dell'app.
  await inizializzaStorage();

  // 2) Aggancia gli eventi della navbar legati all'autenticazione (link Accedi / menu utente / logout)
  //    e sincronizza subito lo stato della navbar leggendo la sessione corrente (chiave "session").
  impostaEventiAuthNav();

  // 3) Registra (una sola volta) la "event delegation" per i pulsanti delle card ricetta (ricettario/recensione).
  impostaAzioniCarteRicetta();

  // 4) Consente di azzerare i filtri della vista Esplora se si riclicca il link mentre è già attiva.
  impostaRipristinoEsploraNav();

  // 5) STARTUP DATA: scarica l'intero catalogo da TheMealDB e lo memorizza nel web storage
  //    (localStorage → chiave "recipes:cache"). Mostriamo un overlay a tutto schermo finché finisce,
  //    così l'utente non vede una pagina vuota durante i 26 fetch del primo avvio.
  //    Nei riavvii successivi la cache è già piena e valida (TTL 72h): l'overlay sparisce all'istante.
  try {
    statoApp.catalogoCompleto = await precaricaCatalogoCompleto();
  } finally {
    nascondiOverlayAvvio(); // viene eseguito sia in caso di successo sia in caso di errore di rete
  }

  // 6) Da ora in poi ogni cambio di hash nella URL (#/...) viene gestito dal router SPA.
  window.addEventListener("hashchange", gestisciCambioRoute);

  // 7) Render della rotta iniziale (di default #/home): "visualizzazione" dei dati appena scaricati.
  await gestisciCambioRoute();
}

// Nasconde l'overlay di caricamento iniziale (#ccAvvioOverlay, definito in index.html).
// L'overlay è VISIBILE di default nell'HTML: così copre la pagina sin dal primo paint, prima ancora
// che questo modulo JS venga eseguito. Qui lo nascondiamo aggiungendo la classe Bootstrap "d-none".
function nascondiOverlayAvvio() {
  const overlay = document.getElementById("ccAvvioOverlay");
  if (!overlay) return;
  overlay.classList.add("d-none");
  overlay.setAttribute("aria-hidden", "true");
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
