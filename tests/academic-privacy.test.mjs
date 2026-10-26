import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';
import {getFinance,getAttendanceStats} from '../js/core/finance.js';
import {getSemesterAttendance} from '../js/core/semester-attendance.js';
import {initStore,replaceState} from '../js/core/store.js';
import {render as renderDashboard} from '../js/features/dashboard.js';

const raw=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v))};initStore();
function sample(){const state=initialState();state.courses=[
 {id:'cls',name:'Calculus',type:'class',weekdays:[1,3],startDate:'2026-09-01',fineRate:75,archived:false},
 {id:'evt',name:'Special Event',type:'event',fineRate:50,archived:false}];
 state.attendance=[
 {id:'cls-1',courseId:'cls',date:'2026-10-19',status:'present'},
 {id:'cls-2',courseId:'cls',date:'2026-10-21',status:'absent'},
 {id:'evt-1',courseId:'evt',date:'2026-10-20',status:'absent',slots:{amIn:'absent',amOut:'present',pmIn:'absent',pmOut:'absent'}}
 ];return validateAndNormalize(state);
}
test('academic classes never charge automatic fines, including imported rates',()=>{
 const state=sample();assert.equal(state.courses[0].fineRate,0);
 const finance=getFinance(state);
 assert.equal(finance.fineTotal,150);assert.equal(finance.automatic.length,3);
 assert.ok(finance.automatic.every(x=>x.courseId==='evt'));
});
test('dashboard overall attendance health and absences exclude all events',()=>{
 const state=sample();
 assert.deepEqual((({present,absent,rate})=>({present,absent,rate}))(getAttendanceStats(state,{type:'class'})), {present:1,absent:1,rate:50});
 assert.equal(getAttendanceStats(state).absent,2); // Event day is still logged in all-course stats.
 replaceState(state);const output=renderDashboard();
 assert.match(output,/Academic attendance rate<\/div><div class="metric-value">50%/);
 assert.match(output,/Class absences<\/div><div class="metric-value">1</);
 assert.match(output,/Academic class attendance: 50%, target 75%/);
 assert.match(output,/Academic class attendance only/);
 assert.match(output,/Event slot fines \+ adjustments/);
 assert.match(output,/Special Event/); // Event remains in the semester breakdown.
 const semester=getSemesterAttendance(state,'all','2026-10-26');
 assert.equal(semester.eventSlots.absent,3);
});
test('course editor only enables and requires Fine Rate for events',()=>{
 const code=raw('js/features/courses.js');
 assert.match(code,/id="course-event-fine"/);
 assert.match(code,/fineRow\.classList\.toggle\('d-none',!isEvent\)/);
 assert.match(code,/fineInput\.disabled=!isEvent/);
 assert.match(code,/fineRate=d\.type==='event'\?Number\(d\.fineRate\):0/);
 assert.match(code,/Not applicable/);
});
test('Create Account has a privacy policy link and requires acknowledgment only during registration',()=>{
 const html=raw('index.html'),app=raw('js/app.js'),policy=raw('privacy.html');
 assert.match(html,/id="auth-privacy-wrap"/);
 assert.match(html,/id="auth-privacy-ack" required disabled/);
 assert.match(html,/href="\.\/privacy\.html"/);
 assert.match(app,/privacyAck\.disabled=!create;privacyAck\.required=create;privacyAck\.checked=false/);
 assert.match(app,/create&&!document\.querySelector\('#auth-privacy-ack'\)\.checked/);
 assert.match(policy,/<h1>Privacy Policy<\/h1>/);
 for(const term of ['localStorage','not encrypted at rest','hosting','clear the site','October 26, 2026'])assert.match(policy,new RegExp(term,'i'));
 assert.match(raw('sw.js'),/\.\/privacy\.html/);
 assert.doesNotMatch(policy,/(src|href)="https?:\/\//);
});
