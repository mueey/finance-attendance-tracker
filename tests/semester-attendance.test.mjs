import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';
import {getSemesterAttendance,countWeekdayDates} from '../js/core/semester-attendance.js';
import {getSemesterFinance} from '../js/core/semesters.js';
import {initStore,replaceState} from '../js/core/store.js';
import {render as renderDashboard} from '../js/features/dashboard.js';

const asOf='2026-10-26';
function fixture(){
  const s=initialState();
  s.semesters=[
    {id:'first',name:'1st Semester <Autumn>',startDate:'2026-10-01',endDate:'2026-10-31'},
    {id:'second',name:'2nd Semester',startDate:'2026-11-01',endDate:'2026-12-20'},
  ];
  s.settings.selectedSemesterId='first';
  s.courses=[
    {id:'math',name:'Math <Algebra>',type:'class',schedule:'Mon / Wed',weekdays:[1,3],startDate:'2026-10-01',fineRate:5,archived:false},
    {id:'event',name:'School event',type:'event',eventDate:'2026-10-23',fineRate:50,startDate:'2026-10-24',archived:false},
    {id:'old',name:'Legacy event',type:'event',eventDate:'2026-10-15',fineRate:10,archived:false},
    {id:'archived',name:'Old class',type:'class',weekdays:[1],startDate:'2026-10-01',archived:true,fineRate:0},
    {id:'future',name:'Future event',type:'event',eventDate:'2026-11-09',fineRate:0,archived:false},
  ];
  s.attendance=[
    {id:'math1',courseId:'math',date:'2026-10-05',status:'present'},
    {id:'math2',courseId:'math',date:'2026-10-07',status:'absent'},
    {id:'math3',courseId:'math',date:'2026-10-12',status:'excused'},
    {id:'math4',courseId:'math',date:'2026-10-14',status:'holiday'},
    {id:'event1',courseId:'event',date:'2026-10-23',status:'absent',slots:{amIn:'present',amOut:'absent',pmIn:'excused',pmOut:'present'}},
    {id:'legacy1',courseId:'old',date:'2026-10-15',status:'absent'},
    {id:'archived1',courseId:'archived',date:'2026-10-06',status:'present'},
    {id:'future1',courseId:'math',date:'2026-11-02',status:'absent'},
  ];
  return validateAndNormalize(s);
}

test('weekday count handles inclusive boundaries, leap years, and entire weeks',()=>{
 assert.equal(countWeekdayDates('2026-10-01','2026-10-26',[1,3]),7); // Mon/Wed incl today
 assert.equal(countWeekdayDates('2026-10-05','2026-10-05',[1]),1);
 assert.equal(countWeekdayDates('2026-10-05','2026-10-05',[2]),0);
 assert.equal(countWeekdayDates('2026-10-06','2026-10-05',[1]),0);
 assert.equal(countWeekdayDates('2024-02-26','2024-03-03',[1,4]),2);
});
test('semester attendance combines academic dates and event slots, excluding excused and holidays from percentage',()=>{
 const a=getSemesterAttendance(fixture(),'first',asOf);
 assert.equal(a.recordedDates,7);
 assert.deepEqual({p:a.present,ab:a.absent,ex:a.excused,h:a.holiday}, {p:4,ab:3,ex:2,h:1});
 assert.equal(a.rate,57.14);
 assert.deepEqual(a.eventSlots,{present:2,absent:1,excused:1});
 assert.equal(a.legacyEventDays,1);
 assert.deepEqual({p:a.presentDates,ab:a.absentDates,ex:a.excusedDates,h:a.holidayDates},{p:2,ab:3,ex:1,h:1});
 assert.equal(a.pendingDates,3); // three unlogged Mon/Wed dates through Oct 26
 assert.equal(a.byCourse.find(c=>c.id==='math').pendingDates,3);
 assert.equal(a.byCourse.find(c=>c.id==='event').pendingDates,0);
 assert.equal(a.byCourse.find(c=>c.id==='archived').pendingDates,0);
});
test('pending only includes past and current scheduled dates, with unlogged future event left untouched',()=>{
 const s=fixture();
 assert.equal(getSemesterAttendance(s,'second',asOf).pendingDates,0);
 const b=getSemesterAttendance(s,'second','2026-11-10');
 assert.equal(b.pendingDates,3); // math Nov4/9 and future Nov9; Nov2 recorded
 assert.equal(b.absent,1);
 assert.equal(b.rate,0);
});
test('editing an Absent event slot to Excused immediately reduces attendance absences and fine',()=>{
 const s=fixture();
 let a=getSemesterAttendance(s,'first',asOf),f=getSemesterFinance(s,'first');
 assert.equal(a.absent,3);
 const before=f.fineTotal;
 s.attendance.find(r=>r.id==='event1').slots.amOut='excused';
 s.attendance.find(r=>r.id==='event1').status='excused';
 a=getSemesterAttendance(s,'first',asOf);f=getSemesterFinance(s,'first');
 assert.equal(a.absent,2);
 assert.equal(a.excused,3);
 assert.equal(f.fineTotal,before-50);
});
test('all-time mode includes logs from every semester and does not create attendance rows',()=>{
 const s=fixture();
 const count=s.attendance.length;
 const a=getSemesterAttendance(s,'all',asOf);
 assert.equal(a.recordedDates,8);
 assert.equal(a.pendingDates,3);
 assert.equal(s.attendance.length,count);
 assert.equal(a.absent,4);
});
test('unknown semester is rejected; summary works with old v2 backups without semester definitions',()=>{
 const s=fixture();assert.throws(()=>getSemesterAttendance(s,'missing',asOf),/Unknown semester/);
 const legacy=initialState();delete legacy.semesters;delete legacy.settings.selectedSemesterId;
 assert.equal(getSemesterAttendance(validateAndNormalize(legacy),'all',asOf).rate,null);
});
test('dashboard includes semester attendance card, current selection, per-course escaped names and live counts',()=>{
 const data=new Map();globalThis.localStorage={getItem:key=>data.get(key)||null,setItem:(key,v)=>data.set(key,v)};
 initStore();replaceState(fixture());
 const out=renderDashboard();
 for(const term of ['Semester attendance summary','Attendance rate','Pending','Present','Absent','Excused','Subjects &amp; Events','57.14%','semester-attendance-logs','Math &lt;Algebra&gt;'])assert.ok(out.includes(term),term);
 assert.ok(!out.includes('Math <Algebra>'));
 assert.ok(out.includes('1st Semester &lt;Autumn&gt;'));
 assert.ok(out.includes('id="dashboard-semester-select"'));
});
