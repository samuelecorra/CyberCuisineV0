// ============================================================================
//  UTILITÀ GENERICHE DI UI
// ============================================================================

// Mostra un box di avviso Bootstrap (alert) dentro `elemento`, con testo e tipo dati.
// Rimuove prima le classi precedenti così lo stesso box può passare da errore (danger) a successo.
// Per gli alert di errore (danger) fa automaticamente scrollIntoView: l'utente potrebbe aver scrollato
// lontano dal box (es. form lunghi come la registrazione) e senza scroll non vederebbe mai il messaggio.
// Per i messaggi di successo lo scroll è disattivato perché l'utente è già nel punto giusto.
export function mostraAvviso(elemento, messaggio, tipo = "danger") {
  if (!elemento) return;
  elemento.textContent = messaggio;
  elemento.classList.remove("d-none", "alert-danger", "alert-success");
  elemento.classList.add(`alert-${tipo}`);
  if (tipo === "danger") {
    // Piccolo delay per lasciar concludere eventuali animazioni CSS prima dello scroll
    setTimeout(() => elemento.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }
}

// Genera un id testuale ragionevolmente univoco: "<prefisso>_<timestamp>_<numero casuale>".
// Sufficiente per un'app single-user su un solo browser (non è un UUID crittografico).
export function generaId(prefisso) {
  return `${prefisso}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}
