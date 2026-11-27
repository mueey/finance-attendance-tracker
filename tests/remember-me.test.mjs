import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAccount,signIn,signOut,changePassword,isUnlocked,restoreSession} from '../js/features/auth.js';

function storage() {
 const m = new Map();
 return {getItem: key => m.get(key) ?? null, setItem: (key, value) => m.set(key, String(value)), removeItem: key => m.delete(key), clear: () => m.clear()};
}
const local = storage(), session = storage();
globalThis.localStorage = local;
globalThis.sessionStorage = session;
const PERMANENT = 'trackerist_v2_remembered_session';
const TEMPORARY = 'trackerist_v2_session';
const ACCOUNT = 'trackerist_v2_local_account';

test('unchecked Remember Me is a tab-session login and logout clears it', async () => {
 await createAccount('student','test-password-2026',false);
 assert.equal(isUnlocked(),true);
 assert.equal(local.getItem(PERMANENT),null);
 assert.ok(session.getItem(TEMPORARY));
 assert.equal(restoreSession(),true); // Simulated page restart while tab persists.
 signOut();
 assert.equal(isUnlocked(),false);
 assert.equal(session.getItem(TEMPORARY),null);
 assert.equal(restoreSession(),false);
});

test('remembered login survives restart without storing the password and expires', async () => {
 await signIn('student','test-password-2026',true);
 const saved=local.getItem(PERMANENT);
 assert.ok(saved);
 assert.equal(session.getItem(TEMPORARY),null);
 assert.ok(JSON.parse(saved).expiresAt > Date.now());
 assert.ok(!saved.includes('test-password-2026'));
 assert.equal(restoreSession(),true);
 const expired={...JSON.parse(saved),expiresAt:Date.now()-1000};
 local.setItem(PERMANENT,JSON.stringify(expired));
 assert.equal(restoreSession(),false);
 assert.equal(local.getItem(PERMANENT),null);
});

test('wrong password cannot create a remembered session; successful sign in can', async () => {
 await assert.rejects(signIn('student','incorrect-password',true),/Invalid username or password/);
 assert.equal(local.getItem(PERMANENT),null);
 await signIn('student','test-password-2026',true);
 assert.equal(restoreSession(),true);
});

test('changing the password refreshes the remembered account identity; old markers fail', async () => {
 const before=local.getItem(PERMANENT);
 await changePassword('test-password-2026','new-password-2026');
 assert.equal(restoreSession(),true);
 assert.notEqual(local.getItem(PERMANENT),before);
 const current=local.getItem(PERMANENT);
 local.setItem(PERMANENT,before);
 assert.equal(restoreSession(),false); // Old password's salt no longer matches.
 local.setItem(PERMANENT,current);
 assert.equal(restoreSession(),true);
 signOut();
 assert.equal(restoreSession(),false);
 await assert.rejects(signIn('student','test-password-2026',true),/Invalid username or password/);
 await signIn('student','new-password-2026',false);
 assert.equal(local.getItem(PERMANENT),null);
 assert.ok(session.getItem(TEMPORARY));
});

test('missing local account does not unlock saved browser sessions', async () => {
 assert.equal(restoreSession(),true);
 const acc=local.getItem(ACCOUNT);
 local.removeItem(ACCOUNT);
 assert.equal(restoreSession(),false);
 assert.equal(session.getItem(TEMPORARY),null);
 local.setItem(ACCOUNT,acc);
});

test('auth view shows only one privacy link at once and includes Remember Me checkbox', () => {
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
 const policy=fs.readFileSync(new URL('../privacy.html',import.meta.url),'utf8');
 assert.match(html,/id="auth-remember"/);
 assert.match(html,/id="auth-privacy-footer"/);
 assert.equal((html.match(/href="\.\/privacy\.html"/g)||[]).length,1);
 assert.match(app,/auth-privacy-wrap'\)\.classList\.toggle\('d-none',!create\)/);
 assert.match(app,/restoreSession\(\)\)openDashboard\(\);else showAuth\(\)/);
 assert.match(policy,/Remember Me/);
 assert.match(policy,/30 days/);
});
