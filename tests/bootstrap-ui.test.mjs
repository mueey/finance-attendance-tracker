import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(root,path),'utf8');

test('Bootstrap 5.3.6 is bundled locally and is the primary UI framework',()=>{
 const css=read('vendor/bootstrap.min.css'),bundle=read('vendor/bootstrap.bundle.min.js'),html=read('index.html');
 assert.match(css,/Bootstrap  v5\.3\.6/);
 assert.ok(bundle.length>50000,'local Bootstrap bundle is present');
 assert.match(html,/vendor\/bootstrap\.min\.css/);
 assert.match(html,/vendor\/bootstrap\.bundle\.min\.js/);
 assert.doesNotMatch(html,/https?:\/\//);
});

test('responsive sidebar uses Bootstrap Offcanvas component, not a hand-built drawer',()=>{
 const html=read('index.html'),app=read('js/app.js'),css=read('css/app.css');
 assert.match(html,/class="sidebar offcanvas-lg offcanvas-start"/);
 assert.match(html,/class="offcanvas-body sidebar-body"/);
 assert.match(html,/data-bs-dismiss="offcanvas"/);
 assert.match(app,/bootstrap\.Offcanvas\.getOrCreateInstance/);
 assert.match(app,/shown\.bs\.offcanvas/);
 assert.match(app,/hidden\.bs\.offcanvas/);
 assert.doesNotMatch(app,/sidebar\.classList\.toggle\('open'/);
 assert.doesNotMatch(css,/\.sidebar\.open/);
});

test('notifications use Bootstrap Toast plugin and safe escaped message text',()=>{
 const ui=read('js/core/ui.js');
 assert.match(ui,/bootstrap\.Toast\.getOrCreateInstance/);
 assert.match(ui,/data-bs-dismiss="toast"/);
 assert.match(ui,/\$\{html\(message\)\}/);
 assert.doesNotMatch(ui,/setTimeout\(\(\)=>elem\.remove\(\)/);
});

test('business logic remains modular while UI uses Bootstrap components',()=>{
 const app=read('js/app.js'),pkg=JSON.parse(read('package.json'));
 for(const path of ['js/features/attendance.js','js/features/productivity.js','js/features/settings.js','js/core/store.js','js/core/ui.js']) assert.ok(read(path).length>0,path);
 assert.match(app,/from '\.\/features\/attendance\.js'/);
 assert.match(app,/from '\.\/features\/productivity\.js'/);
 assert.equal(pkg.version,'4.5.5');
});
