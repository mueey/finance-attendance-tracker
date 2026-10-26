import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';
import {getFinance} from '../js/core/finance.js';
import {EVENT_SLOT_KEYS,EVENT_SLOT_LABELS,normalizeEventSlots,eventDayStatus,missedEventSlots} from '../js/core/event-slots.js';
const iso='2026-10-26';
function fixture(slots, rate=50, status=slots?eventDayStatus(slots):'absent'){
 const s=initialState();
 s.courses.push({id:'e1',name:'Annual Event',code:'EVT',type:'event',fineRate:rate,createdAt:'2026-10-01'});
 s.attendance.push({id:'a1',courseId:'e1',date:iso,status,slots,note:'',updatedAt:''});
 return validateAndNormalize(s);
}
const slots=n=>Object.fromEntries(EVENT_SLOT_KEYS.map((k,i)=>[k,i<n?'absent':'present']));
for(let n=0;n<=4;n++)test(`${n} Absent AM/PM event slots => ${n} individual charges and ₱${n*50}`,()=>{
 const state=fixture(slots(n));const f=getFinance(state);
 assert.equal(f.automatic.length,n);assert.equal(f.fineTotal,50*n);
 assert.equal(new Set(f.automatic.map(x=>x.id)).size,n);
 assert.deepEqual(f.automatic.map(x=>x.description),EVENT_SLOT_KEYS.slice(0,n).map(k=>`Annual Event — ${EVENT_SLOT_LABELS[k]} (Absent)`));
});
test('a mixed event: AM In and PM In Absent; others Present/Excused',()=>{
 const values={amIn:'absent',amOut:'present',pmIn:'absent',pmOut:'excused'};
 const s=fixture(values,75.25);const f=getFinance(s);
 assert.equal(s.attendance[0].status,'absent');assert.deepEqual(missedEventSlots(s.attendance[0]).map(x=>x.key),['amIn','pmIn']);
 assert.equal(f.fineTotal,150.5);
 assert.equal(f.automatic.length,2);
});
test('correcting an Absent slot to Excused/PRESENT removes its previous charge, without duplicate fine',()=>{
 const s=fixture(slots(3),35);
 s.payments.push({id:'p1',targetType:'fine',targetId:'',amount:105,date:iso,method:'cash',note:''});
 assert.equal(getFinance(s).fineTotal,105);
 s.attendance[0].slots.amIn='excused';s.attendance[0].status=eventDayStatus(s.attendance[0].slots);
 assert.equal(getFinance(s).fineTotal,70);assert.equal(getFinance(s).fineCredit,35);
 s.attendance[0].slots.amOut='present';
 assert.equal(getFinance(s).fineTotal,35);
 s.attendance[0].slots.pmIn='present';s.attendance[0].status=eventDayStatus(s.attendance[0].slots);
 assert.equal(getFinance(s).fineTotal,0);
 s.attendance[0].slots.pmOut='present';s.attendance[0].status=eventDayStatus(s.attendance[0].slots);
 assert.equal(getFinance(s).fineTotal,0); // no remaining Absent slots
 s.attendance[0].slots.amOut='excused';s.attendance[0].status=eventDayStatus(s.attendance[0].slots);
 assert.equal(getFinance(s).fineTotal,0);
});
test('Excused slots and a Holiday event do not incur penalties',()=>{
 const s=fixture({amIn:'excused',amOut:'excused',pmIn:'present',pmOut:'present'});
 assert.equal(s.attendance[0].status,'excused');assert.equal(getFinance(s).fineTotal,0);
 s.attendance[0].status='holiday';s.attendance[0].slots=null;
 assert.equal(getFinance(s).fineTotal,0);
});
test('event fine rate change recalculates missed slots at the new rate',()=>{
 const s=fixture(slots(3),50);
 assert.equal(getFinance(s).fineTotal,150);
 s.courses[0].fineRate=70;
 assert.equal(getFinance(s).fineTotal,210);
});
test('v2 boolean attendance slots migrate with correct charge per unchecked slot',()=>{
 const s=initialState();s.courses.push({id:'old',name:'Old Event',type:'event',fineRate:40});
 s.attendance.push({id:'old-a',courseId:'old',date:iso,status:'absent',slots:{amIn:true,amOut:false,pmIn:true,pmOut:false}});
 const m=validateAndNormalize(s);assert.equal(m.attendance[0].slots.amIn,'present');assert.equal(m.attendance[0].slots.amOut,'absent');
 assert.equal(getFinance(m).fineTotal,80);
 assert.deepEqual(getFinance(validateAndNormalize(m)).automatic,getFinance(m).automatic);
});
test('previous event-wide Absent with no slot details preserves its historical single fine until edited',()=>{
 const old=fixture(null,60);assert.equal(getFinance(old).fineTotal,60);
 assert.equal(getFinance(old).automatic[0].slot,'legacy');
 old.attendance[0].slots=slots(4);assert.equal(getFinance(old).fineTotal,240);
});
test('class absences incur no automatic fine even when an old record has a fine rate',()=>{
 const s=initialState();s.courses.push({id:'c',name:'Subject',type:'class',fineRate:50});
 s.attendance.push({id:'c-a',courseId:'c',date:iso,status:'absent',slots:null});
 const fin=getFinance(validateAndNormalize(s));assert.equal(fin.fineTotal,0);assert.equal(fin.automatic.length,0);assert.equal(validateAndNormalize(s).courses[0].fineRate,0);
});
