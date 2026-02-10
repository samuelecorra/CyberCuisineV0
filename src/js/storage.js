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

export function chiaveRicettarioUtente(idUtente) {
  return `${PREFIX_COOKBOOK}${idUtente}`;
}

export function chiaveRecensioniRicetta(idRicetta) {
  return `${PREFIX_REVIEWS}${idRicetta}`;
}

// --------------------------
// Init + migrazioni schema
// --------------------------
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

async function migraSeNecessario() {
  const meta = load(CHIAVI_SALVATAGGIO.APP_META, null);
  if (meta?.schemaVersion === SCHEMA_VERSION) return;
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
// Utenti + sessione
// --------------------------
export function ottieniUtenti() {
  const utenti = load(CHIAVI_SALVATAGGIO.USERS, []);
  return utenti.map(normalizzaUtente);
}

export function salvaUtenti(utenti) {
  const normalizzati = utenti.map(serializzaUtente);
  save(CHIAVI_SALVATAGGIO.USERS, normalizzati);
}

export function ottieniUtenteCorrente() {
  const sessione = load(CHIAVI_SALVATAGGIO.SESSION, { currentUserId: null });
  if (!sessione?.currentUserId) return null;
  const utente = ottieniUtenti().find(item => item.id === sessione.currentUserId);
  if (!utente) return null;
  return arricchisciConRicettario(utente);
}

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

export function ottieniMetaRicette() {
  return load(CHIAVI_SALVATAGGIO.RECIPES_CACHE, { updatedAt: null, byId: {} });
}

export function ottieniCacheAree() {
  return load(CHIAVI_SALVATAGGIO.AREAS_CACHE, { updatedAt: null, items: [] });
}

export function salvaCacheAree(items) {
  save(CHIAVI_SALVATAGGIO.AREAS_CACHE, { updatedAt: new Date().toISOString(), items });
}

export function ottieniMetaApp() {
  return load(CHIAVI_SALVATAGGIO.APP_META, {
    schemaVersion: SCHEMA_VERSION,
    lastInitAt: null,
    apiCacheInfo: {}
  });
}

export function salvaMetaApp(meta) {
  save(CHIAVI_SALVATAGGIO.APP_META, meta);
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
// Ricettario utente
// --------------------------
export function ottieniRicettarioUtente(idUtente) {
  return load(chiaveRicettarioUtente(idUtente), { recipeIds: [], notesByRecipeId: {} });
}

export function salvaRicettarioUtente(idUtente, ricettario) {
  save(chiaveRicettarioUtente(idUtente), ricettario);
}

function arricchisciConRicettario(utente) {
  const ricettario = ottieniRicettarioUtente(utente.id);
  const lista = ricettario.recipeIds.map(idRicetta => ({
    idRicetta,
    nota: ricettario.notesByRecipeId?.[idRicetta] ?? ""
  }));
  return { ...utente, ricettario: lista };
}

export function aggiornaRicettario(idRicetta, aggiungi) {
  const utente = ottieniUtenteCorrente();
  if (!utente) {
    window.location.hash = "#/accesso";
    return;
  }
  const ricettario = ottieniRicettarioUtente(utente.id);
  const recipeIds = [...(ricettario.recipeIds ?? [])];
  const notesByRecipeId = { ...(ricettario.notesByRecipeId ?? {}) };
  const indice = recipeIds.indexOf(idRicetta);
  if (aggiungi && indice === -1) {
    recipeIds.push(idRicetta);
  }
  if (!aggiungi && indice !== -1) {
    recipeIds.splice(indice, 1);
    delete notesByRecipeId[idRicetta];
  }
  salvaRicettarioUtente(utente.id, { recipeIds, notesByRecipeId });
}

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
// Recensioni
// --------------------------
export function trasformaRecensioneInItaliano(recensione) {
  if (!recensione) return recensione;
  return {
    ...recensione,
    idRicetta: recensione.idRicetta ?? recensione.recipeId,
    idUtente: recensione.idUtente ?? recensione.userId
  };
}

export function ottieniRecensioni() {
  const elenco = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PREFIX_REVIEWS)) continue;
    const recensioni = load(key, []);
    recensioni.forEach(item => {
      elenco.push(trasformaRecensioneInItaliano({
        ...item,
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

export function salvaRecensioni(recensioni) {
  const grouped = new Map();
  recensioni.forEach(recensione => {
    const idRicetta = recensione.idRicetta ?? recensione.recipeId;
    if (!idRicetta) return;
    const lista = grouped.get(idRicetta) ?? [];
    lista.push(recensione);
    grouped.set(idRicetta, lista);
  });
  grouped.forEach((lista, idRicetta) => {
    salvaRecensioniRicetta(idRicetta, lista);
  });
}

export function salvaRecensioniRicetta(idRicetta, recensioni) {
  const pulite = recensioni.map(recensione => normalizzaRecensionePerStorage(recensione));
  save(chiaveRecensioniRicetta(idRicetta), pulite);
}

export function rimuoviRecensione(idRicetta, idRecensione, idUtente) {
  const recensioni = ottieniRecensioniRicetta(idRicetta);
  const filtrate = recensioni.filter(recensione => {
    if (recensione.id !== idRecensione) return true;
    if (idUtente && recensione.idUtente !== idUtente) return true;
    return false;
  });
  if (filtrate.length === recensioni.length) return false;
  salvaRecensioniRicetta(idRicetta, filtrate);
  return true;
}

function normalizzaRecensionePerStorage(recensione) {
  const now = new Date().toISOString();
  const createdAt = recensione.createdAt ?? now;
  const updatedAt = recensione.updatedAt ?? now;
  return {
    id: recensione.id ?? generaIdRecensione(),
    userId: recensione.userId ?? recensione.idUtente,
    cookedAt: recensione.cookedAt ?? recensione.dataPreparazione ?? null,
    difficulty: clampVoto(recensione.difficulty ?? recensione.difficolta ?? 3),
    taste: clampVoto(recensione.taste ?? recensione.valutazione ?? recensione.gusto ?? 3),
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
