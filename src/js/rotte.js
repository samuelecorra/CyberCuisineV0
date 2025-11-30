// Nello script delle varie rotte andiamo semplicemente a mappare i vari percorsi (hash) alle loro configurazioni,
// specificando per ognuno di essi il frammento HTML da caricare e la funzione di inizializzazione da eseguire al
// caricamento.
// In questo modo manteniamo il router generico e indipendente dalle singole viste, facilitando la manutenzione
// e l'estensibilità dell'app.

// Innanzitutto serve importare le funzioni di inizializzazione delle varie viste, necessarie per la mappatura:
import { inizializzaVistaHome } from "./viste/vista-home.js";
import { inizializzaVistaHomeLoggata } from "./viste/vista-home-loggata.js";
import { inizializzaVistaLogin } from "./viste/vista-accesso.js";
import { inizializzaVistaRegistrazione } from "./viste/vista-registrazione.js";
import { inizializzaVistaProfilo } from "./viste/vista-profilo.js";
import { inizializzaVistaRicettario } from "./viste/vista-ricettario.js";
import { inizializzaVistaRecensioni } from "./viste/vista-recensioni.js";
import { inizializzaVistaDettaglioRicetta } from "./viste/vista-dettaglio-ricetta.js";
import { inizializzaVistaEsplora } from "./viste/vista-esplora.js";

// I vari percorsi dell'applicazione sono un oggetto con chiavi e valori ben definiti, che non devono
// mai essere modificati a runtime. Per questo motivo usiamo "export const".
export const PERCORSI = {
  // Poniamo particolare attenzione alla rotta di default:
  // L'utente loggato e non loggato devono vedere due versioni differenti della home, quindi
  // definiamo sia un frammento che una funzione di inizializzazione differente per i due casi.
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
