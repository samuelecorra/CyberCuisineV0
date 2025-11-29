// Utilità generiche di UI
export function mostraAvviso(elemento, messaggio, tipo = "danger") {
  if (!elemento) return;
  elemento.textContent = messaggio;
  elemento.classList.remove("d-none", "alert-danger", "alert-success");
  elemento.classList.add(`alert-${tipo}`);
}

export function generaId(prefisso) {
  return `${prefisso}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}
