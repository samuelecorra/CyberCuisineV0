// ============================================================================
//  STATO GLOBALE IN-MEMORY (volatile)
// ============================================================================
// Piccolo "store" condiviso tra i moduli. NON è persistente: vive solo in RAM e si azzera a ogni
// refresh (a differenza del web storage). Serve per dati di sessione di lavoro, non di dominio.
export const statoApp = {
  cacheFrammenti: {}, // HTML dei frammenti già scaricati via fetch, per non riscaricarli a ogni navigazione
  risultatiRicerca: [], // ultimi risultati di ricerca in Esplora (per ripristinarli tornando sulla vista)
  catalogoCompleto: [], // riferimento al catalogo ordinato (comodità; la fonte di verità è "recipes:cache")
  percorsoAttivo: "#/home", // hash della rotta attualmente mostrata
  modalitaEsplora: "search" // "search" (risultati ricerca) oppure "catalogo" (sfoglia tutto)
};
