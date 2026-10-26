import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState} from '../js/core/migrate.js';
import {initStore,replaceState} from '../js/core/store.js';
import {render} from '../js/features/dashboard.js';

const memory = new Map();
globalThis.localStorage = {getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v))};
initStore();

test('semester subject/event details start collapsed while headline metrics stay visible',()=>{
 const s=initialState();s.semesters=[{id:'fall',name:'Fall Semester',startDate:'2026-08-01',endDate:'2026-12-31'}];
 s.settings.selectedSemesterId='fall';
 s.courses=[
  {id:'c1',code:'MTH1',name:'Math',type:'class',weekdays:[1],startDate:'2026-08-01',endDate:'2026-12-31',time:'08:00',fineRate:0,archived:false},
  {id:'c2',code:'ORG1',name:'Campus Event',type:'event',weekdays:[4],startDate:'2026-08-01',endDate:'2026-12-31',time:'09:00',fineRate:50,archived:false},
 ];
 s.attendance=[{id:'r1',courseId:'c1',date:'2026-10-05',status:'present'},{id:'r2',courseId:'c2',date:'2026-10-08',status:'absent',slots:{amIn:'absent',amOut:'present',pmIn:'absent',pmOut:'excused'}}];
 replaceState(s);
 const markup=render();
 assert.match(markup,/SEMESTER ATTENDANCE SUMMARY/);
 assert.match(markup,/Semester attendance rate/);
 assert.match(markup,/id="semester-subject-toggle"[^>]*data-bs-toggle="collapse"[^>]*data-bs-target="#semester-subject-collapse"[^>]*aria-expanded="false"/);
 assert.match(markup,/id="semester-subject-collapse" class="collapse "/);
 assert.match(markup,/Subjects &amp; Events/);
 assert.match(markup,/Math/);
 assert.match(markup,/Campus Event/);
 assert.match(markup,/role="region" aria-label="Scrollable subject and event attendance details" tabindex="0"/);
 assert.match(markup,/bi-icon bi-chevron-down/);
});

test('offline service worker caches the locally stored Bootstrap Icons chevron',()=>{
 const css=fs.readFileSync(new URL('../css/bootstrap-icons-local.css',import.meta.url),'utf8');
 const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const icon=fs.readFileSync(new URL('../vendor/bootstrap-icons/chevron-down.svg',import.meta.url),'utf8');
 assert.match(css,/\.bi-chevron-down\{--bi-icon:url\("\.\.\/vendor\/bootstrap-icons\/chevron-down\.svg"\)\}/);
 assert.match(sw,/bootstrap-icons\/chevron-down.svg/);
 assert.match(sw,/trackerist-v3\.2\.0/);
 assert.match(icon,/class="bi bi-chevron-down"/);
});

test('collapse uses Bootstrap and provides a bounded 2-way scroll region for phones',()=>{
 const css=fs.readFileSync(new URL('../css/app.css',import.meta.url),'utf8');
 const mobile=fs.readFileSync(new URL('../css/mobile.css',import.meta.url),'utf8');
 const js=fs.readFileSync(new URL('../js/features/dashboard.js',import.meta.url),'utf8');
 assert.match(css,/\.semester-subject-panel \.semester-course-table\{[^}]*max-height:340px;overflow:auto/);
 assert.match(mobile,/\.semester-course-table table\{min-width:610px\}/);
 assert.match(css,/\.semester-subject-toggle\[aria-expanded="true"\] \.semester-chevron\{transform:rotate\(180deg\)\}/);
 assert.match(js,/addEventListener\('show.bs.collapse'/);
 assert.match(js,/addEventListener\('hide.bs.collapse'/);
});
