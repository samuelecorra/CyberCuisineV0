import { BASE_API } from "./costanti.js";
import {
  ottieniCacheRicette,
  salvaCacheRicette,
  memorizzaRicette,
  adattaRicettaMemorizzata
} from "./storage.js";

// Chiamata generica alle API TheMealDB
export async function interrogaApi(endpoint) {
  const risposta = await fetch(`${BASE_API}${endpoint}`);
  if (!risposta.ok) {
    throw new Error("Errore di rete con TheMealDB");
  }
  return risposta.json();
}

export async function cercaRicettePerNome(nome) {
  if (!nome?.trim()) return [];
  const dati = await interrogaApi(`search.php?s=${encodeURIComponent(nome.trim())}`);
  return normalizzaElencoRicette(dati.meals);
}

export async function cercaRicettePerLettera(lettera) {
  if (!lettera?.trim()) return [];
  const dati = await interrogaApi(`search.php?f=${encodeURIComponent(lettera.trim())}`);
  return normalizzaElencoRicette(dati.meals);
}

export async function cercaRicettePerIngrediente(ingrediente) {
  if (!ingrediente?.trim()) return [];
  const datiElenco = await interrogaApi(
    `filter.php?i=${encodeURIComponent(ingrediente.trim())}`
  );
  const ricetteTrovate = datiElenco.meals ?? [];
  const ricetteLimitate = ricetteTrovate.slice(0, 12);
  const dettagliate = await Promise.all(
    ricetteLimitate.map(ricetta => recuperaRicettaPerId(ricetta.idMeal))
  );
  return dettagliate.filter(Boolean);
}

export async function recuperaRicettaPerId(id) {
  if (!id) return null;
  const dati = await interrogaApi(`lookup.php?i=${encodeURIComponent(id)}`);
  const ricettaApi = dati.meals?.[0];
  return ricettaApi ? normalizzaRicetta(ricettaApi) : null;
}

export function normalizzaElencoRicette(ricetteRaw) {
  if (!ricetteRaw) return [];
  return ricetteRaw.map(normalizzaRicetta);
}

export function normalizzaRicetta(datiRicetta) {
  const ingredienti = [];
  for (let i = 1; i <= 20; i += 1) {
    const ingrediente = datiRicetta[`strIngredient${i}`];
    const quantita = datiRicetta[`strMeasure${i}`];
    if (ingrediente && ingrediente.trim()) {
      ingredienti.push({
        nome: ingrediente.trim(),
        quantita: quantita?.trim() ?? ""
      });
    }
  }

  return {
    id: datiRicetta.idMeal,
    nome: datiRicetta.strMeal,
    categoria: datiRicetta.strCategory ?? "N/D",
    area: datiRicetta.strArea ?? "N/D",
    istruzioni: datiRicetta.strInstructions ?? "Istruzioni non disponibili",
    miniatura: datiRicetta.strMealThumb ?? "",
    etichette: datiRicetta.strTags
      ? datiRicetta.strTags.split(",").map(tag => tag.trim())
      : [],
    youtube: datiRicetta.strYoutube ?? "",
    fonte: datiRicetta.strSource ?? "",
    ingredienti
  };
}

export async function garantisciRicettaInCache(idRicetta) {
  const cache = ottieniCacheRicette();
  if (cache[idRicetta]) {
    const ricettaAdattata = adattaRicettaMemorizzata(cache[idRicetta]);
    if (!cache[idRicetta].nome && ricettaAdattata) {
      cache[idRicetta] = ricettaAdattata;
      salvaCacheRicette(cache);
    }
    return ricettaAdattata;
  }
  const ricetta = await recuperaRicettaPerId(idRicetta);
  if (ricetta) {
    memorizzaRicette([ricetta]);
  }
  return ricetta;
}

export async function precaricaRicetteInEvidenza() {
  const cache = ottieniCacheRicette();
  if (Object.keys(cache).length > 0) return;
  try {
    const ricette = await cercaRicettePerLettera("a");
    memorizzaRicette(ricette.slice(0, 8));
  } catch (errore) {
    console.warn("Impossibile precaricare ricette", errore);
  }
}
