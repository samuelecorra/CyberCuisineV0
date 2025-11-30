import { inizializzaVistaHome } from "./viste/vista-home.js";
import { inizializzaVistaHomeLoggata } from "./viste/vista-home-loggata.js";
import { inizializzaVistaLogin } from "./viste/vista-accesso.js";
import { inizializzaVistaRegistrazione } from "./viste/vista-registrazione.js";
import { inizializzaVistaProfilo } from "./viste/vista-profilo.js";
import { inizializzaVistaRicerca } from "./viste/vista-ricerca.js";
import { inizializzaVistaRicettario } from "./viste/vista-ricettario.js";
import { inizializzaVistaRecensioni } from "./viste/vista-recensioni.js";
import { inizializzaVistaDettaglioRicetta } from "./viste/vista-dettaglio-ricetta.js";
import { inizializzaVistaEsplora } from "./viste/vista-esplora.js";

export const PERCORSI = {
  "#/home": {
    frammento: "./home.html",
    frammentoProtetto: "./home.logged.html",
    alCaricamento: inizializzaVistaHome,
    alCaricamentoProtetto: inizializzaVistaHomeLoggata
  },
  "#/accesso": { frammento: "./login.html", alCaricamento: inizializzaVistaLogin },
  "#/registrazione": { frammento: "./register.html", alCaricamento: inizializzaVistaRegistrazione },
  "#/profilo": { frammento: "./profile.html", alCaricamento: inizializzaVistaProfilo, protetta: true },
  "#/esplora": { frammento: "./esplora.html", alCaricamento: inizializzaVistaEsplora },
  "#/ricerca": { frammento: "./search.html", alCaricamento: inizializzaVistaRicerca },
  "#/ricettario": { frammento: "./ricettario.html", alCaricamento: inizializzaVistaRicettario, protetta: true },
  "#/recensioni": { frammento: "./reviews.html", alCaricamento: inizializzaVistaRecensioni, protetta: true },
  "#/ricetta": { frammento: "./recipe-detail.html", alCaricamento: inizializzaVistaDettaglioRicetta }
};
