import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';
import {getSemesterFinance,semesterForDate,semesterForBill,semesterForFinePayment} from '../js/core/semesters.js';
import {getFinance} from '../js/core/finance.js';
import {render as renderDashboard} from '../js/features/dashboard.js';
import {initStore,replaceState} from '../js/core/store.js';

function seed(){
 const s=initialState();
 s.semesters=[
  {id:'first',name:'1st Semester AY 2026–2027',startDate:'2026-08-01',endDate:'2026-12-31'},
  {id:'second',name:'2nd Semester AY 2026–2027',startDate:'2027-01-01',endDate:'2027-05-31'}
 ];
 s.settings.selectedSemesterId='first';
 s.courses=[
  {id:'event',name:'School Event',type:'event',fineRate:50,startDate:'2026-08-01'},
  {id:'class',name:'Physics',type:'class',fineRate:60,startDate:'2027-01-01'}
 ];
 s.attendance=[
  {id:'ea',courseId:'event',date:'2026-09-03',status:'absent',slots:{amIn:'absent',amOut:'present',pmIn:'absent',pmOut:'absent'}},
  {id:'ca',courseId:'class',date:'2027-03-01',status:'absent'}
 ];
 s.adjustments=[{id:'adjust',courseId:'event',date:'2026-10-01',description:'Discount',amount:-10}];
 s.bills=[
  {id:'bill1',title:'Membership',amount:400,dueDate:'2026-10-25',createdAt:'2026-08-10'},
  {id:'bill2',title:'Fieldtrip',amount:200,dueDate:'2026-10-25',createdAt:'2026-08-10',semesterId:'second'}
 ];
 s.payments=[
  {id:'bp1',date:'2027-01-30',targetType:'bill',targetId:'bill1',amount:150}, // payment arrives after semester ends, goes with bill
  {id:'bp2',date:'2026-11-01',targetType:'bill',targetId:'bill2',amount:40}, // early payment goes with explicitly assigned bill
  {id:'fp1',date:'2027-01-15',targetType:'fine',amount:25,semesterId:'first'}, // explicitly applied to old semester
  {id:'fp2',date:'2027-01-15',targetType:'fine',amount:20} // automatically second by payment date
 ];
 return validateAndNormalize(s);
}
test('semester calculations separate event slot fines and manual waivers by attendance/adjustment date',()=>{
 const s=seed(),a=getSemesterFinance(s,'first'),b=getSemesterFinance(s,'second');
 assert.equal(a.fineTotal,140); // 3 × ₱50 minus ₱10 waiver
 assert.equal(b.fineTotal,60); // one class absence
 assert.equal(a.fineChargeCount,4);assert.equal(b.fineChargeCount,1);
 assert.equal(getFinance(s).fineTotal,200); // overall unchanged
});
test('semester calculations allocate bill payments to the bill semester across transaction dates',()=>{
 const s=seed(),a=getSemesterFinance(s,'first'),b=getSemesterFinance(s,'second');
 assert.deepEqual({billTotal:a.billsTotal,charge:a.charged,paid:a.paid,balance:a.due,credit:a.credit},
 {billTotal:400,charge:540,paid:175,balance:365,credit:0});
 assert.deepEqual({billTotal:b.billsTotal,charge:b.charged,paid:b.paid,balance:b.due},
 {billTotal:200,charge:260,paid:60,balance:200});
 assert.equal(a.receivedInPeriod,40); // cash date: bp2 (belongs to second) arrived in first
 assert.equal(b.receivedInPeriod,195); // cash date: bp1 + fp1 + fp2
 assert.equal(getSemesterFinance(s,'all').paid,235);
 assert.equal(a.paid+b.paid,235);
});
test('fine payment semester may be selected or inferred automatically by date',()=>{
 const s=seed();
 assert.equal(semesterForFinePayment(s.payments[2],s),'first');
 assert.equal(semesterForFinePayment(s.payments[3],s),'second');
 assert.equal(semesterForBill(s.bills[1],s),'second');
 assert.equal(semesterForDate('2026-08-01',s),'first');
 assert.equal(semesterForDate('2026-12-31',s),'first');
 assert.equal(semesterForDate('2027-01-01',s),'second');
 assert.equal(semesterForDate('2027-06-01',s),'');
});
test('editing attendance and payments updates semester totals without duplication',()=>{
 const s=seed();
 s.attendance[0].slots.amIn='excused';
 s.payments[0].amount=200;
 const a=getSemesterFinance(s,'first');
 assert.equal(a.fineTotal,90);assert.equal(a.paid,225);assert.equal(a.due,265);
 assert.equal(getSemesterFinance(s,'first').due,265);
});
test('older v2 data without semester fields opens with all-time totals and remains valid',()=>{
 const old=initialState();delete old.semesters;delete old.settings.selectedSemesterId;
 old.bills.push({id:'b1',title:'Test',amount:70,createdAt:'2026-10-01'});
 old.payments.push({id:'p1',date:'2026-10-11',targetType:'bill',targetId:'b1',amount:30});
 const normalized=validateAndNormalize(old);
 assert.deepEqual(normalized.semesters,[]);
 assert.equal(normalized.settings.selectedSemesterId,'all');
 assert.equal(getSemesterFinance(normalized,'all').due,40);
});
test('invalid and overlapping semester ranges are rejected',()=>{
 const s=seed();
 s.semesters[1].startDate='2026-12-01';assert.throws(()=>validateAndNormalize(s),/overlap/i);
 s.semesters[1].startDate='2027-01-01';s.semesters[1].endDate='2026-12-01';assert.throws(()=>validateAndNormalize(s),/semester/i);
});
test('dashboard shows selected semester summary, selector and all 4 metrics with escaped names',()=>{
 const db=new Map();globalThis.localStorage={getItem:k=>db.get(k)||null,setItem:(k,v)=>db.set(k,v)};
 initStore();const s=seed();s.semesters[0].name='Semester <script>alert(1)</script>';replaceState(s);
 const out=renderDashboard();
 for(const label of ['Semester financial summary','Total charges','Total paid','Remaining balance','Total fines','₱540.00','₱175.00','₱365.00','₱140.00'])assert.ok(out.includes(label),label);
 assert.ok(out.includes('Semester &lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.ok(!out.includes('Semester <script>'));
 for(const key of ['dashboard-semester-select','semester-add','semester-edit','semester-delete'])assert.ok(out.includes(`id="${key}"`));
});
