import { inizializzaVistaHome } from "./viste/vista-home.js";
import { inizializzaVistaLogin } from "./viste/vista-accesso.js";
import { inizializzaVistaRegistrazione } from "./viste/vista-registrazione.js";
import { inizializzaVistaProfilo } from "./viste/vista-profilo.js";
import { inizializzaVistaRicerca } from "./viste/vista-ricerca.js";
import { inizializzaVistaRicettario } from "./viste/vista-ricettario.js";
import { inizializzaVistaRecensioni } from "./viste/vista-recensioni.js";
import { inizializzaVistaDettaglioRicetta } from "./viste/vista-dettaglio-ricetta.js";

export const PERCORSI = {
  "#/home": { frammento: "./home.html", alCaricamento: inizializzaVistaHome },
  "#/accesso": { frammento: "./login.html", alCaricamento: inizializzaVistaLogin },
  "#/registrazione": { frammento: "./register.html", alCaricamento: inizializzaVistaRegistrazione },
  "#/profilo": { frammento: "./profile.html", alCaricamento: inizializzaVistaProfilo, protetta: true },
  "#/ricerca": { frammento: "./search.html", alCaricamento: inizializzaVistaRicerca },
  "#/ricettario": { frammento: "./ricettario.html", alCaricamento: inizializzaVistaRicettario, protetta: true },
  "#/recensioni": { frammento: "./reviews.html", alCaricamento: inizializzaVistaRecensioni, protetta: true },
  "#/ricetta": { frammento: "./recipe-detail.html", alCaricamento: inizializzaVistaDettaglioRicetta }
};
