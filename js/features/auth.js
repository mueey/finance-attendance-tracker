// Single-device account. This is a UI convenience gate; local attendance data is NOT encrypted.
const AUTH_KEY = 'trackerist_v2_local_account';
const SESSION_KEY = 'trackerist_v2_session';
const REMEMBER_KEY = 'trackerist_v2_remembered_session';
const REMEMBER_FOR_MS = 30 * 24 * 60 * 60 * 1000;
const ITERATIONS = 210000;
let unlocked = false;
const codec = new TextEncoder();
const bytesToBase64 = bytes => btoa(String.fromCharCode(...bytes));
const base64ToBytes = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));

function cryptoAPI() {
 const c = globalThis.crypto;
 if (!c?.subtle || !c.getRandomValues) throw Error('Login requires HTTPS or localhost. Open the app through the included local server.');
 return c;
}
async function digest(password, salt, iterations) {
 const c = cryptoAPI();
 const key = await c.subtle.importKey('raw', codec.encode(password), 'PBKDF2', false, ['deriveBits']);
 return new Uint8Array(await c.subtle.deriveBits({name: 'PBKDF2', salt, iterations, hash: 'SHA-256'}, key, 256));
}
function authRecord() {
 const raw = localStorage.getItem(AUTH_KEY);
 if (!raw) return null;
 let obj;
 try { obj = JSON.parse(raw); } catch { throw Error('Stored local account information is damaged.'); }
 if (obj?.version !== 1 || !obj.username || !obj.salt || !obj.verifier || !Number.isSafeInteger(obj.iterations) || obj.iterations < 100000) {
  throw Error('Stored local account information is invalid.');
 }
 return obj;
}
function temporaryStorage() {
 // Some browsers disable sessionStorage (e.g. restrictive privacy settings).
 try { return globalThis.sessionStorage || null; } catch { return null; }
}
function clearSessions() {
 localStorage.removeItem(REMEMBER_KEY);
 try { temporaryStorage()?.removeItem(SESSION_KEY); } catch { /* A blocked session store cannot keep a login. */ }
}
function sessionValue(record, remember) {
 return JSON.stringify({
  version: 1,
  username: record.username,
  accountSalt: record.salt, // Changes on every password change; no password saved.
  expiresAt: remember ? Date.now() + REMEMBER_FOR_MS : null
 });
}
function keepSignedIn(record, remember) {
 // Clear the other session type when changing the option or re-authenticating.
 clearSessions();
 if (remember) {
  try { localStorage.setItem(REMEMBER_KEY, sessionValue(record, true)); }
  catch { throw Error('Your browser could not save Remember Me. Try again without it or check site storage settings.'); }
 } else {
  try { temporaryStorage()?.setItem(SESSION_KEY, sessionValue(record, false)); }
  catch { /* Sign-in still works in this tab without persistence. */ }
 }
 unlocked = true;
}
function validSession(raw, record, remember) {
 if (!raw || !record) return false;
 try {
  const session = JSON.parse(raw);
  return session?.version === 1 && session.username === record.username &&
   session.accountSalt === record.salt &&
   (remember ? Number.isFinite(session.expiresAt) && session.expiresAt > Date.now() : session.expiresAt === null);
 } catch { return false; }
}
export function accountExists() { return !!authRecord(); }
export function accountName() { return authRecord()?.username || ''; }
export function isUnlocked() { return unlocked; }

// Run on page startup. Persistent sessions last up to 30 days; unchecked sessions
// last only while the browser's sessionStorage survives. No plaintext password is saved.
export function restoreSession() {
 unlocked = false;
 const record = authRecord();
 if (!record) { clearSessions(); return false; }
 const remembered = localStorage.getItem(REMEMBER_KEY);
 if (validSession(remembered, record, true)) { unlocked = true; return true; }
 if (remembered) localStorage.removeItem(REMEMBER_KEY);
 const temporary = temporaryStorage();
 let session = null;
 try { session = temporary?.getItem(SESSION_KEY); } catch { /* Browser restriction. */ }
 if (validSession(session, record, false)) { unlocked = true; return true; }
 if (session) { try { temporary?.removeItem(SESSION_KEY); } catch { /* No session is trusted. */ } }
 return false;
}
export async function createAccount(username, password, remember = false) {
 if (accountExists()) throw Error('A local account already exists on this browser.');
 const user = String(username || '').trim();
 if (user.length < 3 || user.length > 60) throw Error('Username must be 3–60 characters.');
 if (typeof password !== 'string' || password.length < 8) throw Error('Password must be at least 8 characters.');
 const c = cryptoAPI(), salt = c.getRandomValues(new Uint8Array(16));
 const verifier = await digest(password, salt, ITERATIONS);
 const record = {version: 1, username: user, salt: bytesToBase64(salt), verifier: bytesToBase64(verifier), iterations: ITERATIONS};
 localStorage.setItem(AUTH_KEY, JSON.stringify(record));
 keepSignedIn(record, remember);
}
async function verifyPassword(username, password) {
 const record = authRecord();
 if (!record) throw Error('Create an account first.');
 const computed = await digest(String(password ?? ''), base64ToBytes(record.salt), record.iterations);
 const expected = base64ToBytes(record.verifier);
 let diff = computed.length ^ expected.length;
 for (let i = 0; i < Math.max(computed.length, expected.length); i++) diff |= (computed[i] ?? 0) ^ (expected[i] ?? 0);
 if (String(username ?? '').trim().toLowerCase() !== record.username.toLowerCase() || diff !== 0) {
  throw Error('Invalid username or password.');
 }
 return record;
}
export async function signIn(username, password, remember = false) {
 const record = await verifyPassword(username, password);
 keepSignedIn(record, remember);
}
export function signOut() {
 unlocked = false;
 clearSessions(); // Logout removes remembered and tab-only sessions.
}
export async function changePassword(oldPassword, newPassword) {
 const user = accountName();
 if (!unlocked) throw Error('Please log in first.');
 if (String(newPassword).length < 8) throw Error('New password must be at least 8 characters.');
 await verifyPassword(user, oldPassword);
 const wasRemembered = validSession(localStorage.getItem(REMEMBER_KEY), authRecord(), true);
 const c = cryptoAPI(), salt = c.getRandomValues(new Uint8Array(16));
 const verifier = await digest(newPassword, salt, ITERATIONS);
 const record = {version: 1, username: user, salt: bytesToBase64(salt), verifier: bytesToBase64(verifier), iterations: ITERATIONS};
 localStorage.setItem(AUTH_KEY, JSON.stringify(record));
 // Invalidate sessions made under the old password and refresh this device's session.
 keepSignedIn(record, wasRemembered);
}
