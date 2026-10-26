import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root = new URL('../',import.meta.url);
const file = path => readFileSync(new URL(path,root),'utf8');
const html=file('index.html'),css=file('css/mobile.css'),app=file('js/app.js'),mobile=file('js/core/mobile.js'),sw=file('sw.js');
test('mobile has a five-item bottom tab bar with direct attendance access',()=>{
 assert.match(html, /id="mobile-bottom-nav"/);
 for(const route of ['dashboard','attendance','calendar','fines']) assert.match(html,new RegExp(`class="mobile-tab"[^>]*data-route="${route}"|data-route="${route}" class="mobile-tab"`));
 assert.match(html,/id="mobile-more"[^>]*aria-controls="sidebar"/);
});
test('mobile navigation works with screen reader states and escape key',()=>{
 assert.match(app,/moreButton\.onclick/);
 assert.match(app,/sidebar\.inert=/);
 assert.match(html,/id="sidebar-close"/);
 assert.match(app,/aria-expanded/);
 assert.match(app,/event\.key==='Escape'/);
 assert.match(html,/aria-label="Mobile shortcuts"/);
});
test('records use original table nodes with field labels and not cloned actions',()=>{
 assert.match(mobile,/cell\.dataset\.label = labels\[i\]/);
 assert.doesNotMatch(mobile,/cloneNode/);
 assert.match(mobile,/MutationObserver/);
 assert.match(css,/\.mobile-stack-table tbody tr\{display:block/);
});
test('mobile editor and quick actions fit in short phone viewports',()=>{
 assert.match(css,/#editor-modal \.modal-dialog\{height:100dvh/);
 assert.match(css,/#editor-modal \.modal-footer>.btn\{min-height:44px/);
 assert.match(css,/\.attendance-quick-actions\{display:grid/);
 assert.match(css,/env\(safe-area-inset-bottom/);
});
test('new styles and modular mobile script are pre-cached',()=>{
 assert.match(html,/css\/mobile\.css/);
 assert.match(sw,/\.\/css\/mobile\.css/);
 assert.match(sw,/\.\/js\/core\/mobile\.js/);
});
