import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
test('all service worker precache files exist on disk',()=>{const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');const match=sw.match(/const FILES=(\[[\s\S]*?\]);/);assert.ok(match);const files=JSON.parse(match[1].replaceAll("'",'"'));for(const f of files){assert.ok(fs.existsSync(path.join(root,f.replace(/^\.\//,''))),`missing ${f}`);}});
test('no external CDN references in HTML shell',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.ok(!/src="https?:|href="https?:/.test(html));assert.ok(html.includes('vendor/bootstrap.min.css'));assert.ok(html.includes('vendor/bootstrap.bundle.min.js'));});
