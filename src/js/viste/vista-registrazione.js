import { ottieniUtenteCorrente, ottieniUtenti, salvaUtenti } from "../storage.js";
import { mostraAvviso, generaId } from "../ui.js";
import { ottieniAreeCucina } from "../gestione-api/api.js";
import { creaCredenzialiPassword } from "../auth.js";

// 1. La funzione principale per inizializzare la vista di registrazione
// è progettata per gestire il flusso di registrazione dell'utente,
// inclusa la validazione del modulo, la creazione dell'utente e la navigazione post-registrazione.
export function inizializzaVistaRegistrazione() {
  if (ottieniUtenteCorrente()) {
    /* Se l'utente è già loggato, non ha senso registrarsi di nuovo:
    ATTENZIONE: a dire il vero non dovremmo mai nemmeno entrare qui, perché quando l'utente è
    loggato, al posto del navlink "Registrati/Accedi" c'è il dropdown "Ciao [NOME]" con annessi
    link a Profilo e Logout. Comunque, giusto per sicurezza, ridirigiamo alla home. */
    window.location.hash = "#/home";
    return;
  }

  // Dopo questo estremo controllo "futile", possiamo procedere con l'inizializzazione del form
  const form = document.getElementById("formRegistrazione"); // Innanzitutto prendiamo il form
  popolaSelectAree(); // Popoliamo le select di aree di cucina - vedere riga 87
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
      mostraAvviso(boxAvviso, "Compila tutti i campi obbligatori.");
      return;
    }
    if (password.length < 6) {
      mostraAvviso(boxAvviso, "La password deve contenere almeno 6 caratteri.");
      return;
    }
    if (password !== confermaPassword) {
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

// Serve una funzione per poter riempire i vari valori quando l'utente apre la select
// per inserire il paese di origine o residenza. Il vantaggio di farlo in questo modo è che
// evitiamo di appesantire il caricamento iniziale della pagina con un lungo elenco di opzioni.
// In questo modo, le opzioni vengono caricate solo quando effettivamente necessarie.
async function popolaSelectAree() {
  const selectOrigine = document.getElementById("paeseOrigineRegistrazione"); // Prima prendiamo il select 1
  const selectResidenza = document.getElementById("paeseResidenzaRegistrazione"); // Poi il select 2
  if (!selectOrigine || !selectResidenza) return; // Se uno dei due non c'è, usciamo (non dovrebbe mai accadere)
  const elenco = await ottieniAreeCucina(); // Ora prendiamo l'elenco delle aree di cucina, funzione importata da api.js
  const opzioni = ['<option value="">Seleziona un paese</option>']
    .concat(
      elenco.map(area => `<option value="${area.nomeEn}">${area.emoji} ${area.nomeIt} </option>`)
    )
    .join("");
  selectOrigine.innerHTML = opzioni;
  selectResidenza.innerHTML = opzioni;
}

function impostaGestioneDocumentiLegali() {
  const triggerButtons = document.querySelectorAll("[data-doc-modal]");
  triggerButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = document.getElementById(btn.dataset.docModal);
      apriModalDocumento(modal);
    });
  });

  document.querySelectorAll("[data-close-doc]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".doc-modal-backdrop");
      chiudiModalDocumento(modal);
    });
  });

  document.querySelectorAll(".doc-modal-backdrop").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        chiudiModalDocumento(modal);
      }
    });
  });
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
