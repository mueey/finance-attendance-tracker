import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('sign-in and create-account show a single owner credit link',()=>{
 const html=read('index.html');
 assert.match(html,/Concept &amp; system owner: <strong>mue<\/strong>/);
 assert.equal((html.match(/id="auth-privacy-footer"/g)||[]).length,1);
 assert.equal((html.match(/href="\.\/credits.html"/g)||[]).length,2);
});
test('logged-in footer names mue and links credits',()=>{
 const html=read('index.html');
 assert.match(html,/<footer class="app-footer">Trackerist 3\.7[^<]*<span>•<\/span> Concept &amp; system by <strong>mue<\/strong>/);
});
test('credits page documents mue and preserves third-party attribution',()=>{
 assert.equal(existsSync(new URL('../credits.html',import.meta.url)),true);
 const html=read('credits.html');
 assert.match(html,/Original concept and system owner/);
 assert.match(html,/<strong>mue<\/strong>/);
 assert.match(html,/Bootstrap and Bootstrap Icons/);
 assert.match(html,/not by itself legally establish/);
 assert.match(html,/github\.com\/mueey\/trackerist/);
});
test('credits page included in offline pre-cache',()=>{
 const sw=read('sw.js');
 assert.match(sw,/trackerist-v3\.7\.0/);
 assert.match(sw,/'\.\/credits.html'/);
});
test('project meta credits owner',()=>{
 assert.match(read('index.html'),/<meta name="author" content="mue">/);
 assert.match(read('README.md'),/system owner \(project credit\): mue/);
});
