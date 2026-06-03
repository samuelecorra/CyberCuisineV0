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
  salvaCacheRicette,
  ottieniMetaApp,
  aggiornaCacheInfoRicette,
  ottieniCacheAree,
  salvaCacheAree
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

// L'intero catalogo di TheMealDB si ricostruisce interrogando l'endpoint search.php?f=<lettera>
// per ogni lettera dell'alfabeto (A-Z): ogni chiamata restituisce tutte le ricette il cui nome
// inizia con quella lettera. Unendo i 26 risultati otteniamo il catalogo completo (~300 ricette).
const LETTERE_CATALOGO = "abcdefghijklmnopqrstuvwxyz".split("");

// TTL (Time To Live) della cache del catalogo, in ore.
// La specifica (PDF, pag. 3) chiede che ALLO STARTUP i dati siano scaricati dalle API e
// memorizzati nel web storage. Noi li scarichiamo una volta, li salviamo in localStorage
// (chiave "recipes:cache") e li riusiamo ai riavvii successivi finché non scadono: dopo 72h il
// prossimo avvio riscarica il catalogo aggiornato. È una scelta implementativa documentata che
// evita 26 chiamate di rete a ogni reload pur restando fedele al requisito di startup.
const TTL_CACHE_ORE = 72;

// --------------------------
// Precaricamento del catalogo COMPLETO (invocato allo STARTUP da main.js)
// --------------------------
// Requisito di specifica (PDF, pag. 3): «Allo startup dell'applicazione, tutti i dati necessari
// (in formato JSON) devono essere scaricati dalle API di TheMealDB, memorizzati nel web storage,
// e visualizzati nell'applicazione web.» Questa funzione realizza esattamente quel flusso:
//   1) se in localStorage esiste già un catalogo completo e non scaduto, lo riusa (zero rete);
//   2) altrimenti scarica A-Z dalle API, normalizza, indicizza per id e salva in "recipes:cache".
// È usata sia all'avvio (main.js) sia dal pulsante "Sfoglia l'intero catalogo" (vista Esplora).
export async function precaricaCatalogoCompleto() {
  const cache = ottieniCacheRicette();
  const infoCache = ottieniMetaApp()?.apiCacheInfo?.recipes ?? {};
  const cacheValida =
    Object.keys(cache).length > 0 &&
    infoCache.complete &&
    !cacheScaduta(infoCache.lastFetchAt, infoCache.ttlHours ?? TTL_CACHE_ORE);

  // DEVTOOLS (per la demo): F12 → Application → Local Storage → chiave "recipes:cache".
  // Al PRIMISSIMO avvio è vuota ({ updatedAt:null, byId:{} }); dopo questa funzione contiene
  // l'intero catalogo dentro byId. La ricerca per nome/ingrediente/lettera lavora su questa cache.
  if (cacheValida) {
    return ordinaRicette(Object.values(cache));
  }

  try {
    const ricette = await scaricaRicettePerLettere(LETTERE_CATALOGO); // 26 fetch in parallelo
    const dizionario = indicizzaRicette(ricette);
    salvaCacheRicette(dizionario); // <-- SCRITTURA nel web storage (localStorage "recipes:cache")
    aggiornaCacheInfoRicette({
      strategy: "full",
      lastFetchAt: new Date().toISOString(),
      ttlHours: TTL_CACHE_ORE,
      complete: true
    });
    return ordinaRicette(Object.values(dizionario));
  } catch (errore) {
    // Se la rete fallisce (es. offline al primo avvio) restituiamo ciò che è già in cache:
    // l'app resta navigabile anche senza catalogo completo.
    console.error("Impossibile precaricare l'intero catalogo", errore);
    return ordinaRicette(ottieniCatalogoLocale());
  }
}

// Scarica le ricette per un insieme di lettere e le unisce in un unico array normalizzato.
// Promise.all parallelizza le richieste: 26 chiamate concorrenti invece che sequenziali (più veloce).
async function scaricaRicettePerLettere(lettere) {
  const risposte = await Promise.all(
    lettere.map(lettera => interrogaApi(`search.php?f=${encodeURIComponent(lettera)}`))
  );
  // flatMap: ogni risposta è un array di ricette; le "appiattiamo" in un'unica lista.
  return risposte.flatMap(dati => normalizzaElencoRicette(dati.meals));
}

// Trasforma un array di ricette in un dizionario { id: ricetta } per lookup O(1) per id
// e per deduplica automatica (stesso id => stessa chiave => una sola voce).
function indicizzaRicette(ricette) {
  const dizionario = {};
  ricette.forEach(ricetta => {
    if (ricetta?.id) {
      dizionario[ricetta.id] = ricetta;
    }
  });
  return dizionario;
}

// Determina se la cache è scaduta confrontando il timestamp dell'ultimo fetch con il TTL.
function cacheScaduta(lastFetchAt, ttlHours) {
  if (!lastFetchAt) return true;
  const last = new Date(lastFetchAt).getTime();
  if (Number.isNaN(last)) return true;
  const ms = Date.now() - last;
  const ttlMs = (ttlHours ?? TTL_CACHE_ORE) * 60 * 60 * 1000;
  return ms > ttlMs;
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
// Ricerca LOCALE sui dati già scaricati (macro-scenario "ricerca di ricette culinarie")
// --------------------------
// SCELTA IMPLEMENTATIVA: poiché allo startup l'intero catalogo è già in localStorage, la ricerca
// non rifà chiamate di rete ma FILTRA la cache locale → risultati istantanei e funzionamento offline.
// La specifica chiede ricerca per nome del piatto, ingredienti o lettera iniziale: ecco le tre funzioni.

// Ricerca per NOME: match "contiene" (case-insensitive) sul nome del piatto.
export async function cercaRicettePerNome(nome) {
  const termine = normalizzaTermine(nome);
  if (!termine) return [];
  return ordinaRicette(
    ottieniCatalogoLocale().filter(ricetta => ricetta.nome.toLowerCase().includes(termine))
  );
}

// Ricerca per LETTERA INIZIALE: confronta solo il primo carattere del nome.
export async function cercaRicettePerLettera(lettera) {
  const iniziale = normalizzaTermine(lettera).charAt(0);
  if (!iniziale) return [];
  return ordinaRicette(
    ottieniCatalogoLocale().filter(ricetta => ricetta.nome.charAt(0)?.toLowerCase() === iniziale)
  );
}

// Ricerca per INGREDIENTE: vera se almeno un ingrediente della ricetta contiene il termine.
export async function cercaRicettePerIngrediente(ingrediente) {
  const termine = normalizzaTermine(ingrediente);
  if (!termine) return [];
  return ordinaRicette(
    ottieniCatalogoLocale().filter(ricetta =>
      ricetta.ingredienti.some(ing => ing.nome.toLowerCase().includes(termine))
    )
  );
}

// Recupera una ricetta per id. Prima guarda la cache locale (caso normale, dato che il catalogo è
// precaricato); se per qualche motivo manca (cache svuotata, link diretto a #/ricetta/<id>) fa da
// FALLBACK la chiamata lookup.php?i=<id> all'API e memorizza il risultato in cache per le volte dopo.
export async function recuperaRicettaPerId(id) {
  if (!id) return null;
  const cache = ottieniCacheRicette();
  if (cache?.[id]) {
    return cache[id]; // hit di cache: nessuna rete
  }
  try {
    const dati = await interrogaApi(`lookup.php?i=${encodeURIComponent(id)}`);
    const ricetta = normalizzaElencoRicette(dati.meals)[0] ?? null;
    if (ricetta?.id) {
      salvaCacheRicette({ ...cache, [ricetta.id]: ricetta }); // aggiungiamo la ricetta alla cache
      aggiornaCacheInfoRicette({ lastFetchAt: new Date().toISOString() });
    }
    return ricetta;
  } catch (errore) {
    console.error("Impossibile recuperare la ricetta", errore);
    return null;
  }
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
// Aree/paesi selezionabili (registrazione e profilo)
// --------------------------
// SCELTA IMPLEMENTATIVA IMPORTANTE: NON usiamo l'endpoint list.php?a=list, che restituisce ~195
// demonimi (es. "Afghan", "Caymanian") quasi tutti SENZA ricette nel catalogo. Ricaviamo invece le
// aree dalle ricette EFFETTIVAMENTE scaricate (~37 cucine reali). Vantaggi:
//   - ogni paese selezionabile produce davvero risultati nella "home loggata";
//   - niente lunghe liste di voci inutili con la bandiera "globo" di fallback;
//   - ogni area ha bandiera (emoji) + nome tradotto in italiano (vedi mappe in fondo al file).
let cacheAree = null; // cache in-memory per la sessione corrente (evita di ricalcolare a ogni form)

export async function ottieniAreeCucina() {
  if (cacheAree) {
    return cacheAree; // già calcolate in questa sessione
  }
  // Riusiamo la cache su localStorage SOLO se generata con questa logica (flag derivedFromCatalog):
  // così un'eventuale vecchia cache (i 195 paesi della versione precedente) viene rigenerata da sola.
  const cacheLocale = ottieniCacheAree();
  if (cacheLocale?.derivedFromCatalog && cacheLocale.items?.length) {
    cacheAree = cacheLocale.items;
    return cacheAree;
  }
  const aree = areeDalCatalogo();
  cacheAree = aree;
  salvaCacheAree(aree); // memorizza in "areas:cache" con il flag derivedFromCatalog
  return aree;
}

// Estrae le aree DISTINTE presenti nel catalogo locale e le arricchisce con nome italiano ed emoji
// bandiera, ordinandole alfabeticamente per nome italiano (localeCompare con locale "it").
function areeDalCatalogo() {
  const catalogo = ottieniCatalogoLocale();
  const codici = [...new Set(catalogo.map(ricetta => ricetta.areaCodice).filter(Boolean))];
  return codici
    .map(nomeEn => ({
      nomeEn, // codice/area originale di TheMealDB (usato per filtrare le ricette)
      nomeIt: traduciAreaEnIt(nomeEn), // etichetta localizzata mostrata all'utente
      emoji: emojiPerArea(nomeEn) // bandiera (resa correttamente grazie al webfont, vedi base.css)
    }))
    .sort((a, b) => a.nomeIt.localeCompare(b.nomeIt, "it"));
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
  venezulan: "🇻🇪",
  // TheMealDB è incoerente: per alcune cucine usa il nome del PAESE invece dell'aggettivo.
  // Aggiungiamo queste forme così tutte le ~37 aree reali del catalogo hanno bandiera e traduzione.
  argentina: "🇦🇷",
  france: "🇫🇷",
  india: "🇮🇳",
  netherlands: "🇳🇱",
  norway: "🇳🇴",
  slovakia: "🇸🇰",
  "united states": "🇺🇸",
  venezuela: "🇻🇪"
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
  venezulan: "Venezuela",
  // Forme "nome del paese" usate da TheMealDB per alcune cucine (vedi nota in EMOJI_AREE).
  argentina: "Argentina",
  france: "Francia",
  india: "India",
  netherlands: "Paesi Bassi",
  norway: "Norvegia",
  slovakia: "Slovacchia",
  "united states": "Stati Uniti",
  venezuela: "Venezuela"
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
