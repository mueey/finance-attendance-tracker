import test from 'node:test';
import assert from 'node:assert/strict';
import {accountExists,createAccount,signIn,signOut,changePassword,isUnlocked} from '../js/features/auth.js';
const db=new Map();globalThis.localStorage={getItem:k=>db.get(k)??null,setItem:(k,v)=>db.set(k,String(v))};
test('local login: registration, password check, logout, change password',async()=>{
 assert.equal(accountExists(),false);
 await assert.rejects(createAccount('ab','12345678'),/3–60/);
 await assert.rejects(createAccount('student','123'),/8 characters/);
 await createAccount('student','correct-horse-battery');
 assert.equal(accountExists(),true);assert.equal(isUnlocked(),true);
 const stored=JSON.parse([...db.values()][0]);assert.ok(stored.salt);assert.ok(stored.verifier);assert.ok(!JSON.stringify(stored).includes('correct-horse-battery'));
 signOut();assert.equal(isUnlocked(),false);
 await assert.rejects(signIn('student','wrong-password'),/Invalid username/);
 assert.equal(isUnlocked(),false);
 await signIn('STUDENT','correct-horse-battery');assert.equal(isUnlocked(),true);
 await changePassword('correct-horse-battery','new-password-2026');
 signOut();await assert.rejects(signIn('student','correct-horse-battery'),/Invalid username/);
 await signIn('student','new-password-2026');assert.equal(isUnlocked(),true);
});
