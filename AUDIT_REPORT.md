# CyberCuisineV0 – Phase 0 Audit Report

## Current Status Summary
- **App type**: Vanilla JS SPA with hash routing (`#/home`, `#/esplora`, `#/ricetta/<id>`) and HTML fragments loaded via `fetch`.
- **Entry point**: `src/html/index.html` loads `src/js/main.js` (ES modules).
- **UI stack**: Bootstrap 5 + custom CSS, no JS frameworks or build tools.
- **Persistence**: `localStorage` for users/recipes/reviews; `sessionStorage` for “remember me” and post‑signup message.
- **Data source**: TheMealDB REST API. The app **preloads the entire catalog (A–Z) on startup**, normalizes recipes, and stores them in localStorage.
- **Overall**: Most required screens exist and render. Critical requirement gaps remain in auth security, review schema, and startup/data flow constraints.

---

## Feature Coverage Matrix (Requirements vs Current State)

| Required Feature | Status | Evidence / Notes |
|---|---|---|
| Registration | **Partial** | Implemented in `vista-registrazione.js`; no password hashing; no “favorite dishes” field. |
| Login/Logout | **Partial** | Implemented in `vista-accesso.js` + `navbar.js`; stores plaintext password + remembers in `sessionStorage`. |
| Edit Profile | **Partial** | Implemented in `vista-profilo.js`; password confirmation uses plaintext. |
| Delete Profile | **Implemented** | `rimuoviUtente` removes user and reviews. |
| Recipe Search by Name | **Implemented (Local cache)** | `cercaRicettePerNome` filters preloaded cache. |
| Recipe Search by Ingredient | **Implemented (Local cache)** | `cercaRicettePerIngrediente` filters preloaded cache. |
| Recipe Search by Initial Letter | **Implemented (Local cache)** | `cercaRicettePerLettera`. |
| Recipe Detail Page | **Implemented** | `vista-dettaglio-ricetta.js` shows ingredients/instructions + reviews. |
| Personal Cookbook (add/remove) | **Implemented** | Stored on user object; buttons on cards and detail. |
| Private Notes per Recipe | **Implemented** | Note field in cookbook view. |
| Reviews (date cooked + difficulty 1‑5 + taste 1‑5) | **Missing/Partial** | Current schema uses `valutazione` (1‑5) + `difficolta` string; no taste score. |
| Add Review | **Partial** | Modal adds/updates review; missing required rating structure. |
| Remove Review | **Missing** | No delete path in UI or storage. |
| Startup data in web storage | **Partial** | Preload always runs and blocks UI; no cache metadata/TTL; fails offline first load. |

---

## Data Model Inventory (Current localStorage / sessionStorage)

### localStorage keys (from code)
- `ricette_cybercuisine` → **object map** of normalized recipes, keyed by `id`.
- `utenti_cybercuisine` → **array** of users.
- `utente_corrente_cybercuisine` → **user object** or `null`.
- `recensioni_cybercuisine` → **array** of reviews **(initialized but not actually used due to a key mismatch bug)**.

### sessionStorage keys
- `cc_accesso_ricorda` → `{ identificatore, password }` (plaintext).
- `cc_post_signup` → `{ identificatore, messaggio }`.

### JSON shape examples (observed in code)

**Recipe cache** (`ricette_cybercuisine`)
```json
{
  "52772": {
    "id": "52772",
    "nome": "Teriyaki Chicken Casserole",
    "categoria": "Chicken",
    "area": "Japanese",
    "areaCodice": "Japanese",
    "istruzioni": "…",
    "miniatura": "https://…/preview.jpg",
    "etichette": ["Meat", "Casserole"],
    "youtube": "https://www.youtube.com/watch?v=…",
    "fonte": "https://…",
    "ingredienti": [{ "nome": "Chicken", "quantita": "3 cups" }]
  }
}
```

**Users** (`utenti_cybercuisine`)
```json
[
  {
    "id": "utente_173377…",
    "nome": "Mario",
    "cognome": "Rossi",
    "nomeUtente": "mrossi",
    "email": "mario@email.it",
    "password": "plaintext",
    "paeseOrigine": "Italian",
    "paeseResidenza": "British",
    "ricettario": [{ "idRicetta": "52772", "nota": "Buonissima" }]
  }
]
```

**Current user** (`utente_corrente_cybercuisine`)
```json
{
  "id": "utente_173377…",
  "nomeUtente": "mrossi",
  "email": "mario@email.it",
  "password": "plaintext",
  "ricettario": []
}
```

**Reviews** (expected but bugged)
```json
[
  {
    "id": "recensione_1733…",
    "idRicetta": "52772",
    "idUtente": "utente_173377…",
    "dataPreparazione": "2026-02-10",
    "valutazione": 4,
    "difficolta": "media",
    "tempoPreparazione": 45,
    "consigliata": "si",
    "commento": "Ottima"
  }
]
```

---

## UI Map (Pages, Components, Navigation)

### Entry + Layout
- **`src/html/index.html`**: global layout, navbar, modals, `<main id="app">` as SPA mount.

### Fragments / Routes (hash routing)
- `#/home` → `home.html` + `vista-home.js` (public)
- `#/home` (logged) → `home.logged.html` + `vista-home-loggata.js`
- `#/accesso` → `login.html` + `vista-accesso.js`
- `#/registrazione` → `register.html` + `vista-registrazione.js`
- `#/profilo` → `profile.html` + `vista-profilo.js` (protected)
- `#/esplora` → `esplora.html` + `vista-esplora.js`
- `#/ricettario` → `ricettario.html` + `vista-ricettario.js` (protected)
- `#/recensioni` → `reviews.html` + `vista-recensioni.js` (protected)
- `#/ricetta/<id>` → `recipe-detail.html` + `vista-dettaglio-ricetta.js`

### Components
- `componenti/carte.js` → recipe cards, cookbook cards, review cards.
- `componenti/azioni-card.js` → cookbook/review actions on recipe cards.
- `componenti/modale-recensione.js` → review modal (create/edit).

---

## API Usage Map (TheMealDB)

**Base URL**: `https://www.themealdb.com/api/json/v1/1/`

| Endpoint | Usage | Caching |
|---|---|---|
| `search.php?f=<letter>` | Preload full catalog A–Z at startup | Stored in `ricette_cybercuisine` |
| `list.php?a=list` | Fetch areas (countries) for registration/profile | In‑memory cache only (no localStorage) |

**Not used (current)**:
- `search.php?s=...` (search by name)
- `filter.php?i=...` (search by ingredient)
- `lookup.php?i=...` (fetch recipe by id)

**Behavior notes**
- Startup blocks on `precaricaCatalogoRicette()` (26 fetches) and **always** re-downloads even if cache exists.
- No cache expiry, schema versioning, or offline‑first fallback beyond empty localStorage.

---

## Top 15 Issues (Severity, Impact, Repro, Fix Approach)

1. **[High] Reviews stored under wrong key (`undefined`)**
   - Impact: reviews not visible in expected storage key; breaks data flow demo.
   - Repro: add review, open DevTools → localStorage shows key `"undefined"`.
   - Fix: replace `CHIAVI_SALVATAGGIO.REVIEWS` with `.RECENSIONI`, add migration from `"undefined"` to `recensioni_cybercuisine`.

2. **[High] Plaintext password storage + “remember me” stores plaintext**
   - Impact: violates security requirement; exposes credentials.
   - Repro: register/login; inspect `utenti_cybercuisine` and `cc_accesso_ricorda`.
   - Fix: store salted hash (Web Crypto). For “remember me”, store a session token or simply store identifier only.

3. **[High] Reviews missing required schema (difficulty 1‑5 + taste 1‑5)**
   - Impact: fails exam spec; wrong data model.
   - Repro: open review modal; only one 1‑5 rating + difficulty string.
   - Fix: add two 1‑5 fields (difficulty, taste) and update UI/storage/cards.

4. **[High] No review deletion flow**
   - Impact: fails exam requirement (“inserimento e rimozione di recensioni”).
   - Repro: no delete control in detail or reviews list.
   - Fix: add delete action (per review id) and update storage + UI.

5. **[High] Startup blocks on full catalog fetch**
   - Impact: UI appears “stuck” on slow networks; fails offline first‑load.
   - Repro: throttle network; page stays blank until all fetches finish.
   - Fix: render UI immediately from cache, fetch in background, add cache meta.

6. **[Medium] Preload re-downloads entire catalog every load**
   - Impact: heavy API usage; slow startup; unnecessary network usage.
   - Repro: reload app; 26 requests always fire.
   - Fix: check cache meta + TTL before re-fetching.

7. **[Medium] `recuperaRicettaPerId` has no API fallback**
   - Impact: detail page fails if cache missing/incomplete.
   - Repro: clear storage; go directly to `#/ricetta/<id>`; recipe not found.
   - Fix: add `lookup.php?i=` fallback + cache insert.

8. **[Medium] Profile review count is stale**
   - Impact: profile shows incorrect “Recensioni scritte”.
   - Repro: add review; profile count remains 0 (uses `utente.recensioni`).
   - Fix: compute count from reviews storage or store derived count on save.

9. **[Medium] Storage schema not versioned**
   - Impact: future changes hard to migrate; violates explicit flow requirement.
   - Repro: none (design).
   - Fix: add `app:meta` with schema version + migration pipeline.

10. **[Medium] Cookbook stored inside user object (not explicit per‑user key)**
    - Impact: harder to demo flows; schema not aligned with requested design.
    - Repro: inspect `utenti_cybercuisine`.
    - Fix: move to `cookbook:<userId>` and migrate.

11. **[Low/Medium] `home.logged.html` has mismatched tags**
    - Impact: layout/DOM issues in some browsers.
    - Repro: validate HTML; inspect DOM structure.
    - Fix: add missing `</div>` to close container.

12. **[Low] “Remember me” uses sessionStorage (not persistent)**
    - Impact: user expectation mismatch; data lost on browser restart.
    - Repro: check “Ricordami”, close browser, reopen → credentials gone.
    - Fix: store token/identifier in localStorage or remove option.

13. **[Low] Docs mismatch: README path for `api.js`**
    - Impact: confusion for maintainers.
    - Repro: README references `src/js/api.js`, actual file is `src/js/gestione-api/api.js`.
    - Fix: update README or move file.

14. **[Low] Area list only cached in memory**
    - Impact: extra API call every load; slower on first render of forms.
    - Repro: open registration/profile; API call each time.
    - Fix: cache areas in localStorage with TTL.

15. **[Low] Review cards include fields not required (tempo, consigliata)**
    - Impact: UI drift from spec; extra data not explained.
    - Repro: open review modal; extra fields present.
    - Fix: either document as “extra features” or trim to spec.

---

## Refactor Opportunities (Low‑Risk First)

1. Fix review key typo + migrate data (`undefined` → `recensioni_cybercuisine`).
2. Fix HTML tag mismatch in `home.logged.html`.
3. Add `app:meta` schema version + storage helper layer (load/save/update).
4. Introduce password hashing via Web Crypto; remove plaintext exposure.
5. Split cookbook storage into `cookbook:<userId>`.
6. Add review delete action + update UI cards.
7. Add taste/difficulty 1‑5 ratings in review modal + cards.
8. Improve startup pipeline: render from cache, background refresh, TTL.
9. Add API fallback by ID + search fallback if cache empty.
10. Update docs/README with correct file paths and new schemas.

