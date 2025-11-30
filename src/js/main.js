import { inizializzaStorage } from "./storage.js";
import { impostaEventiAuthNav } from "./navbar.js";
import { precaricaRicetteInEvidenza } from "./api.js";
import { gestisciCambioRoute } from "./router.js";
import { impostaAzioniCarteRicetta } from "./azioni-card.js";

document.addEventListener("DOMContentLoaded", inizializzaApp);
document.addEventListener("keydown", gestisciInvioFormGenerico);
document.addEventListener("keydown", gestisciInvioModalGenerico);

async function inizializzaApp() {
  inizializzaStorage();
  impostaEventiAuthNav();
  impostaAzioniCarteRicetta();
  await precaricaRicetteInEvidenza();
  window.addEventListener("hashchange", gestisciCambioRoute);
  await gestisciCambioRoute();
}

function gestisciInvioFormGenerico(evento) {
  if (evento.key !== "Enter") return;
  const target = evento.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.tagName === "TEXTAREA") return;
  const form = target.closest("form");
  if (!form) return;
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
