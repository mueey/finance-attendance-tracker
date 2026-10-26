import test from 'node:test';
import assert from 'node:assert/strict';
import {initStore,update} from '../js/core/store.js';
import {today} from '../js/core/utils.js';
import * as fines from '../js/features/fines.js';
import * as dashboard from '../js/features/dashboard.js';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
initStore();
const t=today();
update(s=>{
 s.courses.push({id:'e',name:'Seminar',code:'EV1',type:'event',fineRate:50,createdAt:t,startDate:t,eventDate:t,weekdays:[],schedule:'',time:'08:00',venue:'Hall',archived:false});
 s.attendance.push({id:'a',courseId:'e',date:t,status:'absent',slots:{amIn:'absent',amOut:'present',pmIn:'excused',pmOut:'absent'},note:'',updatedAt:''});
});
test('fine ledger displays one separate charge for each absent event slot',()=>{
 const markup=fines.render();assert.match(markup,/Seminar — AM In \(Absent\)/);assert.match(markup,/Seminar — PM Out \(Absent\)/);
 assert.doesNotMatch(markup,/Seminar — AM Out \(Absent\)/);assert.match(markup,/₱100\.00/);
 assert.match(markup,/2 of 4 slots/);
});
test('scheduled event on dashboard opens its per-slot editor and not whole-day absent shortcut',()=>{
 const markup=dashboard.render();
 assert.match(markup,/data-today-event="e"/);
 assert.match(markup,/Set AM\/PM slots/);
 assert.doesNotMatch(markup,/data-today-mark="absent" data-course="e"/);
});
