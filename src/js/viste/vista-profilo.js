import {
  ottieniUtenteCorrente,
  salvaUtente,
  rimuoviUtente,
  ottieniRecensioni
} from "../storage.js";
import { mostraAvviso } from "../ui.js";
import { gestisciLogout } from "../navbar.js";
import { ottieniAreeCucina } from "../gestione-api/api.js";
import { creaCredenzialiPassword, verificaPassword } from "../auth.js";

export function inizializzaVistaProfilo() {
  const utente = ottieniUtenteCorrente();
  if (!utente) {
    window.location.hash = "#/accesso";
    return;
  }

  const form = document.getElementById("formProfilo");
  const avvisoSuccessoProfilo = document.getElementById("avvisoProfiloSuccesso");
  const avvisoErroreProfilo = document.getElementById("avvisoProfiloErrore");
  const bottoneLogout = document.getElementById("bottoneLogout");
  const bottoneElimina = document.getElementById("bottoneEliminaProfilo");
  const bottoneModifica = document.getElementById("bottoneModificaProfilo");
  const bottoneSalva = document.getElementById("bottoneSalvaProfilo");
  const modal = document.getElementById("modalPassword");
  const chiudiModal = document.getElementById("chiudiModalPassword");
  const annullaModal = document.getElementById("annullaModalPassword");
  const confermaModal = document.getElementById("confermaModalPassword");
  const campoPasswordModal = document.getElementById("passwordConfermaProfilo");
  const erroreModal = document.getElementById("erroreModalPassword");

  mostraInfoProfilo(utente);
  popolaSelectAree(utente);
  compilaForm(utente);
  setCampiAbilitati(false);

  bottoneModifica?.addEventListener("click", () => {
    mostraModalPassword();
  });

  confermaModal?.addEventListener("click", async () => {
    const pwd = campoPasswordModal.value;
    const ok = await verificaPassword(pwd, utente);
    if (!ok) {
      erroreModal.textContent = "Password errata.";
      erroreModal.classList.remove("d-none");
      return;
    }
    erroreModal.classList.add("d-none");
    campoPasswordModal.value = "";
    nascondiModalPassword();
    setCampiAbilitati(true);
    bottoneModifica.classList.add("d-none");
    bottoneSalva.classList.remove("d-none");
  });

  chiudiModal?.addEventListener("click", nascondiModalPassword);
  annullaModal?.addEventListener("click", nascondiModalPassword);

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const profiloAggiornato = raccogliProfilo(utente);
    if (!profiloAggiornato.email || !profiloAggiornato.nome || !profiloAggiornato.cognome) {
      mostraAvviso(avvisoErroreProfilo, "Compila tutti i campi obbligatori.");
      return;
    }
    const nuovaPassword = document.getElementById("passwordProfilo").value.trim();
    if (nuovaPassword) {
      if (nuovaPassword.length < 6) {
        mostraAvviso(avvisoErroreProfilo, "La password deve contenere almeno 6 caratteri.");
        return;
      }
      const credenziali = await creaCredenzialiPassword(nuovaPassword);
      profiloAggiornato.passwordHash = credenziali.passwordHash;
      profiloAggiornato.salt = credenziali.salt;
    }
    profiloAggiornato.updatedAt = new Date().toISOString();
    salvaUtente(profiloAggiornato);
    mostraInfoProfilo(profiloAggiornato);
    mostraAvviso(avvisoSuccessoProfilo, "Profilo aggiornato con successo.", "success");
    setCampiAbilitati(false);
    bottoneSalva.classList.add("d-none");
    bottoneModifica.classList.remove("d-none");
    document.getElementById("passwordProfilo").value = "";
  });

  bottoneElimina?.addEventListener("click", () => {
    const confermaEliminazione = confirm("Sei sicuro di voler eliminare il profilo?");
    if (!confermaEliminazione) return;
    rimuoviUtente(utente.id);
    gestisciLogout();
  });

  function setCampiAbilitati(attivo) {
    form.querySelectorAll("input, select").forEach(el => {
      if (el.id === "passwordConfermaProfilo") return;
      el.disabled = !attivo;
    });
  }

  function mostraModalPassword() {
    modal.classList.remove("d-none");
  }

  function nascondiModalPassword() {
    modal.classList.add("d-none");
    erroreModal?.classList.add("d-none");
    campoPasswordModal.value = "";
  }
}

export function mostraInfoProfilo(utente) {
  const contenitoreProfilo = document.getElementById("infoProfilo");
  const conteggioRicettario = utente.ricettario?.length ?? 0;
  const conteggioRecensioni = ottieniRecensioni().filter(
    recensione => recensione.idUtente === utente.id
  ).length;
  contenitoreProfilo.innerHTML = `
        <div class="row g-3 align-items-center">
            <div class="col-md-6">
                <p class="mb-1"><strong>Ricette salvate:</strong> ${conteggioRicettario}</p>
            </div>
            <div class="col-md-6 text-md-end">
                <a class="btn btn-contorno-accento" href="#/ricettario">Vedi</a>
            </div>
            <div class="col-md-6">
                <p class="mb-1"><strong>Recensioni scritte:</strong> ${conteggioRecensioni}</p>
            </div>
            <div class="col-md-6 text-md-end">
                <a class="btn btn-contorno-accento" href="#/recensioni">Vedi</a>
            </div>
        </div>
    `;
}

function compilaForm(utente) {
  document.getElementById("nomeProfilo").value = utente.nome ?? "";
  document.getElementById("cognomeProfilo").value = utente.cognome ?? "";
  document.getElementById("emailProfilo").value = utente.email ?? "";
  document.getElementById("paeseOrigineProfilo").value = utente.paeseOrigine ?? "";
  document.getElementById("paeseResidenzaProfilo").value = utente.paeseResidenza ?? "";
  document.getElementById("piattiPreferitiProfilo").value =
    (utente.favoriteDishes ?? []).join(", ");
  document.getElementById("passwordProfilo").value = "";
}

function raccogliProfilo(utente) {
  const piattiPreferitiRaw = document.getElementById("piattiPreferitiProfilo").value.trim();
  return {
    ...utente,
    nome: document.getElementById("nomeProfilo").value.trim(),
    cognome: document.getElementById("cognomeProfilo").value.trim(),
    email: document.getElementById("emailProfilo").value.trim(),
    paeseOrigine: document.getElementById("paeseOrigineProfilo").value.trim(),
    paeseResidenza: document.getElementById("paeseResidenzaProfilo").value.trim(),
    favoriteDishes: normalizzaPreferiti(piattiPreferitiRaw)
  };
}

function popolaSelectAree(utente) {
  ottieniAreeCucina().then(elenco => {
    const selectOrigine = document.getElementById("paeseOrigineProfilo");
    const selectResidenza = document.getElementById("paeseResidenzaProfilo");
    if (!selectOrigine || !selectResidenza) return;
    const opzioni = ['<option value="">Seleziona un paese</option>']
      .concat(
        elenco.map(
          area =>
            `<option value="${area.nomeEn}">${area.emoji} ${area.nomeIt} (${area.nomeEn})</option>`
        )
      )
      .join("");
    selectOrigine.innerHTML = opzioni;
    selectResidenza.innerHTML = opzioni;
    selectOrigine.value = utente.paeseOrigine ?? "";
    selectResidenza.value = utente.paeseResidenza ?? "";
  });
}

function normalizzaPreferiti(valore) {
  if (!valore) return [];
  return valore
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}
