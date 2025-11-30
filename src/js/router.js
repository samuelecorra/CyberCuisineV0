// Il file di routing gestisce la navigazione tra le diverse viste dell'applicazione,
// caricando i frammenti HTML corrispondenti e invocando le funzioni di inizializzazione specifiche
// per ogni vista. In questo modo manteniamo l'app come una Single Page Application (SPA),
// migliorando l'esperienza utente e le performance complessive.

// Per fare ciò serve importare un bel po' di moduli utili:

// 1. La mappatura delle rotte (mappatura percorso => funzione di inizializzazione)
import { PERCORSI } from "./rotte.js";

// 2. Funzioni e stato generali dell'applicazione
import { statoApp } from "./stato.js";

// 3. Funzioni di utilità per il caricamento dei frammenti e la gestione dell'utente
import { ottieniUtenteCorrente } from "./storage.js";

// 4. Funzioni per l'aggiornamento della navbar
import { aggiornaNavigazioneAttiva, aggiornaStatoAuthNav } from "./navbar.js";

// ===========================================================================================

// 1. La funzione principale di gestione del cambio di route si occupa di:
//    - Determinare la rotta attiva in base all'hash della URL
//    - Verificare se la rotta è protetta e se l'utente è autenticato
//    - Caricare il frammento HTML corrispondente
//    - Eseguire la funzione di inizializzazione associata alla rotta
//    - Gestire eventuali errori di caricamento o rotte non trovate
//    - Aggiornare lo stato della navbar in base alla rotta attiva e allo stato di autenticazione
export async function gestisciCambioRoute() {
  const percorsoPrecedente = statoApp.percorsoAttivo; // Salviamo la rotta precedente perché potrebbe servire per deallocare risorse
  let hash = window.location.hash || "#/home"; // Ora recuperiamo l'hash dalla URL (o usiamo la home come default in caso in cui non ci sia)
  if (!hash.startsWith("#/")) {
    // Se l'hash non inizia con #/, reindirizziamo alla home, poiché non è una rotta valida
    hash = "#/home";
  }

  let chiavePercorso = hash; // Di default, la chiave del percorso è l'hash stesso
  let parametroDinamico = null; // Variabile per eventuali parametri dinamici (es. ID ricetta)

  if (hash.startsWith("#/ricetta/")) {
    // Valutiamo il caso speciale della rotta di dettaglio ricetta, che ha un parametro dinamico (ID)
    chiavePercorso = "#/ricetta"; // Hardcodiamo la chiave del percorso
    parametroDinamico = hash.split("/")[2]; // Estraiamo l'ID della ricetta dall'hash
  }

  const configurazionePercorso = PERCORSI[chiavePercorso]; // Ora confrontiamo la chiave con la mappatura delle rotte previste dall'app
  if (!configurazionePercorso) {
    // Se non troviamo la rotta, mostriamo un messaggio di errore
    mostraNonTrovato(); // Ecco il messaggio di "pagina non trovata"
    return; // E terminiamo l'esecuzione della funzione
  }

  // Ma se la rotta esiste, possiamo procedere: vediamo se l'utente è autenticato o meno
  const utente = ottieniUtenteCorrente();

  if (configurazionePercorso.protetta && !utente) {
    window.location.hash = "#/accesso"; // Se la rotta è protetta e l'utente non è autenticato, reindirizziamo alla pagina di accesso
    return; // Questo accade quando si tenta di accedere al ricettario o alle recensioni senza essere loggati, tutti gli altri sono auth-free!
  }

  // Prima di caricare la nuova vista, deallochiamo eventuali risorse della vista precedente:
  // Nello specifico, la vista che alloca più risorse è quella di esplora, che mantiene in memoria
  // il catalogo completo delle ricette per permettere ricerche e filtri veloci senza dover rifare
  // chiamate API continue. Quando usciamo dalla vista esplora, è bene liberare questa memoria.
  deallocaCatalogoEsplora(percorsoPrecedente, hash);

  // Ora possiamo davvero procedere al caricamento della vista richiesta:
  statoApp.percorsoAttivo = hash; // Prendiamo dalla nostra importazione di stato globale dell'app il percorso attivo e aggiorniamolo

  // Tutto ciò che stiamo per fare ora è soggetto a possibili errori (es. fetch fallito, funzione di inizializzazione che lancia eccezioni, ecc.),
  // quindi racchiudiamo il tutto in un blocco try/catch per gestire eventuali problemi in modo elegante.

  // Blocco try/catch: gestisce il caricamento del frammento HTML e l'invocazione della funzione di inizializzazione della vista
  // - Determina quale frammento usare (protetto o pubblico) e quale funzione di onLoad chiamare
  // - Carica il frammento via fetch (con caching)
  // - Inserisce l'HTML nel contenitore principale
  // - Esegue la funzione di inizializzazione della vista (passando eventuali parametri dinamici)
  // - Aggiorna la navigazione attiva e lo stato della navbar
  // - In caso di errore, mostra una vista di errore generica
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

// Funzione asincrona per caricare un frammento HTML (vista) via fetch
// - Usa la cache in statoApp per evitare richieste duplicate
// - Se la fetch fallisce, lancia un errore gestito dal chiamante
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

// Mostra una vista di "pagina non trovata" se la rotta non esiste
function mostraNonTrovato() {
  const contenitoreApp = document.getElementById("app");
  contenitoreApp.innerHTML = `
          <section class="text-center py-5">
              <h1 class="display-6">Pagina non trovata</h1>
              <p class="text-muted">Il percorso richiesto non esiste. Torna alla <a href="#/home">home</a>.</p>
          </section>
      `;
}

// Mostra una vista di errore generico se il caricamento della route fallisce
function mostraErroreRoute() {
  const contenitoreApp = document.getElementById("app");
  contenitoreApp.innerHTML = `
          <section class="text-center py-5">
              <h1 class="display-6">Errore imprevisto</h1>
              <p class="text-muted">Si è verificato un problema nel caricamento della vista. Riprova tra qualche istante.</p>
          </section>
      `;
}

// Dealloca il catalogo completo delle ricette quando si esce dalla vista esplora
// - Serve a liberare memoria e a forzare il reload del catalogo quando si rientra
function deallocaCatalogoEsplora(percorsoPrecedente, nuovoPercorso) {
  if (percorsoPrecedente === "#/esplora" && nuovoPercorso !== "#/esplora") {
    statoApp.catalogoCompleto = [];
  }
}
