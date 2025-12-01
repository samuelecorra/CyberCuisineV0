// MODULO DI SCRIPT ESSENZIALE PER INTERAGIRE CON LE API THEMEALDB
// - Fornisce funzioni per cercare e recuperare ricette
// - Gestisce la memorizzazione in cache delle ricette per performance
// - Fornisce funzioni per ottenere e tradurre le aree di cucina dinamiche
// - Normalizza i dati delle ricette in un formato coerente per l'app

// ============================================================================

// Importazioni necessarie
import { BASE_API } from "../costanti.js"; // Costante base URL API per The MealDB
import {
  ottieniCacheRicette, // tutte le funzioni di utility per la gestione della cache
  salvaCacheRicette
} from "../storage.js";

// Chiamata generica alle API TheMealDB
export async function interrogaApi(endpoint) {
  // Forniremo un endpoint specifico per ogni chiamata
  const risposta = await fetch(`${BASE_API}${endpoint}`); // Effettuiamo la chiamata fetch concatenando mediante template literal
  if (!risposta.ok) {
    throw new Error("Errore di rete con TheMealDB");
  }
  return risposta.json();
}

// Oltre alla funzione di interrogazione generica, definiamo qui le funzioni specifiche
// per le varie operazioni che ci servono nell'app, in modo da mantenere il codice
// organizzato e modulare.

const LETTERE_CATALOGO = "abcdefghijklmnopqrstuvwxyz".split("");

// --------------------------
// Prefetch completo del catalogo da usare localmente
// --------------------------
export async function precaricaCatalogoRicette() {
  try {
    const risposte = await Promise.all(
      LETTERE_CATALOGO.map(lettera => interrogaApi(`search.php?f=${encodeURIComponent(lettera)}`))
    );
    const ricette = risposte.flatMap(dati => normalizzaElencoRicette(dati.meals));
    const dizionario = {};
    ricette.forEach(ricetta => {
      if (ricetta?.id) {
        dizionario[ricetta.id] = ricetta;
      }
    });
    salvaCacheRicette(dizionario);
    return ordinaRicette(Object.values(dizionario));
  } catch (errore) {
    console.error("Impossibile precaricare l'intero catalogo", errore);
    return ordinaRicette(ottieniCatalogoLocale());
  }
}

function ottieniCatalogoLocale() {
  const cache = ottieniCacheRicette();
  return Object.values(cache ?? {});
}

function ordinaRicette(elenco = []) {
  return [...elenco].sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

function normalizzaTermine(valore) {
  return valore?.trim().toLowerCase() ?? "";
}

// --------------------------
// Ricerca locale sui dati prefetchati
// --------------------------
export async function cercaRicettePerNome(nome) {
  const termine = normalizzaTermine(nome);
  if (!termine) return [];
  return ordinaRicette(
    ottieniCatalogoLocale().filter(ricetta => ricetta.nome.toLowerCase().includes(termine))
  );
}

export async function cercaRicettePerLettera(lettera) {
  const iniziale = normalizzaTermine(lettera).charAt(0);
  if (!iniziale) return [];
  return ordinaRicette(
    ottieniCatalogoLocale().filter(ricetta => ricetta.nome.charAt(0)?.toLowerCase() === iniziale)
  );
}

export async function cercaRicettePerIngrediente(ingrediente) {
  const termine = normalizzaTermine(ingrediente);
  if (!termine) return [];
  return ordinaRicette(
    ottieniCatalogoLocale().filter(ricetta =>
      ricetta.ingredienti.some(ing => ing.nome.toLowerCase().includes(termine))
    )
  );
}

export async function recuperaRicettaPerId(id) {
  if (!id) return null;
  const cache = ottieniCacheRicette();
  return cache?.[id] ?? null;
}

export async function cercaRicettePerArea(area, limite = 4) {
  const chiave = normalizzaTermine(area);
  if (!chiave) return [];
  const filtrate = ottieniCatalogoLocale().filter(
    ricetta => (ricetta.areaCodice ?? "").toLowerCase() === chiave
  );
  return ordinaRicette(filtrate).slice(0, limite);
}

export function ottieniCatalogoOrdinato() {
  return ordinaRicette(ottieniCatalogoLocale());
}

// --------------------------
// Aree (dinamiche da TheMealDB)
// --------------------------
// Dopo aver definito le funzioni per le ricette, definiamo qui le funzioni
// per ottenere le aree di cucina disponibili nell'API. Queste aree sono
// dinamiche e possono cambiare man mano che chi gestisce TheMealDB aggiorna i dati,
// quindi le recuperiamo direttamente dall'API e le memorizziamo in cache per performance.
let cacheAree = null; // Cache in-memory per le aree di cucina inizialmente vuota

export async function ottieniAreeCucina() {
  if (cacheAree) {
    return cacheAree; // Se la cache è già popolata, la restituiamo direttamente
  }
  // Se invece la cache è vuota (prima chiamata), interroghiamo l'API
  const dati = await interrogaApi("list.php?a=list"); // Endpoint per ottenere le aree di cucina
  const aree = (dati.meals ?? []) // dati.meals è un array di oggetti con proprietà strArea, ovvero il nome in inglese dell'area:
    // A questo array applichiamo prima ?? che è un operatore di coalescenza nullish per assicurarci che
    // in caso di risposta vuota o nulla otteniamo un array vuoto invece di null o undefined.

    .map(item => item.strArea?.trim()) // Dopodiché mappiamo l'array per estrarre solo i nomi delle aree, usando ?. per sicurezza
    .filter(Boolean) // Filtriamo per rimuovere eventuali valori null, undefined o stringhe vuote
    .map(nomeEn => ({
      // Dopodiché trasformiamo ogni nome in un oggetto con nomeEn, nomeIt ed emoji:
      nomeEn,
      nomeIt: traduciAreaEnIt(nomeEn),
      emoji: emojiPerArea(nomeEn)
    }))
    .sort((a, b) => a.nomeIt.localeCompare(b.nomeIt, "it")); // Infine ordiniamo l'elenco in ordine alfabetico basato sul nome in italiano, così
  // da non dover sopportare la fastidiosa e incoerente organizzazione data da TheMealDB, che è casuale e non localizzata.
  cacheAree = aree;
  return aree;
}

// Queste due funzioni sono usate nella soprastante ottieniAreeCucina per arricchire
// i dati delle aree con emoji e traduzioni in italiano.
export function emojiPerArea(nomeEn) {
  return EMOJI_AREE[nomeEn?.toLowerCase()] ?? "🌐"; //
}

export function traduciAreaEnIt(nomeEn) {
  if (!nomeEn) return "Non specificata";
  const key = nomeEn.toLowerCase();
  return TRADUZIONI_AREE[key] ?? nomeEn;
}

// Mappature statiche per emoji e traduzioni delle aree di cucina (aggiornate a novembre 2025 e aggiornabili se TheMealDB ne aggiunge di nuove)
const EMOJI_AREE = {
  british: "🇬🇧",
  american: "🇺🇸",
  french: "🇫🇷",
  canadian: "🇨🇦",
  jamaican: "🇯🇲",
  chinese: "🇨🇳",
  dutch: "🇳🇱",
  egyptian: "🇪🇬",
  greek: "🇬🇷",
  indian: "🇮🇳",
  irish: "🇮🇪",
  italian: "🇮🇹",
  japanese: "🇯🇵",
  kenyan: "🇰🇪",
  malaysian: "🇲🇾",
  mexican: "🇲🇽",
  moroccan: "🇲🇦",
  croatian: "🇭🇷",
  norwegian: "🇳🇴",
  portuguese: "🇵🇹",
  russian: "🇷🇺",
  argentinian: "🇦🇷",
  spanish: "🇪🇸",
  slovakian: "🇸🇰",
  thai: "🇹🇭",
  "saudi arabian": "🇸🇦",
  vietnamese: "🇻🇳",
  turkish: "🇹🇷",
  syrian: "🇸🇾",
  algerian: "🇩🇿",
  tunisian: "🇹🇳",
  polish: "🇵🇱",
  filipino: "🇵🇭",
  ukrainian: "🇺🇦",
  uruguayan: "🇺🇾",
  australian: "🇦🇺",
  venezulan: "🇻🇪"
};

const TRADUZIONI_AREE = {
  british: "Regno Unito",
  american: "Stati Uniti",
  french: "Francia",
  canadian: "Canada",
  jamaican: "Giamaica",
  chinese: "Cina",
  dutch: "Paesi Bassi",
  egyptian: "Egitto",
  greek: "Grecia",
  indian: "India",
  irish: "Irlanda",
  italian: "Italia",
  japanese: "Giappone",
  kenyan: "Kenya",
  malaysian: "Malesia",
  mexican: "Messico",
  moroccan: "Marocco",
  croatian: "Croazia",
  norwegian: "Norvegia",
  portuguese: "Portogallo",
  russian: "Russia",
  argentinian: "Argentina",
  spanish: "Spagna",
  slovakian: "Slovacchia",
  thai: "Thailandia",
  "saudi arabian": "Arabia Saudita",
  vietnamese: "Vietnam",
  turkish: "Turchia",
  syrian: "Siria",
  algerian: "Algeria",
  tunisian: "Tunisia",
  polish: "Polonia",
  filipino: "Filippine",
  ukrainian: "Ucraina",
  uruguayan: "Uruguay",
  australian: "Australia",
  venezulan: "Venezuela"
};

// Funzione per accorpare sia emoji che traduzione in un'unica stringa descrittiva - usata in fase di registrazione utente
export function descriviArea(nomeEn) {
  return `${emojiPerArea(nomeEn)} ${traduciAreaEnIt(nomeEn)}`;
}

// ===========================================================================

// Serve una funzione per normalizzare un elenco di ricette: infatti ThemealDB
// potrebbe restituire null se non trova nulla, quindi gestiamo questo caso
// restituendo un array vuoto. Altrimenti, normalizziamo ogni ricetta
// usando la funzione apposita.
export function normalizzaElencoRicette(ricetteRaw) {
  if (!ricetteRaw) return []; // ricetteRaw è un array
  return ricetteRaw.map(normalizzaRicetta); // Usiamo la funzione definita qui sotto per normalizzare ogni ricetta
  // mediante map, che applica la funzione a ogni elemento dell'array e restituisce un nuovo array con i risultati.
}

// Ecco la suddetta funzione di normalizzazione per una singola ricetta:
export function normalizzaRicetta(datiRicetta) {
  const ingredienti = []; // Di una singola ricetta ci interessano gli ingredienti e le loro quantità,
  // che in TheMealDB sono distribuiti su 20 coppie di proprietà strIngredientX e strMeasureX.
  // Quindi cicliamo da 1 a 20 per estrarli tutti:
  for (let i = 1; i <= 20; i += 1) {
    const ingrediente = datiRicetta[`strIngredient${i}`];
    const quantita = datiRicetta[`strMeasure${i}`];
    if (ingrediente && ingrediente.trim()) {
      // Se l'ingrediente esiste e non è una stringa vuota, lo aggiungiamo all'elenco
      ingredienti.push({
        nome: ingrediente.trim(),
        quantita: quantita?.trim() ?? ""
      });
    }
  }

  const areaOriginale = datiRicetta.strArea ?? "N/D";

  return {
    id: datiRicetta.idMeal, // id univoco della ricetta
    nome: datiRicetta.strMeal, // il suo nome (non lo traduciamo per pietà sarebbe un lavorone per 500+ ricette, tutto da hardcodare...)
    categoria: datiRicetta.strCategory ?? "N/D", // categoria della ricetta (anche qui non traduciamo)
    area: traduciAreaEnIt(areaOriginale), // L'area viene tradotta per una resa localizzata nelle card e nei dettagli
    areaCodice: areaOriginale, // Conserviamo anche il valore originale (in inglese) per i filtri logici
    istruzioni: datiRicetta.strInstructions ?? "Istruzioni non disponibili", // istruzioni di preparazione (intraducibili, sarebbe un lavorone)
    miniatura: datiRicetta.strMealThumb ?? "", // URL dell'immagine in miniatura
    etichette: datiRicetta.strTags ? datiRicetta.strTags.split(",").map(tag => tag.trim()) : [], // etichette/tags come array
    youtube: datiRicetta.strYoutube ?? "", // URL del video YouTube
    fonte: datiRicetta.strSource ?? "", // Fonte della ricetta
    ingredienti // ingredienti e relative quantità
  };
}
