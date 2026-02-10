import { ottieniUtenteCorrente } from "../storage.js";
import { cercaRicettePerArea, descriviArea, traduciAreaEnIt } from "../gestione-api/api.js";
import { creaCardRicetta } from "../componenti/carte.js";
import { ottieniStatoAzioniUtente } from "../componenti/azioni-card.js";

export async function inizializzaVistaHomeLoggata() {
  const utente = ottieniUtenteCorrente();
  const grigliaOrigine = document.getElementById("grigliaOrigine");
  const grigliaResidenza = document.getElementById("grigliaResidenza");
  const badgeOrigine = document.getElementById("conteggioOrigine");
  const badgeResidenza = document.getElementById("conteggioResidenza");
  const sezioneOrigine = grigliaOrigine?.closest("section");
  const sezioneResidenza = grigliaResidenza?.closest("section");
  const titoloOrigine = sezioneOrigine?.querySelector("h2");
  const titoloResidenza = sezioneResidenza?.querySelector("h2");

  if (!utente) {
    if (grigliaOrigine)
      grigliaOrigine.innerHTML = '<p class="text-muted">Accedi per vedere le ricette.</p>';
    if (grigliaResidenza)
      grigliaResidenza.innerHTML = '<p class="text-muted">Accedi per vedere le ricette.</p>';
    if (badgeOrigine) badgeOrigine.textContent = "0 ricette";
    if (badgeResidenza) badgeResidenza.textContent = "0 ricette";
    return;
  }

  const { paeseOrigine, paeseResidenza } = utente;
  const statoAzioni = ottieniStatoAzioniUtente();
  const origineNorm = normalizzaAreaConfronto(paeseOrigine);
  const residenzaNorm = normalizzaAreaConfronto(paeseResidenza);
  const haOrigine = Boolean(origineNorm);
  const haResidenza = Boolean(residenzaNorm);
  const stessaArea = haOrigine && haResidenza && origineNorm === residenzaNorm;

  if (!haOrigine && !haResidenza) {
    mostraSezione(sezioneOrigine);
    nascondiSezione(sezioneResidenza);
    if (titoloOrigine) titoloOrigine.textContent = "Dal tuo profilo";
    if (badgeOrigine) badgeOrigine.textContent = "0 ricette";
    if (grigliaOrigine) {
      grigliaOrigine.innerHTML = `
        <div>
          <p class="text-muted mb-2">Completa il profilo per vedere ricette personalizzate.</p>
          <a class="btn btn-contorno-accento btn-sm" href="#/profilo">Modifica profilo</a>
        </div>
      `;
    }
    return;
  }

  if (stessaArea) {
    mostraSezione(sezioneOrigine);
    nascondiSezione(sezioneResidenza);
    if (titoloOrigine) titoloOrigine.textContent = "Dal tuo paese";
    const area = scegliCodiceArea(paeseOrigine, paeseResidenza);
    await renderSezioneArea({
      area,
      griglia: grigliaOrigine,
      badge: badgeOrigine,
      statoAzioni
    });
    return;
  }

  if (haOrigine) {
    mostraSezione(sezioneOrigine);
    if (titoloOrigine) titoloOrigine.textContent = "Dal tuo paese di origine";
    await renderSezioneArea({
      area: paeseOrigine,
      griglia: grigliaOrigine,
      badge: badgeOrigine,
      statoAzioni
    });
  } else {
    nascondiSezione(sezioneOrigine);
  }

  if (haResidenza) {
    mostraSezione(sezioneResidenza);
    if (titoloResidenza) titoloResidenza.textContent = "Dal tuo paese di residenza";
    await renderSezioneArea({
      area: paeseResidenza,
      griglia: grigliaResidenza,
      badge: badgeResidenza,
      statoAzioni
    });
  } else {
    nascondiSezione(sezioneResidenza);
  }
}

function normalizzaAreaConfronto(valore) {
  if (!valore) return "";
  const tradotta = traduciAreaEnIt(String(valore).trim());
  return normalizzaTesto(tradotta);
}

function normalizzaTesto(valore) {
  return String(valore ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function scegliCodiceArea(orig, res) {
  if (orig && traduciAreaEnIt(orig) !== orig) return orig;
  if (res && traduciAreaEnIt(res) !== res) return res;
  return orig || res || "";
}

async function renderSezioneArea({ area, griglia, badge, statoAzioni }) {
  if (!griglia || !badge) return;
  if (!area) {
    griglia.innerHTML =
      '<p class="text-muted">Imposta il paese nel profilo per vedere suggerimenti.</p>';
    badge.textContent = "0 ricette";
    return;
  }
  griglia.innerHTML = '<p class="text-muted">Caricamento ricette...</p>';
  const ricette = await cercaRicettePerArea(area, 4);
  badge.textContent = `${ricette.length} ricette`;
  const etichetta = descriviArea(area);
  griglia.innerHTML =
    ricette.length > 0
      ? ricette
          .map(ricetta =>
            creaCardRicetta(ricetta, {
              inRicettario: statoAzioni.idsRicettario.has(ricetta.id),
              haRecensione: statoAzioni.idsRecensioni.has(ricetta.id)
            })
          )
          .join("")
      : `<p class="text-muted">Nessuna ricetta trovata per ${etichetta}.</p>`;
}

function mostraSezione(sezione) {
  if (!sezione) return;
  sezione.classList.remove("d-none");
  sezione.setAttribute("aria-hidden", "false");
}

function nascondiSezione(sezione) {
  if (!sezione) return;
  sezione.classList.add("d-none");
  sezione.setAttribute("aria-hidden", "true");
}
