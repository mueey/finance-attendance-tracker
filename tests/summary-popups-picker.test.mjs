import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filterAttendanceCourses,coursePickerMarkup} from '../js/core/course-picker.js';
import {initialState} from '../js/core/migrate.js';
import {initStore,replaceState} from '../js/core/store.js';
import {render as dashboard} from '../js/features/dashboard.js';
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v))};
initStore();
const courses=[
 {id:'mat',name:'Mathematics',type:'class',code:'MTH-01'},
 {id:'ev1',name:'General Assembly',type:'event',code:'GA'},
 {id:'ev2',name:'Programming Night',type:'event',code:'P-02'},
 {id:'ev3',name:'Welcome Assembly',type:'event',code:'WELCOME'},
];
test('attendance picker searches subject name, code, event type without case sensitivity',()=>{
 assert.deepEqual(filterAttendanceCourses(courses,'ASSEMBLY').map(c=>c.id),['ev1','ev3']);
 assert.deepEqual(filterAttendanceCourses(courses,'p-02').map(c=>c.id),['ev2']);
 assert.deepEqual(filterAttendanceCourses(courses,' event ').map(c=>c.id),['ev1','ev2','ev3']);
 assert.equal(filterAttendanceCourses(courses,'a name not here').length,0);
 assert.equal(filterAttendanceCourses(courses).length,courses.length);
});
test('picker has accessible search, independent saved ID and scrollable results without native select',()=>{
 const html=coursePickerMarkup(courses,'ev2');
 assert.match(html,/type="search"[^>]+id="attendance-course-search"/);
 assert.match(html,/name="courseId" value="ev2"/);
 assert.match(html,/role="region" aria-label="Scrollable matching subjects and events"/);
 assert.match(html,/Selected: <strong id="attendance-selected-course-name">Programming Night/);
 assert.doesNotMatch(html,/<select[^>]*name="courseId"/);
 const js=fs.readFileSync(new URL('../js/features/attendance.js',import.meta.url),'utf8');
 assert.match(js,/bindCoursePicker\(form,courses,sync\)/);
 assert.match(js,/coursePickerMarkup\(courses,courseId\)/);
 const css=fs.readFileSync(new URL('../css/app.css',import.meta.url),'utf8');
 assert.match(css,/\.attendance-course-results\{[^}]*max-height:210px;[^}]*overflow-y:auto/);
});
test('picker HTML escapes untrusted names and ids',()=>{
 const html=coursePickerMarkup([{id:'a"b',name:'<img onerror=alert(1)>',type:'event'}],'a"b');
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
 assert.match(html,/value="a&quot;b"/);
});
test('dashboard has separate compact financial and attendance modal triggers and templates',()=>{
 replaceState(initialState());const markup=dashboard();
 assert.match(markup,/data-summary-open="financial"/);
 assert.match(markup,/data-summary-open="attendance"/);
 assert.match(markup,/<template id="semester-financial-detail-template">/);
 assert.match(markup,/<template id="semester-attendance-detail-template">/);
 assert.match(markup,/id="dashboard-semester-select"/);
 assert.match(markup,/id="semester-subject-toggle"/);
 assert.match(markup,/id="semester-subject-collapse" class="collapse "/);
 const shell=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(shell,/id="summary-modal"[^>]*aria-labelledby="summary-modal-title"/);
 assert.match(shell,/modal-dialog-scrollable modal-fullscreen-sm-down/);
 assert.match(shell,/id="summary-modal-body" tabindex="0"/);
 const ui=fs.readFileSync(new URL('../js/features/dashboard.js',import.meta.url),'utf8');
 assert.match(ui,/bootstrap\.Modal\.getOrCreateInstance\(summaryModal\)\.show\(\)/);
});
test('pop-up bodies are scrollable in small screens and phone summary card stays compact',()=>{
 const css=fs.readFileSync(new URL('../css/app.css',import.meta.url),'utf8');
 assert.match(css,/#summary-modal \.modal-body\{[^}]+overflow-y:auto/);
 assert.match(css,/#summary-modal \.modal-dialog\{height:100dvh/);
 assert.match(css,/\.semester-summary-launch\{[^}]+min-height:186px/);
 const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/trackerist-v3\.1\.0/);
 assert.match(sw,/\.\/js\/core\/course-picker\.js/);
});
