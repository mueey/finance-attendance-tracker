import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWeekdays,getWeekdays,isScheduled,entriesOnDate,formatWeekdays} from '../js/core/schedule.js';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';
import {getFinance} from '../js/core/finance.js';

const cls={id:'math',name:'Math',type:'class',schedule:'Mon / Wed / Fri',weekdays:[1,3,5],startDate:'2026-10-01',endDate:'2026-11-30',eventDate:'',time:'08:00',createdAt:'2026-10-01',fineRate:50,archived:false};
test('understands old schedule text and compact weekday abbreviations',()=>{
 assert.deepEqual(parseWeekdays('Mon / Wed / Fri'),[1,3,5]);
 assert.deepEqual(parseWeekdays('MWF'),[1,3,5]);
 assert.deepEqual(parseWeekdays('TTh'),[2,4]);
 assert.deepEqual(parseWeekdays('Tue, Thu'),[2,4]);
 assert.deepEqual(getWeekdays({schedule:'Mon/Wed'}),[1,3]);
 assert.equal(formatWeekdays([5,1,3]),'Mon / Wed / Fri');
});
test('classes appear only on selected weekdays and within semester bounds',()=>{
 assert.equal(isScheduled(cls,'2026-10-26'),true); // Monday
 assert.equal(isScheduled(cls,'2026-10-27'),false); // Tuesday
 assert.equal(isScheduled(cls,'2026-10-28'),true); // Wednesday
 assert.equal(isScheduled(cls,'2026-12-02'),false);
 assert.equal(isScheduled({...cls,archived:true},'2026-10-26'),false);
});
test('calendar plans classes without creating attendance records or fines',()=>{
 const s=initialState();s.courses.push(cls);const planned=entriesOnDate(s,'2026-10-26');
 assert.equal(planned.length,1);assert.equal(planned[0].record,null);assert.equal(planned[0].scheduled,true);
 assert.equal(s.attendance.length,0);assert.equal(getFinance(s).fineTotal,0);
 s.attendance.push({id:'r1',courseId:'math',date:'2026-10-26',status:'excused',slots:null,note:'sick',updatedAt:''});
 assert.equal(entriesOnDate(s,'2026-10-26')[0].record.status,'excused');assert.equal(getFinance(s).fineTotal,0);
 s.attendance[0].status='absent';assert.equal(getFinance(s).fineTotal,0);
 s.attendance[0].status='present';assert.equal(getFinance(s).fineTotal,0);
});
test('special event can be scheduled once, off-schedule manual logs still visible',()=>{
 const s=initialState();s.courses.push({...cls,id:'event',name:'Event',type:'event',eventDate:'2026-10-31'});
 assert.equal(entriesOnDate(s,'2026-10-31').length,1);
 assert.equal(entriesOnDate(s,'2026-10-26').length,0);
 s.attendance.push({id:'r1',courseId:'event',date:'2026-10-26',status:'absent',slots:null,note:'',updatedAt:''});
 assert.equal(entriesOnDate(s,'2026-10-26').length,1);
});
test('v2 import/backup round-trip preserves structured days and term dates',()=>{
 const s=initialState();s.courses.push(cls);const after=validateAndNormalize(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(after.courses[0].weekdays,[1,3,5]);assert.equal(after.courses[0].startDate,'2026-10-01');assert.equal(after.courses[0].endDate,'2026-11-30');
});
