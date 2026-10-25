// Local single-user sign-in. The verifier is salted+stretched, but app data is NOT encrypted.
const AUTH_KEY='trackerist_v2_local_account';
const ITERATIONS=210000;
let unlocked=false;
const codec=new TextEncoder();
const bytesToBase64=bytes=>btoa(String.fromCharCode(...bytes));
const base64ToBytes=str=>Uint8Array.from(atob(str),c=>c.charCodeAt(0));
function cryptoAPI(){const c=globalThis.crypto;if(!c?.subtle||!c.getRandomValues)throw Error('Login requires HTTPS or localhost. Open the app through the included local server.');return c;}
async function digest(password,salt,iterations){const c=cryptoAPI();const key=await c.subtle.importKey('raw',codec.encode(password),'PBKDF2',false,['deriveBits']);return new Uint8Array(await c.subtle.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-256'},key,256));}
function authRecord(){const raw=localStorage.getItem(AUTH_KEY);if(!raw)return null;let obj;try{obj=JSON.parse(raw);}catch{throw Error('Stored local account information is damaged.');}if(obj?.version!==1||!obj.username||!obj.salt||!obj.verifier||!Number.isSafeInteger(obj.iterations)||obj.iterations<100000)throw Error('Stored local account information is invalid.');return obj;}
export function accountExists(){return !!authRecord();}
export function accountName(){return authRecord()?.username||'';}
export function isUnlocked(){return unlocked;}
export async function createAccount(username,password){
 if(accountExists())throw Error('A local account already exists on this browser.');
 const user=String(username||'').trim();if(user.length<3||user.length>60)throw Error('Username must be 3–60 characters.');
 if(typeof password!=='string'||password.length<8)throw Error('Password must be at least 8 characters.');
 const c=cryptoAPI(),salt=c.getRandomValues(new Uint8Array(16));
 const verifier=await digest(password,salt,ITERATIONS);
 localStorage.setItem(AUTH_KEY,JSON.stringify({version:1,username:user,salt:bytesToBase64(salt),verifier:bytesToBase64(verifier),iterations:ITERATIONS}));
 unlocked=true;
}
export async function signIn(username,password){
 const record=authRecord();if(!record)throw Error('Create an account first.');
 const computed=await digest(String(password??''),base64ToBytes(record.salt),record.iterations);
 const expected=base64ToBytes(record.verifier);
 let diff=computed.length^expected.length;
 for(let i=0;i<Math.max(computed.length,expected.length);i++)diff|=(computed[i]??0)^(expected[i]??0);
 if(username.trim().toLowerCase()!==record.username.toLowerCase()||diff!==0)throw Error('Invalid username or password.');
 unlocked=true;
}
export function signOut(){unlocked=false;}
export async function changePassword(oldPassword,newPassword){
 const user=accountName();if(!unlocked)throw Error('Please log in first.');
 if(String(newPassword).length<8)throw Error('New password must be at least 8 characters.');
 await signIn(user,oldPassword);
 const c=cryptoAPI(),salt=c.getRandomValues(new Uint8Array(16));const verifier=await digest(newPassword,salt,ITERATIONS);
 localStorage.setItem(AUTH_KEY,JSON.stringify({version:1,username:user,salt:bytesToBase64(salt),verifier:bytesToBase64(verifier),iterations:ITERATIONS}));
}
