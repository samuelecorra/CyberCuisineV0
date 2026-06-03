# CyberCuisine – Audit Finale & Conformità alla Specifica

> Documento di riferimento per la discussione orale. Sostituisce il vecchio "Phase 0 Audit Report"
> (ormai obsoleto: descriveva una versione precedente con password in chiaro, recensioni sotto chiave
> errata, ricettario dentro l'utente, ecc., tutti aspetti nel frattempo rifattorizzati allo **schema v2**).

## 1. Sintesi dello stato

- **Tipo app**: Single Page Application (SPA) in **vanilla JS** (moduli ES6), **hash routing** (`#/...`), nessun backend.
- **UI**: **Bootstrap 5** (CDN) + CSS custom modulare. Separazione struttura (HTML5) / presentazione (CSS3) rispettata.
- **Persistenza**: **web storage** del browser, tutto in **JSON**. `localStorage` per i dati di dominio; `sessionStorage` per due dati temporanei dell'autenticazione.
- **Sorgente dati**: **TheMealDB REST API**. All'avvio l'**intero catalogo (A–Z)** viene scaricato, normalizzato e memorizzato nel web storage, poi visualizzato (requisito di startup soddisfatto).
- **Sicurezza**: le password **non sono mai salvate in chiaro** → hash **SHA-256 + salt** (Web Crypto API).
- **Esito**: tutte le operazioni richieste dalla specifica sono implementate e verificate.

---

## 2. Matrice Requisiti (Specifica PDF → Stato)

| Requisito (specifica) | Stato | Dove / Note |
| --- | --- | --- |
| Registrazione (username, email, password, **piatti preferiti**) | ✅ | `vista-registrazione.js` + `register.html`; scrive in `users` |
| Login | ✅ | `vista-accesso.js`; verifica via hash; scrive `session` |
| Logout | ✅ | `navbar.js` → `gestisciLogout`; azzera `session` |
| Modifica dati personali | ✅ | `vista-profilo.js`; re-auth con password prima della modifica |
| Rimozione profilo | ✅ | `rimuoviUtente` (cancella utente + ricettario + recensioni) |
| Ricerca per **nome** | ✅ | `cercaRicettePerNome` (filtro sulla cache locale) |
| Ricerca per **ingrediente** | ✅ | `cercaRicettePerIngrediente` |
| Ricerca per **lettera iniziale** | ✅ | `cercaRicettePerLettera` |
| Ricerca **sequenziale** | ✅ | "Sfoglia l'intero catalogo" in Esplora (indice A–Z) |
| Scheda ricetta: **ingredienti, immagini, procedimento** | ✅ | `vista-dettaglio-ricetta.js` |
| Scheda ricetta: **mostra recensioni utenti** | ✅ | elenco recensioni da `reviews:<idRicetta>` |
| Ricettario personale creato alla registrazione | ✅ | inizialmente vuoto (`cookbook:<idUtente>`) |
| Aggiungi/Rimuovi ricetta dal ricettario (pulsante in scheda) | ✅ | `aggiornaRicettario` + pulsanti su card e dettaglio |
| **Nota privata** per ricetta | ✅ | `notesByRecipeId` nel ricettario, non visibile ad altri |
| Recensione: **data preparazione + difficoltà 1-5 + gusto 1-5** | ✅ | `modale-recensione.js` (`cookedAt`, `difficulty`, `taste`) |
| **Inserimento** recensioni | ✅ | salvataggio in `reviews:<idRicetta>` (upsert per utente) |
| **Rimozione** recensioni | ✅ | `rimuoviRecensione` + pulsante in scheda e in "Le tue recensioni" |
| Startup: dati scaricati da TheMealDB (JSON) → web storage → visualizzati | ✅ | `precaricaCatalogoCompleto()` chiamata in `main.js` con overlay |
| Dati in web storage in formato JSON | ✅ | tutte le chiavi sono JSON (`JSON.stringify/parse`) |
| Separazione HTML5 / CSS3 | ✅ | nessuno stile inline; tutto in `src/css/*` |
| HTML5 + CSS3 + JavaScript | ✅ | nessun framework JS, nessun build step |

---

## 3. Modello dati nel web storage (schema v2)

### `localStorage` (persistente)

| Chiave | Forma | Scopo |
| --- | --- | --- |
| `app:meta` | `{ schemaVersion, lastInitAt, apiCacheInfo:{ recipes:{ strategy, lastFetchAt, ttlHours, complete } } }` | Versione schema + metadati cache |
| `users` | `[ { id, username, email, passwordHash, salt, createdAt, updatedAt, firstName, lastName, originCountry, residenceCountry, favoriteDishes:[] } ]` | Account registrati |
| `session` | `{ currentUserId, loginAt }` | Chi è loggato adesso |
| `recipes:cache` | `{ updatedAt, byId:{ <id>: { id, nome, categoria, area, areaCodice, istruzioni, miniatura, etichette:[], youtube, fonte, ingredienti:[{nome,quantita}] } } }` | Catalogo TheMealDB |
| `areas:cache` | `{ updatedAt, items:[ { nomeEn, nomeIt, emoji } ] }` | Aree/paesi per le select |
| `cookbook:<idUtente>` | `{ recipeIds:[], notesByRecipeId:{ <idRicetta>: nota } }` | Ricettario + note private |
| `reviews:<idRicetta>` | `[ { id, userId, cookedAt, difficulty, taste, commento, createdAt, updatedAt } ]` | Recensioni della ricetta |

### `sessionStorage` (temporaneo, muore alla chiusura della scheda)

| Chiave | Forma | Scopo |
| --- | --- | --- |
| `cc_accesso_ricorda` | `{ identificatore }` | "Ricordami": **solo** username/email, **mai** la password |
| `cc_post_signup` | `{ identificatore, messaggio }` | Messaggio one-shot dalla registrazione al login (poi rimosso) |

---

## 4. Mappa API TheMealDB

Base: `https://www.themealdb.com/api/json/v1/1/`

| Endpoint | Uso | Cache |
| --- | --- | --- |
| `search.php?f=<lettera>` | Scarica il catalogo completo A–Z allo startup (26 fetch in parallelo) | `recipes:cache` |
| `lookup.php?i=<id>` | Fallback: recupero singola ricetta per id se non in cache | aggiunta a `recipes:cache` |

I **paesi** selezionabili in registrazione/profilo NON arrivano da `list.php?a=list` (che elenca ~195
demonimi quasi tutti senza ricette): sono **derivati dalle aree realmente presenti nel catalogo**
(~37), così ogni scelta produce risultati; vengono poi memorizzati in `areas:cache`.

Verifica live: il catalogo completo restituisce **~666 ricette**; la ricerca per nome/ingrediente/lettera filtra correttamente sull'intera cache (es. "pizza"→3, "chicken" come ingrediente→98).

---

## 5. Flusso di Autenticazione (script per la demo nei DevTools)

> Apri **F12 → Application → Local Storage / Session Storage** e tieni il pannello aperto.

1. **Registrazione** (`#/registrazione`): compili il form → in `localStorage["users"]` compare il nuovo utente con `passwordHash` + `salt` (niente `password`). In `sessionStorage` appare e poi sparisce `cc_post_signup`.
2. **Login** (`#/accesso`): la password viene ri-hashata e confrontata con `passwordHash`. Al successo `localStorage["session"].currentUserId` passa da `null` all'id utente e `loginAt` registra il timestamp. La navbar passa a "Ciao &lt;nome&gt;".
3. **Ricordami**: se spuntato, in `sessionStorage["cc_accesso_ricorda"]` viene salvato **solo** l'identificatore.
4. **Refresh (F5)**: `session` resta in `localStorage` → resti loggato senza rifare il login (init idempotente in `storage.js`).
5. **Rotte protette**: con `session` vuota, aprendo `#/ricettario` o `#/recensioni` il router rimanda a `#/accesso`.
6. **Logout**: `session.currentUserId` torna `null`; `users` e i dati personali **non** vengono toccati.

Tutti i punti chiave sono commentati inline nel codice con il prefisso `DEVTOOLS:` e `>>> MOMENTO CHIAVE <<<`.

---

## 6. Scelte implementative documentate

La specifica chiede di motivare le scelte: ecco le principali.

- **SPA + hash routing senza backend**: requisito di persistenza su web storage → niente server; il routing client-side (`#/...`) evita reload di pagina.
- **Catalogo completo allo startup con cache TTL (72h)**: rispetta il requisito ("allo startup i dati sono scaricati dalle API e memorizzati nel web storage") ma evita 26 chiamate di rete a ogni reload riusando il web storage finché i dati sono validi.
- **Ricerca locale sulla cache** (anziché una chiamata API per ogni ricerca): risultati istantanei, funziona anche offline, meno carico sull'API pubblica.
- **Hashing password SHA-256 + salt** (oltre il minimo richiesto): la password non è mai persistita in chiaro; il salt blocca le rainbow table.
- **Namespacing delle chiavi** (`cookbook:<idUtente>`, `reviews:<idRicetta>`): separa nettamente le entità nel web storage e semplifica la demo.
- **Versioning schema + migrazione legacy**: aggiornamenti del formato dati non distruttivi.
- **Upsert recensione** (una recensione per utente per ricetta): evita duplicati e rende naturale la "modifica".
- **"Ricordami" in sessionStorage con solo identificatore**: comodità senza esporre credenziali.
- **Paesi derivati dal catalogo** (non da `list.php?a=list`): si offrono solo le ~37 cucine con ricette reali, ognuna con nome italiano e bandiera.
- **Webfont bandiere self-hosted** (`Twemoji Country Flags`, `src/assets/fonts/`): Windows non disegna le flag emoji; il font (limitato via `unicode-range` ai soli regional indicator) le rende correttamente su tutti i sistemi senza alterare il resto del testo.

---

## 7. Funzionalità aggiuntive (oltre la specifica)

Consentite dalla specifica ("operazioni e funzionalità aggiuntive possono essere implementate a piacere"):

- Home personalizzata per utenti loggati (ricette per paese di origine/residenza).
- Aree/paesi tradotti in italiano con emoji bandiera.
- Anteprima/embed del video YouTube nella scheda ricetta.
- Indice alfabetico con scroll fluido e lettera attiva nello "Sfoglia tutto".
- Modali legali (Termini/Privacy) con pulsante abilitato solo dopo lettura completa.
- Feedback di caricamento con spinner tematico.

---

## 8. Limiti noti (da dichiarare con onestà)

- **Persistenza locale al browser**: i dati vivono nel web storage di quel browser/profilo; non c'è sincronizzazione tra dispositivi (coerente con un progetto senza backend).
- **Dipendenza dalla rete al primo avvio**: serve connessione per scaricare il catalogo (poi la cache consente la navigazione offline).
- **TheMealDB free tier**: nomi e istruzioni delle ricette sono in inglese (tradurli a mano per centinaia di ricette non è praticabile); l'app traduce invece le aree/paesi.
- **Capienza localStorage (~5 MB)**: il catalogo completo (~600+ ricette) occupa qualche MB e rientra nei limiti tipici, ma è un dato da tenere presente.
