import { inizializzaStorage } from "./storage.js";
import { impostaEventiAuthNav } from "./navbar.js";
import { precaricaRicetteInEvidenza } from "./api.js";
import { gestisciCambioRoute } from "./router.js";

document.addEventListener("DOMContentLoaded", inizializzaApp);

async function inizializzaApp() {
  inizializzaStorage();
  impostaEventiAuthNav();
  await precaricaRicetteInEvidenza();
  window.addEventListener("hashchange", gestisciCambioRoute);
  await gestisciCambioRoute();
}
