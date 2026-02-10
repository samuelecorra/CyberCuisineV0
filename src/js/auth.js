const textEncoder = new TextEncoder();

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function randomBytesBase64(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bufferToBase64(bytes);
}

export function generaSalt(byteLength = 16) {
  return randomBytesBase64(byteLength);
}

export async function calcolaHashPassword(password, salt) {
  const payload = textEncoder.encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return bufferToBase64(digest);
}

export async function creaCredenzialiPassword(password) {
  const salt = generaSalt();
  const passwordHash = await calcolaHashPassword(password, salt);
  return { salt, passwordHash };
}

export async function verificaPassword(password, utente) {
  if (!utente) return false;
  if (!utente.passwordHash || !utente.salt) {
    return utente.password === password;
  }
  const hash = await calcolaHashPassword(password, utente.salt);
  return hash === utente.passwordHash;
}
