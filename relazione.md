# Relazione tecnica – CyberCuisine (SPA con hash routing e localStorage)

## Scopo del documento
Guida di riferimento per comprendere l’intero progetto CyberCuisine: architettura, flussi logici, modulazione del codice, requisiti teorici per leggere e manutenere ogni file (pensato per appunti Obsidian).

## Panorama generale
- **Tipo di app**: Single Page Application (SPA) in **vanilla JS** con **hash routing** (`#/percorso`), senza backend; persistenza su **localStorage** e fetch verso **TheMealDB**.
- **Stack UI**: HTML frammentato per viste, **Bootstrap 5** per layout/base, CSS custom (tema, layout, componenti, modali, form).
- **Target**: gestione ricette, profili utente, recensioni, ricettario personale; versione non autenticata + sezioni protette.

## Organizzazione della root
- `src/html/`: frammenti caricati via router (home, home.logged, ricerca, ricettario, recensioni, profilo, login, registrazione, dettaglio ricetta, esplora).
- `src/js/`: entry `main.js`, router/hash `router.js`, mappa rotte `rotte.js`, stato in-memory `stato.js`, API TheMealDB `api.js`, persistenza `storage.js`, UI helpers `ui.js`, navbar/auth `navbar.js`, componenti (`componenti/carte.js`), viste (`viste/*.js`).
- `src/css/`: tema e layout (`theme.css`, `layout.css`, `components.css`, `forms.css`, `modal.css`, ecc.).
- `src/assets/`: loghi/immagini varie.

## Architettura SPA e hash routing
- **Hash routing**: l’URL usa `#/percorso`; l’evento `hashchange` in `main.js` richiama `gestisciCambioRoute` (`router.js`).
- **Router (`router.js`)**:
  - Normalizza l’hash (default `#/home`), gestisce route dinamiche `#/ricetta/{id}`.
  - Carica frammenti HTML via fetch con caching (`statoApp.cacheFrammenti`).
  - Se la rotta è protetta e non c’è utente, forza `#/accesso`.
  - Se esiste variante protetta (`frammentoProtetto`), la usa per utenti loggati.
  - Dopo il render richiama l’handler JS della vista (`alCaricamento` o `alCaricamentoProtetto`), evidenzia nav attiva, aggiorna stato auth nav.
- **Mappa rotte (`rotte.js`)**: associa hash → frammento HTML + init vista. Supporta: home (pubblica/protetta), accesso, registrazione, profilo (protetta), ricerca, ricettario (protetta), recensioni (protetta), ricetta dettagli, esplora (pubblica).
- **Entry (`main.js`)**: inizializza storage, navbar auth, precarica alcune ricette di cache, avvia router.

## Stato, storage, persistenza
- **statoApp (`stato.js`)**: stato volatile (cache frammenti, risultati ricerca, catalogo completo per “Esplora”, percorso attivo).
- **storage.js**:
  - Serializza su **localStorage**: utenti, utente corrente, ricette salvate, recensioni, cache ricette.
  - Normalizza utenti (nome, cognome, email, username, password, paesi origine/residenza, conteggi ricette/recensioni).
  - CRUD ricette memorizzate (ricettario) + note private.
  - CRUD recensioni per utente/ricetta.
  - Cache ricette per evitare refetch, adattamento dati API → struttura interna.
  - Helper per login/logout, validazioni base e contatori.
- **SessionStorage**: usato per “Ricordami” nel login (autofill credenziali se spuntato).

## API verso TheMealDB (`api.js`)
- Wrapper `interrogaApi` con gestione errori.
- Ricerca per nome, ingrediente (con fetch dettagli), lettera; lookup per ID.
- Ricerca per area (paese) con randomizzazione e limite.
- Gestione aree/paesi: fetch dinamico `list.php?a=list`, traduzione EN→IT, emoji bandiere; caching in modulo.
- Normalizzazione ricetta: nome, categoria, area, istruzioni, ingredienti (1–20), etichette, link youtube/fonte, miniatura.
- Precaricamento ricette “in evidenza” (prima lettera) se cache vuota.

## Componenti UI
- **`componenti/carte.js`**: template string per card ricetta (griglia responsive `col-12 col-md-4 col-lg-3`), card ricettario con textarea note e pulsanti, card recensioni, form recensione.
- **Navbar (`navbar.js`)**: aggiorna label “Registrati / Accedi” ↔ “Logout”, gestisce logout, evidenzia link attivo.
- **CSS**: `layout.css` (header/footer, layout esplora con sidebar sticky), `components.css` (card glow, bottoni), `forms.css` (input/select, listbox paesi), `modal.css` (modale conferma password), `theme.css` (palette/variabili), `utilities.css`.

## Viste (inizializzatori per ogni rotta)
- **Home pubblica (`vista-home.js`, `home.html`)**: sezione hero marketing.
- **Home loggata (`vista-home-loggata.js`, `home.logged.html`)**: mostra ricette per paese di origine/residenza dell’utente (max 4 card random per area), badge conteggio. Requisiti: utente con paesi impostati.
- **Ricerca (`vista-ricerca.js`, `search.html`)**: tre input (nome, ingrediente, lettera) con bottoni; mostra risultati in griglia di card, badge conteggio; memorizza ricette trovate in cache.
- **Ricettario (`vista-ricettario.js`, `ricettario.html`)**: mostra ricette salvate con note editabili e pulsanti rimozione/dettagli.
- **Recensioni (`vista-recensioni.js`, `reviews.html`)**: elenco recensioni dell’utente con card, link a ricetta.
- **Dettaglio ricetta (`vista-dettaglio-ricetta.js`, `recipe-detail.html`)**: recupera per ID (cache+API), mostra ingredienti/istruzioni, azioni salva/rimuovi/recensisci.
- **Accesso (`vista-accesso.js`, `login.html`)**: login con “Ricordami” (sessionStorage), link switch registrazione.
- **Registrazione (`vista-registrazione.js`, `register.html`)**: form con nome/cognome, email, username, password, paesi origine/residenza (select/emoji/traduzioni dinamiche), switch verso login.
- **Profilo (`vista-profilo.js`, `profile.html`)**: card dati utente, contatori ricette/recensioni con link “Vedi”, form di modifica disabilitato finché non si conferma password in modale (modal.css), select paesi analoghe alla registrazione, elimina profilo.
- **Esplora (`vista-esplora.js`, `esplora.html`)**: bottone “Sfoglia l’intero catalogo” → fetch di tutte le lettere, deduplica, raggruppa alfabeticamente, separatori per lettera, ancore laterali sticky per scroll rapido.

## Flussi chiave
- **Routing**: click nav → cambia `window.location.hash` → router carica frammento → init vista → aggiorna nav attiva.
- **Auth**: login salva utente corrente in localStorage; route protette controllano `ottieniUtenteCorrente`; logout pulisce stato e torna home.
- **Persistenza dati dominio**:
  - Ricette da API → normalizzazione → cache locale → eventuale salvataggio in ricettario.
  - Recensioni: legate a `idRicetta` e utente, salvate in localStorage.
  - Paesi: fetch dinamico aree, traduzione e emoji; riuso per registrazione/profilo.

## Requisiti teorici per leggere/manutenere il codice
- **Vanilla JS moderno**: moduli ES6 (`import/export`), async/await, fetch API, destrutturazione, optional chaining, template string.
- **DOM e eventi**: gestione `hashchange`, event delegation, querySelector, manipolazione classi/innerHTML, posizione sticky, scrollIntoView.
- **Storage Web**: `localStorage` vs `sessionStorage`, serializzazione JSON, gestione chiavi/namespacing, idempotenza e fallback.
- **HTTP/JSON**: gestione errori fetch, encoding parametri (encodeURIComponent), debounce/limiti richieste (approccio a Promise.all per alfabetico).
- **Bootstrap 5 e grid system**: breakpoints (`col-12 col-md-4 col-lg-3`), utility classes, form-control/input-group, card component.
- **Accessibilità e UX**: focus states, sticky sidebar, overflow controllato, badge conteggi, feedback di caricamento (spinner).
- **Organizzazione SPA senza framework**: separare **routing**, **stato**, **API**, **storage**, **viste**; caching frammenti HTML; pattern init per vista; gestione route dinamiche.

## Struttura sintetica delle dipendenze
- `main.js` → `storage.js`, `navbar.js`, `api.js` (precarica), `router.js`.
- `router.js` → `rotte.js`, `stato.js`, `navbar.js` (nav attiva/auth), `storage.js` (utente).
- `rotte.js` → viste (`viste/*.js`).
- `viste/*` → `api.js`, `storage.js`, `componenti/carte.js`, `stato.js` (dove serve), helper UI.
- `api.js` ↔ `storage.js` (cache memorizzazione), `costanti.js` (BASE_API).

## Note su stile e CSS
- Palette e tipografia definite in `theme.css`, layout di pagina in `layout.css`.
- Componenti riutilizzabili in `components.css`, form e listbox in `forms.css`.
- Modale conferma password profilata in `modal.css` (base per future modali).
- Sidebar lettere “Esplora”: sticky, max-height viewport, overflow interno, allineata al bordo destro via margine negativo sul gutter bootstrap.

## Come estendere/testare
- **Nuova vista**: aggiungere frammento HTML in `src/html`, init JS in `src/js/viste`, import e mappa in `rotte.js`.
- **Nuova rotta protetta**: settare `protetta: true` nella mappa; il router farà redirect se non loggato.
- **Nuova fonte dati**: aggiungere wrapper in `api.js` e normalizzazione coerente; se serve cache, usare `storage.js`.
- **Test manuali rapidi**:
  - Navigazione hash (home/accesso/registrazione/profilo/ricettario/recensioni/esplora).
  - Login/registrazione + controlli route protette.
  - Salvataggio/nota ricetta, rimozione, recensione.
  - Cambio paesi in profilo e rendering home loggata.
  - “Esplora”: caricamento catalogo completo, scroll con ancore.

## Conclusione
Il progetto dimostra un’architettura SPA completa in vanilla JS: routing client-side, separazione delle responsabilità, persistenza locale, integrazione API esterna, UI responsive con Bootstrap e CSS custom. La lettura riga per riga richiede familiarità con moduli ES, fetch/async, DOM avanzato, localStorage, e con il grid system di Bootstrap. Questo documento funge da mappa per orientarsi tra file, flussi e dipendenze.
