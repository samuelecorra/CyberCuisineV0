// ============================================================================
//  ROTTE — tabella di routing della SPA (Single Page Application)
// ============================================================================
// CyberCuisine è una SPA: NON ci sono ricaricamenti di pagina tra una vista e l'altra.
// Il meccanismo è l'hash dell'URL (la parte dopo "#"): cambiare hash NON causa una richiesta HTTP
// al server, ma genera un evento "hashchange" che il router (main.js) cattura per decidere quale
// frammento HTML caricare e quale funzione di inizializzazione eseguire.
//
// STRUTTURA DI OGNI ROTTA:
//   frammento            → percorso del file HTML parziale da iniettare nel <main>
//   alCaricamento        → funzione chiamata dopo l'iniezione dell'HTML (aggancia listener, fetch, ecc.)
//   protetta: true       → la rotta richiede login; il router reindirizza a #/accesso se non c'è sessione
//   frammentoProtetto    → HTML alternativo mostrato all'utente loggato (usato solo da #/home)
//   alCaricamentoProtetto→ funzione alternativa per l'HTML protetto (usato solo da #/home)
//
// >>> COME ESTENDERE <<<
// Per aggiungere una vista: crea il file HTML, scrivi la funzione inizializza*, importala qui e aggiungi
// una chiave a PERCORSI. Il router non va toccato.

// Funzioni di inizializzazione delle singole viste — il router le chiama dopo aver caricato l'HTML:
import { inizializzaVistaHome } from "./viste/vista-home.js";
import { inizializzaVistaHomeLoggata } from "./viste/vista-home-loggata.js";
import { inizializzaVistaLogin } from "./viste/vista-accesso.js";
import { inizializzaVistaRegistrazione } from "./viste/vista-registrazione.js";
import { inizializzaVistaProfilo } from "./viste/vista-profilo.js";
import { inizializzaVistaRicettario } from "./viste/vista-ricettario.js";
import { inizializzaVistaRecensioni } from "./viste/vista-recensioni.js";
import { inizializzaVistaDettaglioRicetta } from "./viste/vista-dettaglio-ricetta.js";
import { inizializzaVistaEsplora } from "./viste/vista-esplora.js";

// Tabella rotte: le chiavi sono gli hash URL che il router confronta con window.location.hash.
// "export const" perché è letta da main.js ma non deve mai essere mutata a runtime.
export const PERCORSI = {
  // #/home è l'unica rotta con due versioni: loggato e non loggato vedono HTML diversi.
  // Il router legge "session".currentUserId per scegliere quale coppia frammento/funzione usare.
  "#/home": {
    frammento: "./home.html",
    frammentoProtetto: "./home.logged.html",
    alCaricamento: inizializzaVistaHome,
    alCaricamentoProtetto: inizializzaVistaHomeLoggata
  },
  "#/accesso": { frammento: "./login.html", alCaricamento: inizializzaVistaLogin },
  "#/registrazione": { frammento: "./register.html", alCaricamento: inizializzaVistaRegistrazione },
  "#/profilo": {
    frammento: "./profile.html",
    alCaricamento: inizializzaVistaProfilo,
    protetta: true
  },
  "#/esplora": { frammento: "./esplora.html", alCaricamento: inizializzaVistaEsplora },
  "#/ricettario": {
    frammento: "./ricettario.html",
    alCaricamento: inizializzaVistaRicettario,
    protetta: true
  },
  "#/recensioni": {
    frammento: "./reviews.html",
    alCaricamento: inizializzaVistaRecensioni,
    protetta: true
  },
  "#/ricetta": {
    frammento: "./recipe-detail.html",
    alCaricamento: inizializzaVistaDettaglioRicetta
  }
};
