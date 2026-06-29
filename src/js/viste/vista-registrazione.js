import { ottieniUtenteCorrente, ottieniUtenti, salvaUtenti } from "../storage.js";
import { mostraAvviso, generaId, evidenziaFieldInvalidi } from "../ui.js";
import { ottieniAreeCucina } from "../gestione-api/api.js";
import { creaCredenzialiPassword } from "../auth.js";

// ============================================================================
//  VISTA REGISTRAZIONE — frammento register.html
// ============================================================================
// Flusso web storage durante la registrazione:
//   1) validazione lato client (unicità username/email contro "users", lunghezza password, ecc.)
//   2) creaCredenzialiPassword → genera salt + SHA-256(salt:password) — la password NON viene salvata
//   3) salvaUtenti → scrive il nuovo utente in Local Storage, chiave "users"
//   4) sessionStorage.setItem("cc_post_signup") → passaggio di consegne usa-e-getta verso il login
//   5) redirect a #/accesso: la registrazione NON fa login automatico (flussi separati e dimostrabili)
// DEVTOOLS: F12 → Application → Local Storage → "users": compare il nuovo oggetto (passwordHash+salt,
// nessun campo "password"). Session Storage → "cc_post_signup" appare e sparisce nel giro di secondi.
export function inizializzaVistaRegistrazione() {
  // Guardia: la navbar non mostra mai il link registrazione a utenti loggati, ma per sicurezza.
  if (ottieniUtenteCorrente()) {
    window.location.hash = "#/home";
    return;
  }

  const form = document.getElementById("formRegistrazione");
  popolaSelectAree();
  const boxAvviso = document.getElementById("avvisoRegistrazione");
  impostaGestioneDocumentiLegali();
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const nome = document.getElementById("nomeRegistrazione").value.trim();
    const cognome = document.getElementById("cognomeRegistrazione").value.trim();
    const nomeUtente = document.getElementById("usernameRegistrazione").value.trim();
    const email = document.getElementById("emailRegistrazione").value.trim();
    const password = document.getElementById("passwordRegistrazione").value.trim();
    const confermaPassword = document.getElementById("confermaPasswordRegistrazione").value.trim();
    const paeseOrigine = document.getElementById("paeseOrigineRegistrazione").value.trim();
    const paeseResidenza = document.getElementById("paeseResidenzaRegistrazione").value.trim();
    const piattiPreferitiRaw = document
      .getElementById("piattiPreferitiRegistrazione")
      .value.trim();
    const accettaTermini = document.getElementById("accettaTermini").checked;
    const accettaPrivacy = document.getElementById("accettaPrivacy").checked;

    if (!nome || !cognome || !nomeUtente || !email || !password) {
      evidenziaFieldInvalidi([
        !nome     && document.getElementById("nomeRegistrazione"),
        !cognome  && document.getElementById("cognomeRegistrazione"),
        !nomeUtente && document.getElementById("usernameRegistrazione"),
        !email    && document.getElementById("emailRegistrazione"),
        !password && document.getElementById("passwordRegistrazione")
      ]);
      mostraAvviso(boxAvviso, "Compila tutti i campi obbligatori.");
      return;
    }
    if (password.length < 6) {
      evidenziaFieldInvalidi([document.getElementById("passwordRegistrazione")]);
      mostraAvviso(boxAvviso, "La password deve contenere almeno 6 caratteri.");
      return;
    }
    if (password !== confermaPassword) {
      evidenziaFieldInvalidi([
        document.getElementById("passwordRegistrazione"),
        document.getElementById("confermaPasswordRegistrazione")
      ]);
      mostraAvviso(boxAvviso, "Le password non coincidono.");
      return;
    }
    if (!accettaTermini || !accettaPrivacy) {
      mostraAvviso(boxAvviso, "Devi accettare Termini e Privacy per continuare.");
      return;
    }

    const utenti = ottieniUtenti();
    const giaEsiste = utenti.some(
      utente => utente.nomeUtente === nomeUtente || utente.email === email
    );
    if (giaEsiste) {
      mostraAvviso(boxAvviso, "Username o email già utilizzati.");
      return;
    }

    // HASHING: dalla password in chiaro otteniamo { passwordHash, salt } (vedi auth.js).
    // La password in chiaro NON viene mai salvata: resta solo in questa variabile locale.
    const { passwordHash, salt } = await creaCredenzialiPassword(password);
    const nuovoUtente = {
      id: generaId("utente"), // id univoco "utente_<timestamp>_<random>"
      username: nomeUtente,
      email,
      passwordHash, // <-- nello storage finisce l'hash...
      salt, // <-- ...e il salt, mai la password
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      firstName: nome,
      lastName: cognome,
      originCountry: paeseOrigine,
      residenceCountry: paeseResidenza,
      favoriteDishes: normalizzaPreferiti(piattiPreferitiRaw) // "piatti preferiti" richiesti dalla specifica
    };
    utenti.push(nuovoUtente);
    // >>> MOMENTO CHIAVE DELLA REGISTRAZIONE <<<
    // salvaUtenti riscrive l'intero array nella chiave "users" del Local Storage.
    // DEVTOOLS: F12 → Application → Local Storage → "users": compare il nuovo oggetto utente
    // (con passwordHash + salt e senza password). Da qui in poi l'account esiste e può fare login.
    salvaUtenti(utenti);
    mostraSpinnerRegistrazione();
    // Passaggio di consegne verso la pagina di login tramite SESSION STORAGE: salviamo un messaggio
    // "usa e getta" che il login leggerà e poi cancellerà (vedi vista-accesso.js).
    // DEVTOOLS: in Session Storage compare temporaneamente la chiave "cc_post_signup".
    sessionStorage.setItem(
      "cc_post_signup",
      JSON.stringify({ identificatore: email, messaggio: "Account creato, accedi per continuare." })
    );
    // NB: la registrazione NON effettua il login automatico: l'utente viene portato alla pagina
    // di accesso per autenticarsi (così il prof vede separati i due flussi: creazione vs login).
    setTimeout(() => {
      nascondiSpinnerRegistrazione();
      window.location.hash = "#/accesso";
    }, 1800);
  });
}

// Popola entrambe le select paese con le aree di cucina lette dalla cache/API.
// Le opzioni vengono caricate in modo lazy (solo quando serve questa vista) per non bloccare lo startup.
async function popolaSelectAree() {
  const selectOrigine = document.getElementById("paeseOrigineRegistrazione");
  const selectResidenza = document.getElementById("paeseResidenzaRegistrazione");
  if (!selectOrigine || !selectResidenza) return;
  const elenco = await ottieniAreeCucina();
  const opzioni = ['<option value="">Seleziona un paese</option>']
    .concat(
      elenco.map(area => `<option value="${area.nomeEn}">${area.emoji} ${area.nomeIt} </option>`)
    )
    .join("");
  selectOrigine.innerHTML = opzioni;
  selectResidenza.innerHTML = opzioni;
}

function impostaGestioneDocumentiLegali() {
  // Apertura: click sui link "Termini e condizioni" / "Informativa privacy"
  document.querySelectorAll("[data-doc-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = document.getElementById(btn.dataset.docModal);
      apriModalDocumento(modal);
    });
  });

  // Chiusura via event delegation sul backdrop: cattura sia il click sul backdrop (fuori dalla modale)
  // sia il click su [data-close-doc] anche DOPO che il pulsante è stato abilitato dinamicamente.
  // Usare delegation invece di listener diretto evita il problema del pulsante disabled che non
  // propaga i click nel momento in cui viene registrato il listener.
  document.querySelectorAll(".doc-modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", event => {
      const btnClose = event.target.closest("[data-close-doc]");
      if (btnClose && !btnClose.disabled) {
        // Chiusura CONFERMATA via "Ho letto, torna al form":
        // sblocchiamo e spuntiamo il checkbox corrispondente a questa modale.
        abilitaCheckboxDopoLettura(backdrop.id);
        chiudiModalDocumento(backdrop);
        return;
      }
      // Click sul backdrop (fuori dal pannello) → chiude ma NON sblocca il checkbox:
      // l'utente non ha confermato la lettura cliccando il pulsante.
      if (event.target === backdrop) {
        chiudiModalDocumento(backdrop);
      }
    });
  });
}

// Sblocca e auto-spunta il checkbox corrispondente alla modale appena letta.
// Rimuove anche l'hint "apri e leggi il documento per sbloccare" perché non serve più.
function abilitaCheckboxDopoLettura(modalId) {
  const mappa = {
    modalTermini: "accettaTermini",
    modalPrivacy: "accettaPrivacy"
  };
  const checkboxId = mappa[modalId];
  if (!checkboxId) return;
  const checkbox = document.getElementById(checkboxId);
  if (!checkbox) return;
  checkbox.disabled = false;
  checkbox.checked = true;
  // Nascondiamo l'hint testuale ora che il documento è stato letto
  const hint = checkbox.closest(".form-check")?.querySelector(".cc-hint-sblocco");
  if (hint) hint.remove();
}

function apriModalDocumento(modal) {
  if (!modal) return;
  modal.classList.remove("d-none");
  modal.setAttribute("aria-hidden", "false");
  const body = modal.querySelector(".doc-modal__body");
  const btnClose = modal.querySelector("[data-close-doc]");
  if (body && btnClose) {
    btnClose.disabled = !haRaggiuntoFondo(body);
    const handler = () => {
      if (haRaggiuntoFondo(body)) {
        btnClose.disabled = false;
        body.removeEventListener("scroll", handler);
      }
    };
    body.addEventListener("scroll", handler);
  }
}

function chiudiModalDocumento(modal) {
  if (!modal) return;
  modal.classList.add("d-none");
  modal.setAttribute("aria-hidden", "true");
}

function haRaggiuntoFondo(elemento) {
  return elemento.scrollTop + elemento.clientHeight >= elemento.scrollHeight - 5;
}

function mostraSpinnerRegistrazione() {
  const spinner = document.getElementById("registrazioneSpinner");
  if (!spinner) return;
  spinner.classList.remove("d-none");
  spinner.setAttribute("aria-hidden", "false");
}

function nascondiSpinnerRegistrazione() {
  const spinner = document.getElementById("registrazioneSpinner");
  if (!spinner) return;
  spinner.classList.add("d-none");
  spinner.setAttribute("aria-hidden", "true");
}

function normalizzaPreferiti(valore) {
  if (!valore) return [];
  return valore
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}
