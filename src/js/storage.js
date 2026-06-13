import { CHIAVI_SALVATAGGIO, CHIAVI_LEGACY, SCHEMA_VERSION } from "./costanti.js";
import { generaId } from "./ui.js";
import { creaCredenzialiPassword } from "./auth.js";

const PREFIX_COOKBOOK = "cookbook:";
const PREFIX_REVIEWS = "reviews:";

// --------------------------
// Storage helpers
// --------------------------
export function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (errore) {
    console.error("Errore lettura storage", errore);
    return fallback;
  }
}

export function load(key, fallback) {
  return safeParse(localStorage.getItem(key), fallback);
}

export function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function update(key, updater, fallback) {
  const current = load(key, fallback);
  const next = updater(current);
  save(key, next);
  return next;
}

export function remove(key) {
  localStorage.removeItem(key);
}

// Costruttori delle chiavi "per entità": ogni utente ha la SUA chiave ricettario e ogni ricetta
// la SUA chiave recensioni. Namespacing così le entità non si pestano i piedi nel Local Storage.
// Esempi: "cookbook:utente_1736_42" oppure "reviews:52772".
export function chiaveRicettarioUtente(idUtente) {
  return `${PREFIX_COOKBOOK}${idUtente}`;
}

export function chiaveRecensioniRicetta(idRicetta) {
  return `${PREFIX_REVIEWS}${idRicetta}`;
}

// --------------------------
// Init + migrazioni schema
// --------------------------
// Eseguita allo startup (e quindi a OGNI refresh/F5 della pagina). È IDEMPOTENTE: crea le chiavi
// solo se mancano (vedi i guard `if (!localStorage.getItem(...))`), quindi NON azzera i dati esistenti.
//
// >>> FLUSSO DI "REFRESH" (domanda tipica del prof) <<<
// Quando ricarichi la pagina, "session" è già in Local Storage: questa init non la tocca, perciò
// ottieniUtenteCorrente() la rilegge e resti LOGGATO senza dover rifare il login. È la differenza
// pratica tra Local Storage (persistente tra refresh e riaperture del browser) e Session Storage:
// la chiave temporanea "cc_post_signup" (messaggio registrazione→login) sopravvive a un eventuale
// refresh ma muore alla chiusura della scheda, mentre "session" su Local Storage resta sempre.
export async function inizializzaStorage() {
  await migraSeNecessario();

  const now = new Date().toISOString();
  const meta = load(CHIAVI_SALVATAGGIO.APP_META, null);
  if (!meta) {
    save(CHIAVI_SALVATAGGIO.APP_META, {
      schemaVersion: SCHEMA_VERSION,
      lastInitAt: now,
      apiCacheInfo: {}
    });
  } else {
    save(CHIAVI_SALVATAGGIO.APP_META, {
      ...meta,
      schemaVersion: SCHEMA_VERSION,
      lastInitAt: now
    });
  }

  if (!localStorage.getItem(CHIAVI_SALVATAGGIO.USERS)) {
    save(CHIAVI_SALVATAGGIO.USERS, []);
  }
  if (!localStorage.getItem(CHIAVI_SALVATAGGIO.SESSION)) {
    save(CHIAVI_SALVATAGGIO.SESSION, { currentUserId: null, loginAt: null });
  }
  if (!localStorage.getItem(CHIAVI_SALVATAGGIO.RECIPES_CACHE)) {
    save(CHIAVI_SALVATAGGIO.RECIPES_CACHE, { updatedAt: null, byId: {} });
  }
  if (!localStorage.getItem(CHIAVI_SALVATAGGIO.AREAS_CACHE)) {
    save(CHIAVI_SALVATAGGIO.AREAS_CACHE, { updatedAt: null, items: [] });
  }
}

// Migrazione "una tantum": se i metadati non sono allo schema corrente, convertiamo gli eventuali
// dati di una vecchia versione dell'app al nuovo formato. È trasparente per l'utente e non distrugge
// nulla: legge le vecchie chiavi, riscrive nei nuovi formati e infine rimuove le vecchie.
async function migraSeNecessario() {
  const meta = load(CHIAVI_SALVATAGGIO.APP_META, null);
  if (meta?.schemaVersion === SCHEMA_VERSION) return; // già aggiornato → niente da fare
  await migraLegacy();
}

async function migraLegacy() {
  const legacyUsers = load(CHIAVI_LEGACY.UTENTI, []);
  const legacyCurrent = load(CHIAVI_LEGACY.UTENTE_CORRENTE, null);
  const legacyRecipes = load(CHIAVI_LEGACY.RICETTE, {});
  const legacyReviews = load(CHIAVI_LEGACY.RECENSIONI, null);
  const legacyUndefined = load("undefined", null);
  const now = new Date().toISOString();

  if (legacyRecipes && Object.keys(legacyRecipes).length > 0) {
    save(CHIAVI_SALVATAGGIO.RECIPES_CACHE, { updatedAt: now, byId: legacyRecipes });
  }

  if (Array.isArray(legacyUsers) && legacyUsers.length > 0) {
    const utentiNuovi = [];
    for (const utente of legacyUsers) {
      const username = utente.username ?? utente.nomeUtente ?? "";
      const email = utente.email ?? "";
      const firstName = utente.firstName ?? utente.nome ?? "";
      const lastName = utente.lastName ?? utente.cognome ?? "";
      const originCountry = utente.originCountry ?? utente.paeseOrigine ?? "";
      const residenceCountry = utente.residenceCountry ?? utente.paeseResidenza ?? "";
      const favoriteDishes = normalizzaPreferiti(
        utente.favoriteDishes ?? utente.piattiPreferiti ?? utente.favorites ?? []
      );

      let passwordHash = utente.passwordHash ?? null;
      let salt = utente.salt ?? null;
      if (!passwordHash || !salt) {
        const credenziali = await creaCredenzialiPassword(utente.password ?? "");
        passwordHash = credenziali.passwordHash;
        salt = credenziali.salt;
      }

      const idUtente = utente.id ?? generaId("utente");
      utentiNuovi.push({
        id: idUtente,
        username,
        email,
        passwordHash,
        salt,
        createdAt: utente.createdAt ?? now,
        updatedAt: utente.updatedAt ?? now,
        firstName,
        lastName,
        originCountry,
        residenceCountry,
        favoriteDishes
      });

      const ricettarioLegacy = utente.ricettario ?? utente.cookbook ?? [];
      const recipeIds = [];
      const notesByRecipeId = {};
      ricettarioLegacy.forEach(entry => {
        const idRicetta = entry.idRicetta ?? entry.mealId ?? entry.id;
        if (!idRicetta) return;
        if (!recipeIds.includes(idRicetta)) {
          recipeIds.push(idRicetta);
        }
        const nota = entry.nota ?? entry.note ?? "";
        if (nota) {
          notesByRecipeId[idRicetta] = nota;
        }
      });
      save(chiaveRicettarioUtente(idUtente), { recipeIds, notesByRecipeId });
    }
    save(CHIAVI_SALVATAGGIO.USERS, utentiNuovi);
  }

  if (legacyCurrent?.id) {
    save(CHIAVI_SALVATAGGIO.SESSION, { currentUserId: legacyCurrent.id, loginAt: now });
  }

  const recensioniLegacy =
    Array.isArray(legacyReviews) && legacyReviews.length > 0
      ? legacyReviews
      : Array.isArray(legacyUndefined) && legacyUndefined.length > 0
        ? legacyUndefined
        : [];

  if (recensioniLegacy.length > 0) {
    const grouped = new Map();
    recensioniLegacy.forEach(recensione => {
      const idRicetta = recensione.idRicetta ?? recensione.recipeId;
      if (!idRicetta) return;
      const cookedAt = recensione.cookedAt ?? recensione.dataPreparazione ?? null;
      const difficulty = normalizzaDifficolta(recensione.difficolta ?? recensione.difficulty);
      const taste = normalizzaVoto(recensione.valutazione ?? recensione.gusto ?? recensione.taste);
      const createdAt = recensione.createdAt ?? now;
      const updatedAt = recensione.updatedAt ?? createdAt;
      const record = {
        id: recensione.id ?? generaId("recensione"),
        userId: recensione.idUtente ?? recensione.userId,
        cookedAt,
        difficulty,
        taste,
        createdAt,
        updatedAt
      };
      if (recensione.commento) {
        record.commento = recensione.commento;
      }
      const lista = grouped.get(idRicetta) ?? [];
      lista.push(record);
      grouped.set(idRicetta, lista);
    });

    grouped.forEach((lista, idRicetta) => {
      save(chiaveRecensioniRicetta(idRicetta), lista);
    });
  }

  remove(CHIAVI_LEGACY.RICETTE);
  remove(CHIAVI_LEGACY.UTENTI);
  remove(CHIAVI_LEGACY.UTENTE_CORRENTE);
  remove(CHIAVI_LEGACY.RECENSIONI);
  remove("undefined");
}

function normalizzaPreferiti(valore) {
  if (Array.isArray(valore)) {
    return valore.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof valore === "string") {
    return valore
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizzaDifficolta(valore) {
  if (typeof valore === "number") {
    return clampVoto(valore);
  }
  const stringa = String(valore || "").toLowerCase();
  if (stringa.includes("fac")) return 2;
  if (stringa.includes("med")) return 3;
  if (stringa.includes("dif")) return 4;
  return 3;
}

function normalizzaVoto(valore) {
  if (typeof valore === "number") {
    return clampVoto(valore);
  }
  const numero = Number(valore);
  if (!Number.isNaN(numero)) return clampVoto(numero);
  return 3;
}

function clampVoto(valore) {
  if (valore < 1) return 1;
  if (valore > 5) return 5;
  return Math.round(valore);
}

// --------------------------
// Utenti + sessione  (cuore dell'autenticazione)
// --------------------------
// MODELLO scelto: separiamo "CHI esiste" da "CHI è loggato".
//   - chiave "users"   → array di TUTTI gli account registrati (persistente).
//   - chiave "session" → { currentUserId, loginAt } → punta all'utente attualmente loggato.
// Login = scrivere currentUserId; logout = rimetterlo a null. I dati utente non si toccano.

// Legge l'array utenti dal Local Storage ("users") e lo normalizza (campi coerenti EN/IT).
export function ottieniUtenti() {
  const utenti = load(CHIAVI_SALVATAGGIO.USERS, []);
  return utenti.map(normalizzaUtente);
}

// Riscrive l'intero array utenti nel Local Storage ("users") in forma serializzata pulita.
export function salvaUtenti(utenti) {
  const normalizzati = utenti.map(serializzaUtente);
  save(CHIAVI_SALVATAGGIO.USERS, normalizzati);
}

// Restituisce l'utente loggato, oppure null. È la funzione che "decide" se sei autenticato:
// legge "session".currentUserId e cerca l'utente corrispondente in "users".
// arricchisciConRicettario aggiunge al volo il ricettario (letto da "cookbook:<id>").
// DEVTOOLS: se in "session" currentUserId è null → questa ritorna null → sei sloggato.
export function ottieniUtenteCorrente() {
  const sessione = load(CHIAVI_SALVATAGGIO.SESSION, { currentUserId: null });
  if (!sessione?.currentUserId) return null;
  const utente = ottieniUtenti().find(item => item.id === sessione.currentUserId);
  if (!utente) return null; // sessione che punta a un utente cancellato → trattato come sloggato
  return arricchisciConRicettario(utente);
}

// Apre o chiude la sessione scrivendo la chiave "session" in Local Storage.
//   - impostaUtenteCorrente(utente) → LOGIN  (currentUserId = utente.id, loginAt = ora)
//   - impostaUtenteCorrente(null)   → LOGOUT (currentUserId = null)
// È IL punto da osservare nei DevTools durante login e logout.
export function impostaUtenteCorrente(utente) {
  if (!utente) {
    save(CHIAVI_SALVATAGGIO.SESSION, { currentUserId: null, loginAt: null });
    return;
  }
  save(CHIAVI_SALVATAGGIO.SESSION, {
    currentUserId: utente.id,
    loginAt: new Date().toISOString()
  });
}

export function salvaUtente(utenteAggiornato) {
  const utenti = ottieniUtenti();
  const indice = utenti.findIndex(u => u.id === utenteAggiornato.id);
  const next = normalizzaUtente(utenteAggiornato);
  if (indice !== -1) {
    utenti[indice] = next;
  } else {
    utenti.push(next);
  }
  salvaUtenti(utenti);
  const sessione = load(CHIAVI_SALVATAGGIO.SESSION, { currentUserId: null });
  if (sessione?.currentUserId === utenteAggiornato.id) {
    impostaUtenteCorrente(utenteAggiornato);
  }
}

export function rimuoviUtente(idUtente) {
  const restanti = ottieniUtenti().filter(utente => utente.id !== idUtente);
  salvaUtenti(restanti);
  remove(chiaveRicettarioUtente(idUtente));
  rimuoviRecensioniUtente(idUtente);
  const sessione = load(CHIAVI_SALVATAGGIO.SESSION, { currentUserId: null });
  if (sessione?.currentUserId === idUtente) {
    impostaUtenteCorrente(null);
  }
}

function normalizzaUtente(utente) {
  if (!utente) return utente;
  const { password: _password, ...rest } = utente;
  const username = rest.username ?? rest.nomeUtente ?? "";
  const email = rest.email ?? "";
  const firstName = rest.firstName ?? rest.nome ?? "";
  const lastName = rest.lastName ?? rest.cognome ?? "";
  const originCountry = rest.originCountry ?? rest.paeseOrigine ?? "";
  const residenceCountry = rest.residenceCountry ?? rest.paeseResidenza ?? "";
  const favoriteDishes = normalizzaPreferiti(
    rest.favoriteDishes ?? rest.piattiPreferiti ?? rest.favorites ?? []
  );
  return {
    ...rest,
    username,
    email,
    firstName,
    lastName,
    originCountry,
    residenceCountry,
    favoriteDishes,
    nomeUtente: utente.nomeUtente ?? username,
    nome: utente.nome ?? firstName,
    cognome: utente.cognome ?? lastName,
    paeseOrigine: utente.paeseOrigine ?? originCountry,
    paeseResidenza: utente.paeseResidenza ?? residenceCountry
  };
}

function serializzaUtente(utente) {
  const username = utente.username ?? utente.nomeUtente ?? "";
  const email = utente.email ?? "";
  const firstName = utente.firstName ?? utente.nome ?? "";
  const lastName = utente.lastName ?? utente.cognome ?? "";
  const originCountry = utente.originCountry ?? utente.paeseOrigine ?? "";
  const residenceCountry = utente.residenceCountry ?? utente.paeseResidenza ?? "";
  const favoriteDishes = normalizzaPreferiti(
    utente.favoriteDishes ?? utente.piattiPreferiti ?? utente.favorites ?? []
  );
  return {
    id: utente.id ?? generaIdUtente(),
    username,
    email,
    passwordHash: utente.passwordHash,
    salt: utente.salt,
    createdAt: utente.createdAt ?? new Date().toISOString(),
    updatedAt: utente.updatedAt ?? new Date().toISOString(),
    firstName,
    lastName,
    originCountry,
    residenceCountry,
    favoriteDishes
  };
}

// --------------------------
// Cache ricette
// --------------------------
export function ottieniCacheRicette() {
  const cache = load(CHIAVI_SALVATAGGIO.RECIPES_CACHE, { byId: {} });
  return cache?.byId ?? {};
}

export function salvaCacheRicette(cacheById, info = {}) {
  const updatedAt = info.updatedAt ?? new Date().toISOString();
  save(CHIAVI_SALVATAGGIO.RECIPES_CACHE, { updatedAt, byId: cacheById });
}

export function ottieniCacheAree() {
  return load(CHIAVI_SALVATAGGIO.AREAS_CACHE, { updatedAt: null, items: [] });
}

// Salva le aree in "areas:cache". Il flag derivedFromCatalog marca che sono state generate dalla
// logica attuale (aree distinte del catalogo): permette di invalidare automaticamente una cache
// vecchia salvata da una versione precedente dell'app (vedi ottieniAreeCucina in api.js).
export function salvaCacheAree(items) {
  save(CHIAVI_SALVATAGGIO.AREAS_CACHE, {
    updatedAt: new Date().toISOString(),
    items,
    derivedFromCatalog: true
  });
}

export function ottieniMetaApp() {
  return load(CHIAVI_SALVATAGGIO.APP_META, {
    schemaVersion: SCHEMA_VERSION,
    lastInitAt: null,
    apiCacheInfo: {}
  });
}

export function aggiornaMetaApp(updater) {
  return update(
    CHIAVI_SALVATAGGIO.APP_META,
    updater,
    { schemaVersion: SCHEMA_VERSION, lastInitAt: null, apiCacheInfo: {} }
  );
}

export function aggiornaCacheInfoRicette(info) {
  return aggiornaMetaApp(meta => ({
    ...meta,
    apiCacheInfo: {
      ...(meta.apiCacheInfo ?? {}),
      recipes: { ...(meta.apiCacheInfo?.recipes ?? {}), ...info }
    }
  }));
}

// --------------------------
// Ricettario utente (macro-scenario "gestione di un ricettario personale")
// --------------------------
// Forma salvata in "cookbook:<idUtente>": { recipeIds: [...], notesByRecipeId: { idRicetta: nota } }.
// Memorizziamo solo gli ID delle ricette (non l'intera ricetta): i dettagli si ripescano dalla
// cache/API quando servono. Le note sono PRIVATE (vivono solo nel ricettario del singolo utente).
export function ottieniRicettarioUtente(idUtente) {
  return load(chiaveRicettarioUtente(idUtente), { recipeIds: [], notesByRecipeId: {} });
}

export function salvaRicettarioUtente(idUtente, ricettario) {
  save(chiaveRicettarioUtente(idUtente), ricettario);
}

// Aggancia all'oggetto utente una vista comoda del ricettario ([{ idRicetta, nota }]) usata dalle viste.
function arricchisciConRicettario(utente) {
  const ricettario = ottieniRicettarioUtente(utente.id);
  const lista = ricettario.recipeIds.map(idRicetta => ({
    idRicetta,
    nota: ricettario.notesByRecipeId?.[idRicetta] ?? ""
  }));
  return { ...utente, ricettario: lista };
}

// Aggiunge (aggiungi=true) o rimuove (aggiungi=false) una ricetta dal ricettario dell'utente loggato.
// È la funzione dietro i pulsanti "Aggiungi/Rimuovi dal ricettario" su card e scheda dettaglio.
// DEVTOOLS: clicca "Aggiungi al ricettario" → in "cookbook:<tuoId>" l'id compare in recipeIds.
export function aggiornaRicettario(idRicetta, aggiungi) {
  const utente = ottieniUtenteCorrente();
  if (!utente) {
    window.location.hash = "#/accesso"; // serve essere loggati per avere un ricettario
    return;
  }
  const ricettario = ottieniRicettarioUtente(utente.id);
  // Copie difensive (spread) per non mutare direttamente l'oggetto letto dallo storage.
  const recipeIds = [...(ricettario.recipeIds ?? [])];
  const notesByRecipeId = { ...(ricettario.notesByRecipeId ?? {}) };
  const indice = recipeIds.indexOf(idRicetta);
  if (aggiungi && indice === -1) {
    recipeIds.push(idRicetta); // aggiungi solo se non già presente (niente duplicati)
  }
  if (!aggiungi && indice !== -1) {
    recipeIds.splice(indice, 1);
    delete notesByRecipeId[idRicetta]; // rimuovendo la ricetta buttiamo anche la sua nota privata
  }
  salvaRicettarioUtente(utente.id, { recipeIds, notesByRecipeId });
}

// Salva/aggiorna la nota privata testuale di una ricetta presente nel ricettario.
export function aggiornaNotaRicettario(idRicetta, nota) {
  const utente = ottieniUtenteCorrente();
  if (!utente) return;
  const ricettario = ottieniRicettarioUtente(utente.id);
  if (!ricettario.recipeIds?.includes(idRicetta)) return;
  const notesByRecipeId = { ...(ricettario.notesByRecipeId ?? {}) };
  notesByRecipeId[idRicetta] = nota;
  salvaRicettarioUtente(utente.id, {
    recipeIds: [...ricettario.recipeIds],
    notesByRecipeId
  });
}

// --------------------------
// Recensioni (macro-scenario "recensioni delle ricette")
// --------------------------
// Le recensioni sono raggruppate PER RICETTA nella chiave "reviews:<idRicetta>" (array).
// Schema di una recensione (campi richiesti dalla specifica): data di preparazione (cookedAt),
// voto difficoltà 1-5 (difficulty), voto gusto 1-5 (taste); più id, userId, commento, timestamp.
// Internamente i campi sono in inglese; questa funzione li ri-espone anche in italiano (idRicetta,
// idUtente) perché le viste lavorano con quelle proprietà.
export function trasformaRecensioneInItaliano(recensione) {
  if (!recensione) return recensione;
  return {
    ...recensione,
    idRicetta: recensione.idRicetta ?? recensione.recipeId,
    idUtente: recensione.idUtente ?? recensione.userId
  };
}

// Raccoglie TUTTE le recensioni di TUTTE le ricette scorrendo le chiavi "reviews:*" del Local Storage.
// Usata, ad esempio, dalla pagina Recensioni e dal conteggio nel profilo (filtrando per idUtente).
export function ottieniRecensioni() {
  const elenco = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i); // iteriamo su tutte le chiavi presenti nel Local Storage
    if (!key || !key.startsWith(PREFIX_REVIEWS)) continue; // teniamo solo quelle "reviews:..."
    const recensioni = load(key, []);
    recensioni.forEach(item => {
      elenco.push(trasformaRecensioneInItaliano({
        ...item,
        // se manca idRicetta lo ricaviamo dal nome della chiave (es. "reviews:52772" → "52772")
        idRicetta: item.idRicetta ?? key.replace(PREFIX_REVIEWS, "")
      }));
    });
  }
  return elenco;
}

export function ottieniRecensioniRicetta(idRicetta) {
  const recensioni = load(chiaveRecensioniRicetta(idRicetta), []);
  return recensioni.map(recensione =>
    trasformaRecensioneInItaliano({ ...recensione, idRicetta })
  );
}

export function salvaRecensioniRicetta(idRicetta, recensioni) {
  const pulite = recensioni.map(recensione => normalizzaRecensionePerStorage(recensione));
  save(chiaveRecensioniRicetta(idRicetta), pulite);
}

// RIMOZIONE di una recensione (richiesta esplicitamente dalla specifica: "inserimento e rimozione").
// Filtriamo via la recensione con quell'id; il controllo su idUtente garantisce che un utente possa
// rimuovere SOLO le proprie recensioni. Restituisce true se qualcosa è stato effettivamente rimosso.
// DEVTOOLS: clicca "Rimuovi recensione" → l'elemento sparisce dall'array in "reviews:<idRicetta>".
export function rimuoviRecensione(idRicetta, idRecensione, idUtente) {
  const recensioni = ottieniRecensioniRicetta(idRicetta);
  const filtrate = recensioni.filter(recensione => {
    if (recensione.id !== idRecensione) return true; // non è quella da rimuovere → tienila
    if (idUtente && recensione.idUtente !== idUtente) return true; // non è tua → non puoi rimuoverla
    return false; // è la tua recensione con quell'id → scartala
  });
  if (filtrate.length === recensioni.length) return false; // niente rimosso (id non trovato)
  salvaRecensioniRicetta(idRicetta, filtrate);
  return true;
}

// "Igienizza" una recensione prima del salvataggio: garantisce id e timestamp, accetta sia i nomi
// inglesi sia quelli italiani in ingresso, e forza i voti nell'intervallo 1-5 (clampVoto).
function normalizzaRecensionePerStorage(recensione) {
  const now = new Date().toISOString();
  const createdAt = recensione.createdAt ?? now;
  const updatedAt = recensione.updatedAt ?? now;
  return {
    id: recensione.id ?? generaIdRecensione(),
    userId: recensione.userId ?? recensione.idUtente,
    cookedAt: recensione.cookedAt ?? recensione.dataPreparazione ?? null, // data di preparazione
    difficulty: clampVoto(recensione.difficulty ?? recensione.difficolta ?? 3), // voto difficoltà 1-5
    taste: clampVoto(recensione.taste ?? recensione.valutazione ?? recensione.gusto ?? 3), // voto gusto 1-5
    commento: recensione.commento?.trim() || "",
    createdAt,
    updatedAt
  };
}

function rimuoviRecensioniUtente(idUtente) {
  const chiavi = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX_REVIEWS)) {
      chiavi.push(key);
    }
  }
  chiavi.forEach(key => {
    const recensioni = load(key, []);
    const filtrate = recensioni.filter(recensione => recensione.userId !== idUtente);
    if (filtrate.length === 0) {
      remove(key);
    } else {
      save(key, filtrate);
    }
  });
}

// --------------------------
// Utility per id
// --------------------------
export function generaIdUtente() {
  return generaId("utente");
}

export function generaIdRecensione() {
  return generaId("recensione");
}
