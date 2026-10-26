import test from 'node:test';
import assert from 'node:assert/strict';
import {initStore,update,getState} from '../js/core/store.js';
import {id} from '../js/core/utils.js';
const db=new Map();globalThis.localStorage={getItem:k=>db.has(k)?db.get(k):null,setItem:(k,v)=>db.set(k,String(v))};
initStore();
const views=['dashboard','courses','attendance','calendar','fines','bills','payments','reports','settings'];
for(const name of views){test(`renders ${name} page with no records`,async()=>{const m=await import(`../js/features/${name}.js`);const output=m.render();assert.ok(output.length>100);assert.ok(output.includes('class=')||output.includes('class="'));assert.ok(!output.includes('undefined'));});}
test('all 9 feature pages still render with seeded finance and attendance data',async()=>{
 update(s=>{s.courses.push({id:'course-a',code:'A1',name:'Class <B>',type:'class',schedule:'Mon',time:'',venue:'',fineRate:50,archived:false,createdAt:'2026-10-01'});s.attendance.push({id:'attendance-a',courseId:'course-a',date:'2026-10-25',status:'absent',slots:null,note:'test',updatedAt:''});s.bills.push({id:'bill-a',title:'Uniform',category:'Other',amount:320,dueDate:'2026-10-20',note:'',createdAt:'2026-10-01'});s.payments.push({id:'pay-a',date:'2026-10-25',targetType:'bill',targetId:'bill-a',amount:120,method:'Cash',note:'ok'});});
 for(const name of views){const m=await import(`../js/features/${name}.js`);const str=m.render();assert.ok(str.length>100);assert.ok(!str.includes('Class <B>'),'user strings must be escaped');}
 const dashboard=await import('../js/features/dashboard.js');assert.match(dashboard.render(),/₱200\.00/); // ₱0 academic class fine + ₱200 remaining bill
});
