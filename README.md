# CyberCuisineV0

Piattaforma web per la gestione di ricette (TheMealDB) - Progetto di Programmazione Web e Mobile @ UNIMI.

## Struttura

```text
src/
  html/          # Frammenti SPA (index + viste: home, esplora, ricettario, recensioni, profilo, ecc.)
  css/           # Stili modulari (theme, layout, componenti, forms, utilities)
  js/
    main.js      # Bootstrap iniziale della SPA
    costanti.js  # Chiavi e URL condivisi
    stato.js     # Stato globale leggero (cache frammenti, risultati ricerca, hash attivo)
    ui.js        # Utility UI (alert, generaId)
    storage.js   # Accesso localStorage + normalizzazioni/migrazioni + ricettario/recensioni
    auth.js      # Hashing password (SHA-256 + salt via Web Crypto) e verifica credenziali
    navbar.js    # Gestione link login/logout e nav attiva
    rotte.js     # Mappa delle rotte SPA
    router.js    # Router hash -> frammenti e onLoad delle viste
    gestione-api/
      api.js     # Chiamate TheMealDB + normalizzazione ricette + preload catalogo completo
    componenti/  # Componenti riutilizzabili (card ricetta/ricettario/recensione, form recensione)
    viste/       # Controller per singole viste (accesso, registrazione, profilo, esplora, ricettario, recensioni, dettaglio ricetta, home)
  assets/
    img/         # Immagini (logo, sfondi)
```

## Come avviare

1. Apri `src/html/index.html` in un browser.
2. La SPA usa hash routing (es. `#/home`, `#/esplora`, `#/ricetta/<id>`).
3. Richiede accesso alla CDN di Bootstrap e alle API pubbliche di TheMealDB.

## Dipendenze esterne

- Bootstrap 5 (CDN)
- Google Fonts (Orbitron, Space Grotesk)
- TheMealDB (REST API pubblica)

## Note di manutenzione

- Rotte in italiano: `#/home`, `#/accesso`, `#/registrazione`, `#/profilo`, `#/esplora`, `#/ricettario`, `#/recensioni`, `#/ricetta/<id>`.
- I dati localStorage vengono normalizzati in `storage.js` per mantenere compatibilità con chiavi legacy.
- I componenti UI riutilizzabili sono in `js/componenti/`; i controller di vista in `js/viste/`.

## Web storage (dove vivono i dati)

L'app salva tutto nel **web storage del browser** (formato JSON). Ispezionalo con **F12 → Application**
(Chrome/Edge) o **Archiviazione** (Firefox):

- **Local Storage** (persistente): `app:meta`, `users`, `session`, `recipes:cache`, `areas:cache`,
  `cookbook:<idUtente>`, `reviews:<idRicetta>`, `cc_remembered_accounts` (account del "Ricordami",
  password **cifrata AES-GCM** — mai in chiaro).
- **Session Storage** (dura finché la scheda resta aperta): `cc_post_signup` (messaggio temporaneo
  registrazione→login). La vecchia chiave `cc_accesso_ricorda` è **legacy**: non viene più scritta,
  viene solo rimossa all'avvio della pagina di login come pulizia.

Le password **non** sono salvate in chiaro: in `users` trovi solo `passwordHash` + `salt` (SHA-256).

## Reset dei dati / account di test

Gli account NON sono nel codice: vivono nel `localStorage` del browser. Per ripartire da zero
(es. per creare un account di test pulito e annotarne le credenziali):

**Opzione A — reset totale (consigliato).** F12 → scheda **Console** → incolla ed esegui:

```js
localStorage.clear(); sessionStorage.clear(); location.reload();
```

Questo cancella utenti, sessione, ricettari, recensioni e cache. Al ricaricamento l'app riscarica
il catalogo da TheMealDB; la base utenti è vuota e puoi registrare un nuovo account.

**Opzione B — cancellare solo l'account, tenendo la cache del catalogo.** F12 → **Application** →
**Local Storage** → seleziona ed elimina le chiavi `users`, `session` e l'eventuale
`cookbook:<idUtente>` / `reviews:<idRicetta>` del tuo account, poi ricarica la pagina.
