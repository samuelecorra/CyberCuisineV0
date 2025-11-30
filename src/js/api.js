import { BASE_API } from "./costanti.js";
import {
  ottieniCacheRicette,
  salvaCacheRicette,
  memorizzaRicette,
  adattaRicettaMemorizzata
} from "./storage.js";
import { generaId } from "./ui.js";

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
  const datiElenco = await interrogaApi(`filter.php?i=${encodeURIComponent(ingrediente.trim())}`);
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

export async function cercaRicettePerArea(area, limite = 4) {
  if (!area?.trim()) return [];
  const dati = await interrogaApi(`filter.php?a=${encodeURIComponent(area.trim())}`);
  const elenco = dati.meals ?? [];
  if (elenco.length === 0) return [];
  const mescolato = elenco.sort(() => Math.random() - 0.5);
  const selezionato = mescolato.slice(0, limite);
  const dettagliate = await Promise.all(selezionato.map(item => recuperaRicettaPerId(item.idMeal)));
  const pronte = dettagliate.filter(Boolean);
  memorizzaRicette(pronte);
  return pronte;
}

// --------------------------
// Aree (dinamiche da TheMealDB)
// --------------------------

let cacheAree = null;

export async function ottieniAreeCucina() {
  if (cacheAree) return cacheAree;
  const dati = await interrogaApi("list.php?a=list");
  const aree = (dati.meals ?? [])
    .map(item => item.strArea?.trim())
    .filter(Boolean)
    .map(nomeEn => ({
      nomeEn,
      nomeIt: traduciAreaEnIt(nomeEn),
      emoji: emojiPerArea(nomeEn)
    }))
    .sort((a, b) => a.nomeIt.localeCompare(b.nomeIt, "it"));
  cacheAree = aree;
  return aree;
}

const EMOJI_AREE = {
  algerian: "🇩🇿",
  american: "🇺🇸",
  argentinian: "🇦🇷",
  australian: "🇦🇺",
  brazilian: "🇧🇷",
  british: "🇬🇧",
  canadian: "🇨🇦",
  chilean: "🇨🇱",
  chinese: "🇨🇳",
  croatian: "🇭🇷",
  dutch: "🇳🇱",
  dutchcaribbean: "🇧🇶",
  egyptian: "🇪🇬",
  filipino: "🇵🇭",
  finnish: "🇫🇮",
  french: "🇫🇷",
  german: "🇩🇪",
  greek: "🇬🇷",
  hungarian: "🇭🇺",
  indian: "🇮🇳",
  irish: "🇮🇪",
  italian: "🇮🇹",
  jamaican: "🇯🇲",
  japanese: "🇯🇵",
  kenyan: "🇰🇪",
  malaysian: "🇲🇾",
  maldivian: "🇲🇻",
  mexican: "🇲🇽",
  moroccan: "🇲🇦",
  norwegian: "🇳🇴",
  peruvian: "🇵🇪",
  philippine: "🇵🇭",
  polish: "🇵🇱",
  portuguese: "🇵🇹",
  russian: "🇷🇺",
  "saudi arabian": "🇸🇦",
  slovak: "🇸🇰",
  slovakian: "🇸🇰",
  spanish: "🇪🇸",
  swedish: "🇸🇪",
  syrian: "🇸🇾",
  thai: "🇹🇭",
  tunisian: "🇹🇳",
  turkish: "🇹🇷",
  ukrainian: "🇺🇦",
  uruguayan: "🇺🇾",
  venezulan: "🇻🇪",
  vietnamese: "🇻🇳"
};

const TRADUZIONI_AREE = {
  italian: "Italia",
  american: "Stati Uniti",
  british: "Regno Unito",
  canadian: "Canada",
  chinese: "Cina",
  croatian: "Croazia",
  dutch: "Paesi Bassi",
  egyptian: "Egitto",
  filipino: "Filippine",
  french: "Francia",
  greek: "Grecia",
  indian: "India",
  irish: "Irlanda",
  jamaican: "Giamaica",
  japanese: "Giappone",
  kenyan: "Kenya",
  malaysian: "Malesia",
  mexican: "Messico",
  moroccan: "Marocco",
  polish: "Polonia",
  portuguese: "Portogallo",
  russian: "Russia",
  spanish: "Spagna",
  thai: "Thailandia",
  tunisian: "Tunisia",
  turkish: "Turchia",
  vietnamese: "Vietnam",
  ukrainian: "Ucraina",
  hungarian: "Ungheria",
  norwegian: "Norvegia",
  slovak: "Slovacchia",
  german: "Germania",
  argentinian: "Argentina",
  peruvian: "Perù",
  maldivian: "Maldive",
  finnish: "Finlandia",
  swedish: "Svezia",
  australian: "Australia",
  algerian: "Algeria",
  dutchcaribbean: "Caraibi olandesi",
  saudiarabian: "Arabia Saudita",
  "saudi arabian": "Arabia Saudita",
  syrian: "Siria",
  uruguayan: "Uruguay",
  venezuelan: "Venezuela",
  venezulan: "Venezuela",
  slovakian: "Slovacchia"
};

function emojiPerArea(nomeEn) {
  return EMOJI_AREE[nomeEn?.toLowerCase()] ?? "🌐";
}

export function descriviArea(nomeEn) {
  return `${emojiPerArea(nomeEn)} ${traduciAreaEnIt(nomeEn)}`;
}

export function traduciAreaEnIt(nomeEn) {
  if (!nomeEn) return "Non specificata";
  const key = nomeEn.toLowerCase();
  return TRADUZIONI_AREE[key] ?? nomeEn;
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
    etichette: datiRicetta.strTags ? datiRicetta.strTags.split(",").map(tag => tag.trim()) : [],
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
