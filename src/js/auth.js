// ============================================================================
//  MODULO AUTENTICAZIONE — Hashing delle password (Web Crypto API)
// ============================================================================
// SCELTA IMPLEMENTATIVA: NON salviamo mai la password in chiaro nel web storage.
// Salviamo invece l'hash SHA-256 della password combinata con un "salt" casuale.
//   - salt  = sequenza casuale unica per ogni utente (rende l'hash diverso anche per
//             password identiche e blocca gli attacchi con tabelle precalcolate "rainbow").
//   - hash  = SHA-256( salt + ":" + password ), funzione a senso unico (non invertibile).
// In fase di login NON confrontiamo password con password, ma hash con hash.
//
// >>> COSA VEDRÀ IL PROF NEI DEVTOOLS <<<
//   F12 → Application → Local Storage → chiave "users". Ogni utente avrà i campi
//   "passwordHash" e "salt" (stringhe Base64) e NESSUN campo "password".
//   Questo è il punto chiave da mostrare: la password digitata non è ricostruibile dallo storage.

// TextEncoder converte una stringa JS (UTF-16) in byte UTF-8: è l'input richiesto da crypto.subtle.
const textEncoder = new TextEncoder();

// Converte un ArrayBuffer/insieme di byte in stringa Base64, così l'hash/il salt sono
// serializzabili come testo dentro il JSON di localStorage.
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary); // btoa = "binary to ASCII" (codifica Base64 nativa del browser)
}

// Genera byte crittograficamente casuali (crypto.getRandomValues) e li restituisce in Base64.
function randomBytesBase64(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes); // sorgente di casualità sicura, non Math.random()
  return bufferToBase64(bytes);
}

// Genera il salt (16 byte → 24 caratteri Base64) da associare a un utente al momento della registrazione.
export function generaSalt(byteLength = 16) {
  return randomBytesBase64(byteLength);
}

// Calcola l'hash SHA-256 di "salt:password". È async perché crypto.subtle.digest restituisce una Promise.
export async function calcolaHashPassword(password, salt) {
  const payload = textEncoder.encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", payload); // ArrayBuffer di 32 byte
  return bufferToBase64(digest);
}

// Crea la coppia { salt, passwordHash } da memorizzare. Chiamata in REGISTRAZIONE e quando si
// cambia password nel PROFILO. NB: la password in chiaro resta solo in una variabile locale e
// non viene mai scritta da nessuna parte.
export async function creaCredenzialiPassword(password) {
  const salt = generaSalt();
  const passwordHash = await calcolaHashPassword(password, salt);
  return { salt, passwordHash };
}

// Verifica la password inserita al LOGIN (o nella conferma profilo) contro l'utente salvato.
// Riapplichiamo lo stesso hash usando il salt dell'utente e confrontiamo i due hash.
export async function verificaPassword(password, utente) {
  if (!utente) return false;
  // Fallback di compatibilità: se un vecchio utente avesse ancora la password in chiaro
  // (campo "password" senza hash/salt), confrontiamo direttamente. Gli utenti nuovi non passano di qui.
  if (!utente.passwordHash || !utente.salt) {
    return utente.password === password;
  }
  const hash = await calcolaHashPassword(password, utente.salt);
  return hash === utente.passwordHash; // true solo se le password coincidono
}
