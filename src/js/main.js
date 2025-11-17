// SPA principale di CyberCuisine – gestione router, storage e viste

// Chiavi centralizzate per il Web Storage: evitiamo stringhe “magiche” sparse nel codice
const STORAGE_KEYS = {
  MEALS: "pgrc_meals",
  USERS: "pgrc_users",
  CURRENT_USER: "pgrc_currentUser",
  REVIEWS: "pgrc_reviews"
};

// URL base dell’API TheMealDB utilizzata per cercare e scaricare ricette
const API_BASE = "https://www.themealdb.com/api/json/v1/1/";

// Mappa delle route logiche della SPA:
// - ogni chiave è un hash (es. "#/home")
// - template: frammento HTML da caricare
// - onLoad: funzione JS che inizializza gli handler dopo che la vista è stata iniettata
// - auth: se true la route è accessibile solo da utente loggato
const ROUTES = {
  "#/home": { template: "./home.html", onLoad: initHomeView },
  "#/login": { template: "./login.html", onLoad: initLoginView },
  "#/register": { template: "./register.html", onLoad: initRegisterView },
  "#/profile": { template: "./profile.html", onLoad: initProfileView, auth: true },
  "#/search": { template: "./search.html", onLoad: initSearchView },
  "#/cookbook": { template: "./cookbook.html", onLoad: initCookbookView, auth: true },
  "#/reviews": { template: "./reviews.html", onLoad: initReviewsView, auth: true },
  "#/recipe": { template: "./recipe-detail.html", onLoad: initRecipeDetailView }
};

// Stato globale dell’applicazione:
// - fragmentsCache: cache dei frammenti HTML già scaricati via fetch
// - searchResults: ultimi risultati della ricerca ricette
// - activeRoute: hash corrente (utile per gestione nav attiva)
const appState = {
  fragmentsCache: {},
  searchResults: [],
  activeRoute: "#/home"
};

// Appena il DOM è pronto, parte l’inizializzazione della SPA
document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  // Inizializza le strutture in localStorage, se non presenti
  initStorage();
  // Imposta gli eventi per il link di login/logout nella navbar
  setupNavAuthEvents();
  // Precarica alcune ricette “di esempio” per popolare subito cache e home
  await preloadFeaturedMeals();
  // Ascolta i cambi di hash nell’URL (navigazione SPA)
  window.addEventListener("hashchange", handleRouteChange);
  // Gestisce la prima route (es. quando apro la pagina su #/search, #/home, ecc.)
  await handleRouteChange();
}

// --------------------------
// Router
// --------------------------

// Funzione principale di routing: decide quale vista mostrare in base all’hash
async function handleRouteChange() {
  // Se non c’è hash, imponiamo la home come default
  let hash = window.location.hash || "#/home";
  // Per sicurezza: se l’hash non rispetta il formato "#/..."
  if (!hash.startsWith("#/")) {
    hash = "#/home";
  }

  // routeKey: chiave con cui guardiamo nella mappa ROUTES
  // dynamicParam: parametro dinamico (es. id ricetta) per route come "#/recipe/<id>"
  let routeKey = hash;
  let dynamicParam = null;

  // Gestione speciale per route dinamica delle ricette:
  // - "#/recipe/52772" diventa:
  //   - routeKey = "#/recipe"
  //   - dynamicParam = "52772"
  if (hash.startsWith("#/recipe/")) {
    routeKey = "#/recipe";
    dynamicParam = hash.split("/")[2];
  }

  // Cerchiamo la configurazione della route
  const routeConfig = ROUTES[routeKey];
  if (!routeConfig) {
    // Route non definita → 404
    renderNotFound();
    return;
  }

  // Se la route richiede autenticazione ma non c’è utente loggato → redirect a login
  if (routeConfig.auth && !getCurrentUser()) {
    window.location.hash = "#/login";
    return;
  }

  // Aggiorniamo lo stato della route attiva
  appState.activeRoute = hash;
  try {
    // Carichiamo il frammento HTML associato alla route
    const fragment = await loadFragment(routeConfig.template);
    const appContainer = document.getElementById("app");
    // Iniettiamo il markup nella SPA
    appContainer.innerHTML = fragment;

    // Se è definita una funzione di inizializzazione per la vista, la invochiamo
    if (typeof routeConfig.onLoad === "function") {
      await routeConfig.onLoad(dynamicParam);
    }

    // Aggiorniamo la navbar per evidenziare il link corrispondente alla route
    updateActiveNav(hash);
    // Aggiorniamo il link Login/Logout in base allo stato utente corrente
    updateNavAuthState();
  } catch (error) {
    console.error("Errore durante il rendering della route", error);
    // In caso di errori imprevisti → messaggio di errore generico
    renderRouteError();
  }
}

// Carica e cache-izza un frammento HTML (home.html, search.html, ecc.)
async function loadFragment(path) {
  // Se il frammento è già in cache lo riutilizziamo (niente refetch)
  if (appState.fragmentsCache[path]) {
    return appState.fragmentsCache[path];
  }

  // Recupero dal server (il path è relativo a src/html/)
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Impossibile caricare la vista");
  }
  const html = await response.text();
  // Salviamo in cache per future navigazioni
  appState.fragmentsCache[path] = html;
  return html;
}

// Render della pagina 404 (route non esistente)
function renderNotFound() {
  const appContainer = document.getElementById("app");
  appContainer.innerHTML = `
        <section class="text-center py-5">
            <h1 class="display-6">Pagina non trovata</h1>
            <p class="text-muted">Il percorso richiesto non esiste. Torna alla <a href="#/home">home</a>.</p>
        </section>
    `;
}

// Render di una pagina di errore generico (problema durante il caricamento di una vista)
function renderRouteError() {
  const appContainer = document.getElementById("app");
  appContainer.innerHTML = `
        <section class="text-center py-5">
            <h1 class="display-6">Errore imprevisto</h1>
            <p class="text-muted">Si è verificato un problema nel caricamento della vista. Riprova tra qualche istante.</p>
        </section>
    `;
}

// Gestisce la classe "active" sui link della navbar in base alla route corrente
function updateActiveNav(targetHash) {
  const navLinks = document.querySelectorAll("#ccNavLinks .nav-link");
  navLinks.forEach(link => {
    const linkHash = link.getAttribute("href");
    // Se il link non è un vero link SPA (non inizia con "#/"), lo escludiamo
    if (!linkHash || !linkHash.startsWith("#/")) {
      link.classList.remove("active");
      return;
    }
    // Consideriamo attivo un link se l’hash corrente “inizia con” il suo href
    // Es: "#/recipe/123" fa risultare attivo "#/recipe"
    const isActive = targetHash.startsWith(linkHash);
    if (isActive) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// --------------------------
// Storage helpers
// --------------------------

// Inizializza il localStorage con le chiavi base, se non sono presenti
function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.MEALS)) {
    saveToStorage(STORAGE_KEYS.MEALS, {});
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    saveToStorage(STORAGE_KEYS.USERS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.REVIEWS)) {
    saveToStorage(STORAGE_KEYS.REVIEWS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
    saveToStorage(STORAGE_KEYS.CURRENT_USER, null);
  }
}

// Lettura generica da localStorage con gestione degli errori e valore di default
function loadFromStorage(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (error) {
    console.error("Errore lettura storage", error);
    return defaultValue;
  }
}

// Scrittura generica in localStorage, serializzando in JSON
function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Helpers specifici per utenti
function getUsers() {
  return loadFromStorage(STORAGE_KEYS.USERS, []);
}

function saveUsers(users) {
  saveToStorage(STORAGE_KEYS.USERS, users);
}

// Utente attualmente loggato (o null)
function getCurrentUser() {
  return loadFromStorage(STORAGE_KEYS.CURRENT_USER, null);
}

function setCurrentUser(user) {
  saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
}

// Helpers per la cache delle ricette
function getMealsCache() {
  return loadFromStorage(STORAGE_KEYS.MEALS, {});
}

function saveMealsCache(cache) {
  saveToStorage(STORAGE_KEYS.MEALS, cache);
}

// Aggiunge un array di ricette alla cache, indicizzandole per id
function cacheMeals(meals = []) {
  const cache = getMealsCache();
  meals.forEach(meal => {
    if (meal?.id) {
      cache[meal.id] = meal;
    }
  });
  saveMealsCache(cache);
}

// Helpers per recensioni
function getReviews() {
  return loadFromStorage(STORAGE_KEYS.REVIEWS, []);
}

function saveReviews(reviews) {
  saveToStorage(STORAGE_KEYS.REVIEWS, reviews);
}

// Aggiorna o crea un utente nella lista utenti + sincronizza currentUser se serve
function persistUser(updatedUser) {
  const users = getUsers();
  const index = users.findIndex(u => u.id === updatedUser.id);
  if (index !== -1) {
    users[index] = updatedUser;
  } else {
    users.push(updatedUser);
  }
  saveUsers(users);
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === updatedUser.id) {
    setCurrentUser(updatedUser);
  }
}

// Rimuove un utente, le sue recensioni e aggiorna currentUser se necessario
function removeUser(userId) {
  const remaining = getUsers().filter(user => user.id !== userId);
  saveUsers(remaining);
  const filteredReviews = getReviews().filter(review => review.userId !== userId);
  saveReviews(filteredReviews);
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setCurrentUser(null);
  }
}

// --------------------------
// API helpers
// --------------------------

// Wrapper generico per chiamare l’API TheMealDB e gestire errori HTTP
async function queryApi(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error("Errore di rete con TheMealDB");
  }
  return response.json();
}

// Ricerca ricette per nome (search.php?s=)
async function fetchMealsByName(name) {
  if (!name?.trim()) return [];
  const data = await queryApi(`search.php?s=${encodeURIComponent(name.trim())}`);
  return normalizeMealList(data.meals);
}

// Ricerca ricette per iniziale (search.php?f=)
async function fetchMealsByFirstLetter(letter) {
  if (!letter?.trim()) return [];
  const data = await queryApi(`search.php?f=${encodeURIComponent(letter.trim())}`);
  return normalizeMealList(data.meals);
}

// Ricerca ricette per ingrediente (filter.php?i=)
// filter.php restituisce meno info → per ognuna facciamo lookup per id per ottenere il dettaglio completo
async function fetchMealsByIngredient(ingredient) {
  if (!ingredient?.trim()) return [];
  const listData = await queryApi(`filter.php?i=${encodeURIComponent(ingredient.trim())}`);
  const meals = listData.meals ?? [];
  // Limitiamo il numero di richieste successive per non stressare l’API
  const limited = meals.slice(0, 12);
  const detailed = await Promise.all(limited.map(meal => fetchMealById(meal.idMeal)));
  return detailed.filter(Boolean);
}

// Ricerca ricetta singola per id (lookup.php?i=)
async function fetchMealById(id) {
  if (!id) return null;
  const data = await queryApi(`lookup.php?i=${encodeURIComponent(id)}`);
  const meal = data.meals?.[0];
  return meal ? normalizeMeal(meal) : null;
}

// Normalizza una lista di oggetti "raw" in array di oggetti meal interni
function normalizeMealList(rawMeals) {
  if (!rawMeals) return [];
  return rawMeals.map(normalizeMeal);
}

// Converte un oggetto ricetta della API in un oggetto interno più pulito
function normalizeMeal(meal) {
  const ingredients = [];
  // TheMealDB espone ingredienti come strIngredient1..20 + strMeasure1..20
  for (let i = 1; i <= 20; i += 1) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push({
        name: ingredient.trim(),
        measure: measure?.trim() ?? ""
      });
    }
  }

  return {
    id: meal.idMeal,
    name: meal.strMeal,
    category: meal.strCategory ?? "N/D",
    area: meal.strArea ?? "N/D",
    instructions: meal.strInstructions ?? "Istruzioni non disponibili",
    thumbnail: meal.strMealThumb ?? "",
    tags: meal.strTags ? meal.strTags.split(",").map(tag => tag.trim()) : [],
    youtube: meal.strYoutube ?? "",
    source: meal.strSource ?? "",
    ingredients
  };
}

// Garantisce che una ricetta sia presente in cache: se manca, la scarica e la salva
async function ensureMealInCache(mealId) {
  const cache = getMealsCache();
  if (cache[mealId]) {
    return cache[mealId];
  }
  const meal = await fetchMealById(mealId);
  if (meal) {
    cacheMeals([meal]);
  }
  return meal;
}

// --------------------------
// Navbar e autenticazione
// --------------------------

// Imposta i listener specifici per il link di autenticazione (Login/Logout)
function setupNavAuthEvents() {
  const authLink = document.getElementById("ccAuthLink");
  if (!authLink) return;
  authLink.addEventListener("click", event => {
    // Se lo stato del link è "logout", intercettiamo il click e non navighiamo
    if (authLink.dataset.action === "logout") {
      event.preventDefault();
      handleLogout();
    }
  });
  // All’avvio sincronizziamo il testo del link con lo stato utente
  updateNavAuthState();
}

// Aggiorna il link di autenticazione nella navbar in base a currentUser
function updateNavAuthState() {
  const authLink = document.getElementById("ccAuthLink");
  if (!authLink) return;
  const user = getCurrentUser();
  if (user) {
    // Utente loggato → mostriamo "Logout"
    authLink.textContent = "Logout";
    authLink.href = "#/home";
    authLink.dataset.action = "logout";
  } else {
    // Nessun utente loggato → mostriamo "Registrati / Accedi" e indirizziamo in base alla presenza di utenti salvati
    const hasUsers = getUsers().length > 0;
    authLink.textContent = "Registrati / Accedi";
    authLink.href = hasUsers ? "#/login" : "#/register";
    delete authLink.dataset.action;
  }
}

// Esegue il logout: azzera currentUser, aggiorna nav e torna alla home
function handleLogout() {
  setCurrentUser(null);
  updateNavAuthState();
  window.location.hash = "#/home";
}

// --------------------------
// Startup data
// --------------------------

// Precarica alcune ricette “in evidenza” all’avvio (per non avere app vuota)
async function preloadFeaturedMeals() {
  const cache = getMealsCache();
  // Se abbiamo già ricette in cache, non facciamo nulla
  if (Object.keys(cache).length > 0) return;
  try {
    // Carichiamo ricette che iniziano per "a" e ne prendiamo 8 come sample
    const meals = await fetchMealsByFirstLetter("a");
    cacheMeals(meals.slice(0, 8));
  } catch (error) {
    console.warn("Impossibile precaricare ricette", error);
  }
}

// --------------------------
// View controllers
// --------------------------

// Vista home: al momento non fa nulla di dinamico, ma puoi arricchirla in futuro
function initHomeView() {
  // Vista statica: si potrebbe arricchire con suggerimenti dinamici
}

// Inizializza la vista di login: attach handler al form e gestisce autenticazione
function initLoginView() {
  // Se l’utente è già loggato, non ha senso mostrare il login → redirigiamo a home
  if (getCurrentUser()) {
    window.location.hash = "#/home";
    return;
  }
  const form = document.getElementById("loginForm");
  const alertBox = document.getElementById("loginAlert");
  form?.addEventListener("submit", event => {
    event.preventDefault();
    const identifier = document.getElementById("loginIdentifier").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const users = getUsers();
    // Possiamo loggare con username o email, purché la password coincida
    const user = users.find(
      u => (u.username === identifier || u.email === identifier) && u.password === password
    );
    if (!user) {
      showAlert(alertBox, "Credenziali non valide.");
      return;
    }
    setCurrentUser(user);
    updateNavAuthState();
    window.location.hash = "#/home";
  });
}

// Inizializza la vista di registrazione utente
function initRegisterView() {
  // Se c’è già un utente loggato, registrarsi non ha senso → redirigiamo a home
  if (getCurrentUser()) {
    window.location.hash = "#/home";
    return;
  }
  const form = document.getElementById("registerForm");
  const alertBox = document.getElementById("registerAlert");
  form?.addEventListener("submit", event => {
    event.preventDefault();
    const username = document.getElementById("registerUsername").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const confirmPassword = document.getElementById("registerPasswordConfirm").value.trim();
    const favorites = document.getElementById("registerFavorites").value.trim();

    // Validazioni minime lato client
    if (!username || !email || !password) {
      showAlert(alertBox, "Compila tutti i campi obbligatori.");
      return;
    }
    if (password.length < 6) {
      showAlert(alertBox, "La password deve contenere almeno 6 caratteri.");
      return;
    }
    if (password !== confirmPassword) {
      showAlert(alertBox, "Le password non coincidono.");
      return;
    }
    const users = getUsers();
    // Verifichiamo unicità di username o email
    const alreadyExists = users.some(user => user.username === username || user.email === email);
    if (alreadyExists) {
      showAlert(alertBox, "Username o email già utilizzati.");
      return;
    }

    // Creiamo un nuovo utente base: avrà un id, credenziali e un ricettario vuoto
    const newUser = {
      id: generateId("user"),
      username,
      email,
      password,
      favorites,
      cookbook: []
    };
    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);
    updateNavAuthState();
    window.location.hash = "#/profile";
  });
}

// Inizializza la vista profilo: mostra info utente, permette update, logout e cancellazione
function initProfileView() {
  const user = getCurrentUser();
  if (!user) {
    window.location.hash = "#/login";
    return;
  }
  // Mostra info utente in un pannello riepilogativo
  renderProfileInfo(user);
  const form = document.getElementById("profileForm");
  const successAlert = document.getElementById("profileAlertSuccess");
  const errorAlert = document.getElementById("profileAlertError");
  const logoutBtn = document.getElementById("logoutBtn");
  const deleteBtn = document.getElementById("deleteProfileBtn");

  // Precompiliamo i campi del form con i dati attuali
  document.getElementById("profileEmail").value = user.email;
  document.getElementById("profileFavorites").value = user.favorites ?? "";

  form?.addEventListener("submit", event => {
    event.preventDefault();
    const email = document.getElementById("profileEmail").value.trim();
    const favorites = document.getElementById("profileFavorites").value.trim();
    if (!email) {
      showAlert(errorAlert, "Email obbligatoria.");
      return;
    }
    // Creiamo un clone aggiornato dell’oggetto utente
    const updated = { ...user, email, favorites };
    persistUser(updated);
    renderProfileInfo(updated);
    showAlert(successAlert, "Profilo aggiornato con successo.", "success");
  });

  // Pulsante di logout diretto dalla pagina profilo
  logoutBtn?.addEventListener("click", handleLogout);
  // Pulsante per eliminazione definitiva del profilo
  deleteBtn?.addEventListener("click", () => {
    const confirmDelete = confirm("Sei sicuro di voler eliminare il profilo?");
    if (!confirmDelete) return;
    removeUser(user.id);
    updateNavAuthState();
    window.location.hash = "#/home";
  });
}

// Aggiorna il pannello di riepilogo delle informazioni utente
function renderProfileInfo(user) {
  const container = document.getElementById("profileInfo");
  const cookbookCount = user.cookbook?.length ?? 0;
  container.innerHTML = `
        <ul class="list-group list-group-flush">
            <li class="list-group-item bg-transparent text-white"><strong>Username:</strong> ${
              user.username
            }</li>
            <li class="list-group-item bg-transparent text-white"><strong>Email:</strong> ${
              user.email
            }</li>
            <li class="list-group-item bg-transparent text-white"><strong>Piatti preferiti:</strong> ${
              user.favorites || "Non specificati"
            }</li>
            <li class="list-group-item bg-transparent text-white"><strong>Ricette salvate:</strong> ${cookbookCount}</li>
        </ul>
    `;
}

// Inizializza la vista di ricerca ricette
function initSearchView() {
  // Mostriamo gli eventuali risultati precedenti già salvati in appState
  renderSearchResults(appState.searchResults);
  const buttons = document.querySelectorAll("#searchControls button[data-search]");
  // Ogni bottone corrisponde a un tipo di ricerca (per nome, ingrediente, lettera)
  buttons.forEach(btn => {
    btn.addEventListener("click", async () => {
      const type = btn.dataset.search;
      await handleSearch(type);
    });
  });
}

// Gestisce una ricerca in base al tipo scelto
async function handleSearch(type) {
  const countBadge = document.getElementById("searchCount");
  countBadge.textContent = "Ricerca in corso…";
  let results = [];
  try {
    if (type === "name") {
      const value = document.getElementById("searchByName").value;
      results = await fetchMealsByName(value);
    } else if (type === "ingredient") {
      const value = document.getElementById("searchByIngredient").value;
      results = await fetchMealsByIngredient(value);
    } else if (type === "letter") {
      const value = document.getElementById("searchByLetter").value;
      results = await fetchMealsByFirstLetter(value);
    }
    // Aggiorniamo la cache locale con i risultati trovati
    cacheMeals(results);
  } catch (error) {
    console.error("Errore durante la ricerca", error);
  }
  // Salviamo i risultati nello stato globale e li rendiamo
  appState.searchResults = results;
  renderSearchResults(results);
}

// Costruisce il markup dei risultati della ricerca e aggiorna il contatore
function renderSearchResults(results = []) {
  const container = document.getElementById("searchResults");
  const countBadge = document.getElementById("searchCount");
  if (!container || !countBadge) return;
  countBadge.textContent = `${results.length} ricette`;
  if (results.length === 0) {
    container.innerHTML = '<p class="text-muted">Nessun risultato. Prova con un altro termine.</p>';
    return;
  }
  // Ogni ricetta viene resa come card Bootstrap con un pulsante “Dettagli”
  container.innerHTML = results.map(meal => renderMealCard(meal)).join("");
}

// Restituisce la card HTML per una singola ricetta (usata nella ricerca)
function renderMealCard(meal) {
  return `
        <div class="col-md-4">
            <div class="card card-glow h-100">
                <img src="${meal.thumbnail}" class="card-img-top" alt="${meal.name}" />
                <div class="card-body d-flex flex-column">
                    <h3 class="h5">${meal.name}</h3>
                    <p class="text-muted mb-2">${meal.category} · ${meal.area}</p>
                    <div class="mt-auto">
                        <a class="btn btn-outline-accent w-100" href="#/recipe/${meal.id}">Dettagli</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Inizializza la vista ricettario personale
async function initCookbookView() {
  const user = getCurrentUser();
  if (!user) {
    window.location.hash = "#/login";
    return;
  }
  const list = document.getElementById("cookbookList");
  const badge = document.getElementById("cookbookCount");
  list.innerHTML = '<p class="text-muted">Caricamento ricette...</p>';
  // Per ogni entry nel ricettario (mealId + nota) recuperiamo il dettaglio della ricetta
  const recipes = await Promise.all(
    (user.cookbook ?? []).map(async entry => {
      const meal = await ensureMealInCache(entry.mealId);
      return { meal, note: entry.note ?? "" };
    })
  );
  badge.textContent = `${recipes.filter(item => item.meal).length} ricette`;
  if (recipes.length === 0) {
    list.innerHTML =
      '<p class="text-muted">Il ricettario è vuoto. Visita una ricetta e salvala.</p>';
    return;
  }
  // Renderizziamo tutte le card del ricettario
  list.innerHTML = recipes
    .filter(item => item.meal)
    .map(({ meal, note }) => renderCookbookCard(meal, note))
    .join("");

  // Gestione click (delegata) per i pulsanti “Rimuovi”
  list.onclick = event => {
    const target = event.target;
    if (target.matches("[data-remove-meal]")) {
      const mealId = target.dataset.removeMeal;
      updateCookbook(mealId, false);
      initCookbookView();
    }
  };

  // Gestione cambio note private per ogni ricetta
  list.onchange = event => {
    const target = event.target;
    if (target.matches("[data-note-meal]")) {
      const mealId = target.dataset.noteMeal;
      updateCookbookNote(mealId, target.value);
    }
  };
}

// Card di una singola ricetta nel ricettario con textarea per nota privata
function renderCookbookCard(meal, note = "") {
  return `
        <div class="col-md-6">
            <div class="card card-glow h-100">
                <div class="row g-0 h-100">
                    <div class="col-md-4">
                        <img src="${meal.thumbnail}" class="img-fluid rounded-start h-100 object-fit-cover" alt="${meal.name}" />
                    </div>
                    <div class="col-md-8">
                        <div class="card-body d-flex flex-column">
                            <h3 class="h5">${meal.name}</h3>
                            <p class="text-muted mb-2">${meal.category} · ${meal.area}</p>
                            <div class="mb-3">
                                <label class="form-label">Nota privata</label>
                                <textarea class="form-control" rows="2" data-note-meal="${meal.id}">${note}</textarea>
                            </div>
                            <div class="mt-auto d-flex gap-2">
                                <a class="btn btn-outline-accent" href="#/recipe/${meal.id}">Dettagli</a>
                                <button class="btn btn-danger" data-remove-meal="${meal.id}">Rimuovi</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Inizializza la vista “Le mie recensioni”
async function initReviewsView() {
  const user = getCurrentUser();
  if (!user) {
    window.location.hash = "#/login";
    return;
  }
  const reviewsContainer = document.getElementById("reviewsList");
  // Filtriamo solo le recensioni dell’utente loggato
  const reviews = getReviews().filter(review => review.userId === user.id);
  if (reviews.length === 0) {
    reviewsContainer.innerHTML = '<p class="text-muted">Ancora nessuna recensione salvata.</p>';
    return;
  }
  // Per ogni recensione recuperiamo info ricetta e costruiamo la card
  const cards = await Promise.all(
    reviews.map(async review => {
      const meal = await ensureMealInCache(review.recipeId);
      return renderReviewCard(review, meal);
    })
  );
  reviewsContainer.innerHTML = cards.join("");
}

// Card singola di recensione nella pagina “Le mie recensioni”
function renderReviewCard(review, meal) {
  return `
        <div class="col-md-6">
            <div class="card card-glow h-100">
                <div class="card-body">
                    <h3 class="h5">${meal?.name ?? "Ricetta"}</h3>
                    <p class="text-muted">Preparata il ${review.dataPreparazione}</p>
                    <p class="mb-1">Difficoltà: <strong>${review.difficolta}/5</strong></p>
                    <p class="mb-1">Gusto: <strong>${review.gusto}/5</strong></p>
                    <p class="small text-muted">${review.commento || "Nessun commento."}</p>
                    <a class="btn btn-outline-accent" href="#/recipe/${
                      review.recipeId
                    }">Vai alla ricetta</a>
                </div>
            </div>
        </div>
    `;
}

// Inizializza la vista di dettaglio ricetta: info ricetta + ricettario + recensioni
async function initRecipeDetailView(mealId) {
  const wrapper = document.getElementById("recipeDetail");
  if (!mealId || !wrapper) {
    wrapper.innerHTML = '<p class="text-danger">Ricetta non trovata.</p>';
    return;
  }
  wrapper.innerHTML = '<p class="text-muted">Caricamento dettagli ricetta...</p>';
  // Ci assicuriamo che la ricetta sia in cache (altrimenti la carichiamo ora)
  const meal = await ensureMealInCache(mealId);
  if (!meal) {
    wrapper.innerHTML = '<p class="text-danger">Impossibile recuperare la ricetta.</p>';
    return;
  }
  const user = getCurrentUser();
  const inCookbook = user?.cookbook?.some(entry => entry.mealId === meal.id);
  const currentNote = user?.cookbook?.find(entry => entry.mealId === meal.id)?.note ?? "";

  // Costruiamo dinamicamente il layout a due colonne:
  // - sinistra: dettaglio ricetta
  // - destra: ricettario + recensioni
  wrapper.innerHTML = `
        <div class="col-lg-7">
            <div class="card card-glow mb-4">
                <img src="${meal.thumbnail}" class="card-img-top" alt="${meal.name}" />
                <div class="card-body">
                    <p class="text-uppercase text-accent mb-1">${meal.category} · ${meal.area}</p>
                    <h1 class="h3 mb-3">${meal.name}</h1>
                    <div class="mb-3">
                        <h2 class="h6 text-uppercase">Ingredienti</h2>
                        <ul class="list-unstyled small">
                            ${meal.ingredients
                              .map(item => `<li>• ${item.measure} ${item.name}</li>`)
                              .join("")}
                        </ul>
                    </div>
                    <div>
                        <h2 class="h6 text-uppercase">Istruzioni</h2>
                        <p class="text-pre-line">${meal.instructions}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-lg-5">
            <div class="card card-glow mb-4">
                <div class="card-body">
                    <h2 class="h5 mb-3">Ricettario personale</h2>
                    ${
                      user
                        ? `
                            <button class="btn btn-primary w-100 mb-3" id="cookbookToggleBtn">${
                              inCookbook ? "Rimuovi dal ricettario" : "Aggiungi al ricettario"
                            }</button>
                            <label for="cookbookNote" class="form-label">Nota privata</label>
                            <textarea class="form-control" id="cookbookNote" rows="3" ${
                              inCookbook ? "" : "disabled"
                            }>${currentNote}</textarea>
                        `
                        : '<p class="text-muted">Accedi per salvare la ricetta e annotare le tue prove.</p>'
                    }
                </div>
            </div>
            <div class="card card-glow">
                <div class="card-body">
                    <h2 class="h5 mb-3">Recensioni</h2>
                    <div id="reviewsContainer"></div>
                    ${
                      user
                        ? renderReviewForm(meal.id)
                        : '<p class="text-muted">Effettua il login per lasciare una recensione.</p>'
                    }
                </div>
            </div>
        </div>
    `;

  // Se l’utente è loggato, colleghiamo i vari handler (ricettario e recensioni)
  if (user) {
    // Pulsante per aggiungere/rimuovere la ricetta dal ricettario
    document.getElementById("cookbookToggleBtn").addEventListener("click", () => {
      updateCookbook(meal.id, !inCookbook);
      // Ricarichiamo la stessa vista per riflettere lo stato aggiornato
      initRecipeDetailView(meal.id);
    });
    // Gestione nota privata
    const noteField = document.getElementById("cookbookNote");
    noteField?.addEventListener("change", () => {
      updateCookbookNote(meal.id, noteField.value);
    });
    // Gestione form recensione
    const reviewForm = document.getElementById("reviewForm");
    reviewForm?.addEventListener("submit", event => {
      event.preventDefault();
      handleReviewSubmit(meal.id, reviewForm);
    });
    // Se esiste già una recensione dell’utente, precompiliamo il form
    populateReviewForm(meal.id, reviewForm);
  }
  // In ogni caso, mostriamo la lista delle recensioni esistenti
  renderReviewsList(meal.id);
}

// Restituisce il markup HTML del form recensione da inserire nel dettaglio ricetta
function renderReviewForm(mealId) {
  const today = new Date().toISOString().split("T")[0];
  return `
        <hr class="border-secondary my-4" />
        <h3 class="h6 text-uppercase">La tua recensione</h3>
        <form id="reviewForm" class="mt-3" data-meal-id="${mealId}">
            <div class="mb-2">
                <label class="form-label" for="reviewDate">Data preparazione</label>
                <input type="date" class="form-control" id="reviewDate" value="${today}" required />
            </div>
            <div class="mb-2">
                <label class="form-label" for="reviewDifficulty">Difficoltà (1-5)</label>
                <input type="number" class="form-control" id="reviewDifficulty" min="1" max="5" value="3" required />
            </div>
            <div class="mb-2">
                <label class="form-label" for="reviewTaste">Gusto (1-5)</label>
                <input type="number" class="form-control" id="reviewTaste" min="1" max="5" value="4" required />
            </div>
            <div class="mb-3">
                <label class="form-label" for="reviewComment">Commento</label>
                <textarea class="form-control" id="reviewComment" rows="2" placeholder="Note personali"></textarea>
            </div>
            <button class="btn btn-outline-accent w-100" type="submit">Salva recensione</button>
        </form>
    `;
}

// Se esiste una recensione precedente dell’utente per quella ricetta, riempie il form con i valori salvati
function populateReviewForm(mealId, form) {
  if (!form) return;
  const user = getCurrentUser();
  const existing = getReviews().find(
    review => review.recipeId === mealId && review.userId === user?.id
  );
  if (!existing) return;
  form.querySelector("#reviewDate").value = existing.dataPreparazione;
  form.querySelector("#reviewDifficulty").value = existing.difficolta;
  form.querySelector("#reviewTaste").value = existing.gusto;
  form.querySelector("#reviewComment").value = existing.commento ?? "";
}

// Renderizza la lista delle recensioni per una determinata ricetta
function renderReviewsList(mealId) {
  const container = document.getElementById("reviewsContainer");
  const reviews = getReviews().filter(review => review.recipeId === mealId);
  if (reviews.length === 0) {
    container.innerHTML = '<p class="text-muted">Ancora nessuna recensione per questa ricetta.</p>';
    return;
  }
  const users = getUsers();
  container.innerHTML = reviews
    .map(review => {
      const author = users.find(user => user.id === review.userId);
      return `
                <div class="border rounded border-secondary p-3 mb-3">
                    <p class="small text-accent mb-1">${author?.username ?? "Utente"}</p>
                    <p class="text-muted mb-1">Data: ${review.dataPreparazione}</p>
                    <p class="mb-1">Difficoltà: <strong>${review.difficolta}/5</strong></p>
                    <p class="mb-1">Gusto: <strong>${review.gusto}/5</strong></p>
                    <p class="small">${review.commento || "Nessun commento disponibile."}</p>
                </div>
            `;
    })
    .join("");
}

// Gestisce il submit del form recensione (creazione/aggiornamento)
function handleReviewSubmit(mealId, form) {
  const user = getCurrentUser();
  if (!user) {
    window.location.hash = "#/login";
    return;
  }
  const dataPreparazione = form.querySelector("#reviewDate").value;
  const difficolta = Number(form.querySelector("#reviewDifficulty").value);
  const gusto = Number(form.querySelector("#reviewTaste").value);
  const commento = form.querySelector("#reviewComment").value.trim();
  // Validazione minima
  if (!dataPreparazione || difficolta < 1 || gusto < 1) {
    return;
  }
  const reviews = getReviews();
  // Cerchiamo se esiste già una recensione dello stesso utente per quella ricetta
  const existingIndex = reviews.findIndex(
    review => review.recipeId === mealId && review.userId === user.id
  );
  const payload = {
    id: existingIndex !== -1 ? reviews[existingIndex].id : generateId("review"),
    recipeId: mealId,
    userId: user.id,
    dataPreparazione,
    difficolta,
    gusto,
    commento
  };
  if (existingIndex !== -1) {
    // Aggiorniamo la recensione esistente
    reviews[existingIndex] = payload;
  } else {
    // Aggiungiamo una nuova recensione
    reviews.push(payload);
  }
  saveReviews(reviews);
  renderReviewsList(mealId);
}

// --------------------------
// Cookbook helpers
// --------------------------

// Aggiunge o rimuove una ricetta dal ricettario dell’utente
function updateCookbook(mealId, shouldAdd) {
  const user = getCurrentUser();
  if (!user) {
    window.location.hash = "#/login";
    return;
  }
  const cookbook = [...(user.cookbook ?? [])];
  const index = cookbook.findIndex(entry => entry.mealId === mealId);
  if (shouldAdd && index === -1) {
    cookbook.push({ mealId, note: "" });
  }
  if (!shouldAdd && index !== -1) {
    cookbook.splice(index, 1);
  }
  const updatedUser = { ...user, cookbook };
  persistUser(updatedUser);
}

// Aggiorna la nota privata associata a una ricetta nel ricettario
function updateCookbookNote(mealId, note) {
  const user = getCurrentUser();
  if (!user) return;
  const cookbook = [...(user.cookbook ?? [])];
  const index = cookbook.findIndex(entry => entry.mealId === mealId);
  if (index === -1) return;
  cookbook[index] = { ...cookbook[index], note };
  const updatedUser = { ...user, cookbook };
  persistUser(updatedUser);
}

// --------------------------
// Utility
// --------------------------

// Mostra un messaggio di alert Bootstrap in un elemento già presente nel DOM
// type può essere "danger" (errore) o "success" (conferma)
function showAlert(element, message, type = "danger") {
  if (!element) return;
  element.textContent = message;
  element.classList.remove("d-none", "alert-danger", "alert-success");
  element.classList.add(`alert-${type}`);
}

// Generatore generico di id testuali per user/review, basato su timestamp e random
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}
