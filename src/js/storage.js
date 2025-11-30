import { CHIAVI_SALVATAGGIO } from "./costanti.js";
import { generaId } from "./ui.js";

// --------------------------
// Storage helpers
// --------------------------

// 1. Serve innanzitutto una funzione primaria per inizializzare lo storage,
// ovvero per creare le chiavi di salvataggio se non esistono già.
// In parole povere, se in localstorage non c'è ancora nulla perché è la prima volta
// che l'utente apre l'app, dobbiamo creare le chiavi con i valori iniziali corretti, ovvero vuoti.
export function inizializzaStorage() {
  if (!localStorage.getItem(CHIAVI_SALVATAGGIO.RICETTE)) {
    salvaSuStorage(CHIAVI_SALVATAGGIO.RICETTE, {});
  }
  if (!localStorage.getItem(CHIAVI_SALVATAGGIO.UTENTI)) {
    salvaSuStorage(CHIAVI_SALVATAGGIO.UTENTI, []);
  }
  if (!localStorage.getItem(CHIAVI_SALVATAGGIO.RECENSIONI)) {
    salvaSuStorage(CHIAVI_SALVATAGGIO.RECENSIONI, []);
  }
  if (!localStorage.getItem(CHIAVI_SALVATAGGIO.UTENTE_CORRENTE)) {
    salvaSuStorage(CHIAVI_SALVATAGGIO.UTENTE_CORRENTE, null);
  }
}

// 2. Serve una funzione in grado di leggere da storage in modo sicuro,
// restituendo un valore predefinito in caso di errore o chiave mancante.
// Tranquilli: Javascript fornisce già tutto il necessario per fare ciò in modo semplice,
// non dobbiamo reinventare nulla!
export function leggiDaStorage(chiave, valorePredefinito) {
  // si passa la coppia chiave/valore predefinito
  try {
    const grezzo = localStorage.getItem(chiave); // Prendiamo il valore grezzo da storage
    return grezzo ? JSON.parse(grezzo) : valorePredefinito; // Lo parsiamo se esiste, altrimenti restituiamo il valore predefinito
  } catch (errore) {
    console.error("Errore lettura storage", errore);
    return valorePredefinito; // Se tutto va bene non si arriva qui, ma in caso di errore restituiamo comunque il valore predefinito
  }
}

// 3. Serve una funzione in grado di salvare su storage in modo sicuro,
// serializzando il valore in JSON prima di salvarlo, ovvero proprio l'opposto della lettura.
export function salvaSuStorage(chiave, valore) {
  localStorage.setItem(chiave, JSON.stringify(valore));
}

// Quando otteniamo gli utenti, che possono essere tanti, uno solo o nessuno,
export function ottieniUtenti() {
  return leggiDaStorage(CHIAVI_SALVATAGGIO.UTENTI, []).map(trasformaUtenteInItaliano);
}

export function salvaUtenti(utenti) {
  salvaSuStorage(CHIAVI_SALVATAGGIO.UTENTI, utenti);
}

export function ottieniUtenteCorrente() {
  const utenteSalvato = leggiDaStorage(CHIAVI_SALVATAGGIO.UTENTE_CORRENTE, null);
  return trasformaUtenteInItaliano(utenteSalvato);
}

export function impostaUtenteCorrente(utente) {
  salvaSuStorage(CHIAVI_SALVATAGGIO.UTENTE_CORRENTE, utente);
}

// Cache ricette
export function ottieniCacheRicette() {
  return leggiDaStorage(CHIAVI_SALVATAGGIO.RICETTE, {});
}

export function salvaCacheRicette(cache) {
  salvaSuStorage(CHIAVI_SALVATAGGIO.RICETTE, cache);
}

export function memorizzaRicette(ricette = []) {
  const cache = ottieniCacheRicette();
  ricette.forEach(ricetta => {
    if (ricetta?.id) {
      cache[ricetta.id] = ricetta;
    }
  });
  salvaCacheRicette(cache);
}

// Migrazione/normalizzazione dati
export function adattaRicettaMemorizzata(ricetta) {
  if (!ricetta) return ricetta;
  if (ricetta.nome) return ricetta;
  const ingredientiConvertiti =
    ricetta.ingredienti ??
    ricetta.ingredients?.map(item => ({
      nome: item.name ?? "",
      quantita: item.measure ?? ""
    })) ??
    [];
  return {
    id: ricetta.id,
    nome: ricetta.name ?? "",
    categoria: ricetta.category ?? "N/D",
    area: ricetta.area ?? "N/D",
    istruzioni: ricetta.instructions ?? "",
    miniatura: ricetta.thumbnail ?? "",
    etichette: ricetta.tags ?? [],
    youtube: ricetta.youtube ?? "",
    fonte: ricetta.source ?? "",
    ingredienti: ingredientiConvertiti
  };
}

export function trasformaUtenteInItaliano(utente) {
  if (!utente) return utente;
  const ricettario = utente.ricettario ?? utente.cookbook ?? [];
  return {
    ...utente,
    nomeUtente: utente.nomeUtente ?? utente.username,
    nome: utente.nome ?? utente.firstName ?? "",
    cognome: utente.cognome ?? utente.lastName ?? "",
    paeseOrigine: utente.paeseOrigine ?? "",
    paeseResidenza: utente.paeseResidenza ?? "",
    ricettario: ricettario.map(voce => ({
      idRicetta: voce.idRicetta ?? voce.mealId ?? voce.idRicetta,
      nota: voce.nota ?? voce.note ?? ""
    }))
  };
}

export function trasformaRecensioneInItaliano(recensione) {
  if (!recensione) return recensione;
  return {
    ...recensione,
    idRicetta: recensione.idRicetta ?? recensione.recipeId,
    idUtente: recensione.idUtente ?? recensione.userId
  };
}

// Recensioni
export function ottieniRecensioni() {
  return leggiDaStorage(CHIAVI_SALVATAGGIO.REVIEWS, []).map(trasformaRecensioneInItaliano);
}

export function salvaRecensioni(recensioni) {
  salvaSuStorage(CHIAVI_SALVATAGGIO.REVIEWS, recensioni);
}

// Aggiorna o crea un utente nella lista utenti + sincronizza utenteCorrente se serve
export function salvaUtente(utenteAggiornato) {
  const utenti = ottieniUtenti();
  const indice = utenti.findIndex(u => u.id === utenteAggiornato.id);
  if (indice !== -1) {
    utenti[indice] = utenteAggiornato;
  } else {
    utenti.push(utenteAggiornato);
  }
  salvaUtenti(utenti);
  const utenteCorrente = ottieniUtenteCorrente();
  if (utenteCorrente && utenteCorrente.id === utenteAggiornato.id) {
    impostaUtenteCorrente(utenteAggiornato);
  }
}

export function rimuoviUtente(idUtente) {
  const restanti = ottieniUtenti().filter(utente => utente.id !== idUtente);
  salvaUtenti(restanti);
  const recensioniFiltrate = ottieniRecensioni().filter(
    recensione => recensione.idUtente !== idUtente
  );
  salvaRecensioni(recensioniFiltrate);
  const utenteCorrente = ottieniUtenteCorrente();
  if (utenteCorrente && utenteCorrente.id === idUtente) {
    impostaUtenteCorrente(null);
  }
}

// Ricettario utente
export function aggiornaRicettario(idRicetta, aggiungi) {
  const utente = ottieniUtenteCorrente();
  if (!utente) {
    window.location.hash = "#/accesso";
    return;
  }
  const ricettario = [...(utente.ricettario ?? [])];
  const indice = ricettario.findIndex(entry => entry.idRicetta === idRicetta);
  if (aggiungi && indice === -1) {
    ricettario.push({ idRicetta, nota: "" });
  }
  if (!aggiungi && indice !== -1) {
    ricettario.splice(indice, 1);
  }
  const utenteAggiornato = { ...utente, ricettario };
  salvaUtente(utenteAggiornato);
}

export function aggiornaNotaRicettario(idRicetta, nota) {
  const utente = ottieniUtenteCorrente();
  if (!utente) return;
  const ricettario = [...(utente.ricettario ?? [])];
  const indice = ricettario.findIndex(entry => entry.idRicetta === idRicetta);
  if (indice === -1) return;
  ricettario[indice] = { ...ricettario[indice], nota };
  const utenteAggiornato = { ...utente, ricettario };
  salvaUtente(utenteAggiornato);
}

// Utility per id utente/recensione se servono altrove
export function generaIdUtente() {
  return generaId("utente");
}

export function generaIdRecensione() {
  return generaId("recensione");
}
