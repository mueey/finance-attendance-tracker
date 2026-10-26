import test from 'node:test';
import assert from 'node:assert/strict';
import {attendanceRing, normalizedRate} from '../js/core/progress-ring.js';
import {initialState} from '../js/core/migrate.js';
import {initStore,replaceState} from '../js/core/store.js';
import {render} from '../js/features/dashboard.js';

const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v))};
initStore();

test('ring displays progress and separate target accurately',()=>{
 const html=attendanceRing(66.67,{label:'Overall recorded attendance',target:75,size:'overall'});
 assert.match(html,/class="attendance-ring attendance-ring--overall attendance-ring--below"/);
 assert.match(html,/aria-label="Overall recorded attendance: 66.67%, target 75%"/);
 assert.match(html,/stroke-dasharray="66.67 100"/);
 assert.match(html,/data-target="75"/);
 assert.match(html,/>66.67%<\/strong>/);
 assert.match(html,/attendance-ring-goal/);
});
test('empty and 0% are distinct; invalid data is clamped or discarded',()=>{
 assert.equal(normalizedRate(null),null);
 assert.equal(normalizedRate(NaN),null);
 assert.equal(normalizedRate(102),100);
 assert.equal(normalizedRate(-5),0);
 assert.match(attendanceRing(null),/No recorded attendance/);
 assert.match(attendanceRing(null),/>—<\/strong>/);
 assert.match(attendanceRing(0),/>0%<\/strong>/);
 assert.doesNotMatch(attendanceRing(null),/>0%<\/strong>/);
});
test('dashboard order: snapshot and health precede the financial and attendance semester summaries',()=>{
 const s=initialState();replaceState(s);const out=render();
 const labels=['FINANCIAL SNAPSHOT','Attendance health','SEMESTER FINANCIAL SUMMARY','SEMESTER ATTENDANCE SUMMARY'];
 let last=-1;for(const label of labels){const index=out.indexOf(label);assert.ok(index>last,label);last=index;}
 assert.equal((out.match(/FINANCIAL SNAPSHOT/g)||[]).length,1);
 assert.equal((out.match(/<div class="attendance-ring /g)||[]).length,3); // overall + compact preview + detail popup
 assert.match(out,/aria-label="Overall recorded attendance: No recorded attendance, target 75%"/);
 assert.match(out,/aria-label="Semester attendance rate: No recorded attendance"/);
 assert.doesNotMatch(out,/aria-label="Semester attendance percentage"/);
});
test('semester ring follows selected term and records without changing finance totals',()=>{
 const s=initialState();s.semesters=[{id:'term',name:'Term',startDate:'2026-10-01',endDate:'2026-10-31'}];
 s.settings.selectedSemesterId='term';s.courses=[{id:'c',name:'Class',type:'class',weekdays:[],fineRate:10,archived:false}];
 s.attendance=[{id:'a1',courseId:'c',date:'2026-10-02',status:'present'},{id:'a2',courseId:'c',date:'2026-10-03',status:'absent'}];
 replaceState(s);const out=render();
 assert.match(out,/aria-label="Semester attendance rate: 50%"/);
 assert.match(out,/aria-label="Overall recorded attendance: 50%, target 75%"/);
 assert.match(out,/stroke-dasharray="50 100"/);
 assert.match(out,/Total fines/);
 assert.match(out,/₱10\.00/);
});
