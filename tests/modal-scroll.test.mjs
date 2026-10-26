import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
const ui=fs.readFileSync(path.join(root,'js/core/ui.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

test('all shared editor forms use Bootstrap scrollable modal layout',()=>{
 assert.match(html,/modal-dialog-scrollable modal-fullscreen-sm-down/);
 assert.match(html,/<form id="editor-form" class="modal-content">\s*<div class="modal-header">/);
 assert.match(html,/<div class="modal-body" id="editor-modal-body" tabindex="0"><\/div>\s*<div class="modal-footer">/);
 assert.ok(html.indexOf('id="editor-modal-body"')>html.indexOf('<form id="editor-form" class="modal-content">'));
 assert.match(ui,/editorBody\.scrollTop=0/);
});
test('scrolling stays confined to modal body, with visible footer and mobile height',()=>{
 assert.match(css,/#editor-modal \.modal-body\{[^}]*overflow-y:auto/);
 assert.match(css,/#editor-modal \.modal-header,#editor-modal \.modal-footer\{flex-shrink:0\}/);
 assert.match(css,/#editor-modal \.modal-dialog\{height:100dvh\}/);
 assert.match(css,/\.sidebar\{overflow-y:auto/);
});
test('service worker uses a new cache for the mobile UI update',()=>{
 assert.match(sw,/trackerist-v3\.1\.0/);
 assert.match(sw,/\.\/css\/app\.css/);
 assert.match(sw,/\.\/index\.html/);
 assert.match(sw,/\.\/js\/core\/ui\.js/);
});
