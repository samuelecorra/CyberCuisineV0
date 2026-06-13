// ============================================================================
//  COSTANTI GLOBALI + MAPPA DEL WEB STORAGE
// ============================================================================
// Questo file è il punto di riferimento per capire DOVE l'app salva i dati.
// Tutta la persistenza avviene nel "web storage" del browser, in formato JSON,
// come richiesto dalla specifica.
//
// >>> COME ISPEZIONARLO DURANTE LA DEMO (DevTools) <<<
//   1. Premi F12 (o tasto destro → Ispeziona) per aprire i DevTools.
//   2. Vai sulla scheda "Application" (Chrome/Edge) oppure "Archiviazione" (Firefox).
//   3. Nel pannello a sinistra apri "Local Storage" → l'origine del sito (es. http://127.0.0.1:5500).
//   4. Vedrai le chiavi elencate sotto (users, session, recipes:cache, ...).
//   5. "Session Storage" (sempre a sinistra) contiene invece la chiave temporanea "cc_post_signup"
//      (messaggio one-shot registrazione→login), visibile solo subito dopo una registrazione.
//   Suggerimento: tieni il pannello aperto e clicca le chiavi MENTRE esegui login/logout per
//   vedere i valori cambiare in tempo reale (a volte serve ricliccare la chiave per rinfrescare).

// Versione dello schema dati salvato in localStorage. Se in futuro cambiamo la forma dei dati,
// incrementando questo numero possiamo far partire una migrazione controllata (vedi storage.js).
export const SCHEMA_VERSION = 2;

// --- Chiavi del LOCAL STORAGE (persistenti: sopravvivono alla chiusura del browser) ---
export const CHIAVI_SALVATAGGIO = {
  APP_META: "app:meta", // { schemaVersion, lastInitAt, apiCacheInfo } → metadati app + info cache
  USERS: "users", // array di utenti registrati { id, username, email, passwordHash, salt, ... }
  SESSION: "session", // { currentUserId, loginAt } → CHI è loggato adesso (cuore dell'auth)
  RECIPES_CACHE: "recipes:cache", // { updatedAt, byId } → catalogo TheMealDB scaricato allo startup
  AREAS_CACHE: "areas:cache" // { updatedAt, items } → elenco aree/paesi (per le select)
  // Esistono inoltre due famiglie di chiavi "per entità", create dinamicamente (vedi storage.js):
  //   cookbook:<idUtente>  → ricettario personale di quell'utente { recipeIds, notesByRecipeId }
  //   reviews:<idRicetta>  → recensioni di quella ricetta [ { id, userId, cookedAt, difficulty, taste } ]
};

// Vecchie chiavi usate da versioni precedenti dell'app. Servono solo alla migrazione una-tantum
// in storage.js (i dati legacy vengono convertiti al nuovo schema e poi queste chiavi rimosse).
export const CHIAVI_LEGACY = {
  RICETTE: "ricette_cybercuisine",
  UTENTI: "utenti_cybercuisine",
  UTENTE_CORRENTE: "utente_corrente_cybercuisine",
  RECENSIONI: "recensioni_cybercuisine"
};

// URL base delle API REST pubbliche di TheMealDB (chiave demo "1"). Tutti gli endpoint vi si concatenano.
export const BASE_API = "https://www.themealdb.com/api/json/v1/1/";
