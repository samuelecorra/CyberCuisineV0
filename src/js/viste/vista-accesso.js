import { ottieniUtenteCorrente, ottieniUtenti, impostaUtenteCorrente } from "../storage.js";
import { mostraAvviso } from "../ui.js";
import { aggiornaStatoAuthNav } from "../navbar.js";
import { verificaPassword } from "../auth.js";

export function inizializzaVistaLogin() {
  if (ottieniUtenteCorrente()) {
    window.location.hash = "#/home";
    return;
  }
  const form = document.getElementById("formLogin");
  const boxAvviso = document.getElementById("avvisoLogin");
  const checkRicorda = document.getElementById("ricordaAccesso");
  const bottoneSubmit = form?.querySelector('button[type="submit"]');

  // Messaggio post-registrazione
  mostraMessaggioPostRegistrazione();

  // Prefill se l'utente ha scelto di essere ricordato
  const credenzialiSalvate = caricaCredenzialiSalvate();
  if (credenzialiSalvate) {
    document.getElementById("identificatoreLogin").value = credenzialiSalvate.identificatore;
    checkRicorda.checked = true;
  }
  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const identificatore = document.getElementById("identificatoreLogin").value.trim();
    const password = document.getElementById("passwordLogin").value.trim();
    if (!identificatore || !password) {
      mostraAvviso(boxAvviso, "Inserisci username/email e password.");
      return;
    }
    const utenti = ottieniUtenti();
    const utente = utenti.find(
      u => u.nomeUtente === identificatore || u.username === identificatore || u.email === identificatore
    );
    if (!utente) {
      mostraAvviso(boxAvviso, "Credenziali non valide.");
      return;
    }
    const ok = await verificaPassword(password, utente);
    if (!ok) {
      mostraAvviso(boxAvviso, "Credenziali non valide.");
      return;
    }
    if (checkRicorda?.checked) {
      salvaCredenziali(identificatore);
    } else {
      rimuoviCredenzialiSalvate();
    }
    mostraSpinnerAccesso();
    bottoneSubmit?.setAttribute("disabled", "disabled");
    setTimeout(() => {
      impostaUtenteCorrente(utente);
      aggiornaStatoAuthNav();
      nascondiSpinnerAccesso();
      bottoneSubmit?.removeAttribute("disabled");
      window.location.hash = "#/home";
    }, 1100);
  });
}

const CHIAVE_RICORDA = "cc_accesso_ricorda";

function salvaCredenziali(identificatore) {
  try {
    sessionStorage.setItem(CHIAVE_RICORDA, JSON.stringify({ identificatore }));
  } catch (e) {
    // silenzioso
  }
}

function caricaCredenzialiSalvate() {
  try {
    const raw = sessionStorage.getItem(CHIAVE_RICORDA);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function rimuoviCredenzialiSalvate() {
  try {
    sessionStorage.removeItem(CHIAVE_RICORDA);
  } catch (e) {
    // silenzioso
  }
}

function mostraSpinnerAccesso() {
  const spinner = document.getElementById("loginSpinner");
  if (!spinner) return;
  spinner.classList.remove("d-none");
  spinner.setAttribute("aria-hidden", "false");
}

function nascondiSpinnerAccesso() {
  const spinner = document.getElementById("loginSpinner");
  if (!spinner) return;
  spinner.classList.add("d-none");
  spinner.setAttribute("aria-hidden", "true");
}

function mostraMessaggioPostRegistrazione() {
  try {
    const payload = sessionStorage.getItem("cc_post_signup");
    if (!payload) return;
    sessionStorage.removeItem("cc_post_signup");
    const dati = JSON.parse(payload);
    const boxAvviso = document.getElementById("avvisoLogin");
    if (boxAvviso) {
      mostraAvviso(
        boxAvviso,
        dati?.messaggio || "Account creato con successo. Accedi per continuare.",
        "success"
      );
    }
    if (dati?.identificatore) {
      document.getElementById("identificatoreLogin").value = dati.identificatore;
      document.getElementById("passwordLogin").focus();
    }
  } catch (e) {
    // ignora
  }
}
