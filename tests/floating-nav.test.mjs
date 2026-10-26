import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const html=read('index.html'),css=read('css/mobile.css'),icons=read('css/bootstrap-icons-local.css'),sw=read('sw.js');

test('floating mobile dock has inset, rounded corners, and clearance for page content',()=>{
 assert.match(css,/\.mobile-bottom-nav\{[\s\S]*?position:fixed;bottom:calc\(12px \+ env\(safe-area-inset-bottom/);
 assert.match(css,/left:50%;right:auto;transform:translateX\(-50%\)/);
 assert.match(css,/width:min\(480px,calc\(100% - 24px\)\)/);
 assert.match(css,/border:1px solid var\(--border\);border-radius:24px/);
 assert.match(css,/padding-bottom:calc\(122px \+ env\(safe-area-inset-bottom/);
 assert.match(css,/\.mobile-tab:focus-visible/);
});
test('navigation icons use local Bootstrap Icon SVG masks with no icon CDN',()=>{
 for(const name of ['house-door-fill','journal-check','calendar3','cash-coin','three-dots']){
  assert.match(html,new RegExp(`bi-${name}`));
  assert.match(icons,new RegExp(`bi-${name}`));
  assert.ok(existsSync(resolve(root,`vendor/bootstrap-icons/${name}.svg`)));
  const svg=read(`vendor/bootstrap-icons/${name}.svg`);
  assert.match(svg,/<svg[^>]+viewBox=/);assert.match(svg,/<path [^>]+d="/);
  assert.match(sw,new RegExp(`vendor/bootstrap-icons/${name}\\.svg`));
 }
 assert.match(html,/css\/bootstrap-icons-local\.css/);
 assert.match(sw,/css\/bootstrap-icons-local\.css/);
 assert.doesNotMatch(html,/(https?:\/\/[^'" ]*(icon|font))/i);
});
test('sidebar icons use Bootstrap SVG assets, and offline shell is pre-cached',()=>{
 for(const name of ['speedometer2','journal-text','clipboard-check','receipt','credit-card','graph-up','gear']){
  assert.match(html,new RegExp(`bi-${name}`));
  assert.ok(existsSync(resolve(root,`vendor/bootstrap-icons/${name}.svg`)));
 }
 assert.match(sw,/trackerist-v3\.0\.0/);
});
test('built-in finance labels use English only',()=>{
 for(const file of ['index.html','js/features/dashboard.js','js/features/bills.js','js/features/payments.js','js/features/reports.js']){
  assert.doesNotMatch(read(file),/bayronon|nabayaran/i,file);
 }
 assert.match(read('js/features/dashboard.js'),/Total charges/);
 assert.match(read('js/features/dashboard.js'),/Total paid/);
 assert.match(read('js/features/bills.js'),/Bills & Fees/);
});
