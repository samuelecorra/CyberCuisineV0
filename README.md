# CyberCuisineV0

Piattaforma web per la gestione di ricette (TheMealDB) - Progetto di Programmazione Web e Mobile @ UNIMI.

## Struttura

```
src/
  html/          # Frammenti SPA (index + viste: home, esplora, ricettario, recensioni, profilo, ecc.)
  css/           # Stili modulari (theme, layout, componenti, forms, utilities)
  js/
    main.js      # Bootstrap iniziale della SPA
    costanti.js  # Chiavi e URL condivisi
    stato.js     # Stato globale leggero (cache frammenti, risultati ricerca, hash attivo)
    ui.js        # Utility UI (alert, generaId)
    storage.js   # Accesso localStorage + normalizzazioni/migrazioni + ricettario/recensioni
    api.js       # Chiamate TheMealDB + normalizzazione ricette + preload
    navbar.js    # Gestione link login/logout e nav attiva
    rotte.js     # Mappa delle rotte SPA
    router.js    # Router hash -> frammenti e onLoad delle viste
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
