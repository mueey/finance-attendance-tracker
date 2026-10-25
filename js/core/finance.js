import {getState} from './store.js';
import {round2,today} from './utils.js';
export function getFinance(state=getState()){
  const byCourse=new Map(state.courses.map(c=>[c.id,c]));
  const automatic=state.attendance.filter(a=>a.status==='absent').map(a=>({id:`auto_${a.id}`,courseId:a.courseId,date:a.date,description:`Absence: ${byCourse.get(a.courseId)?.name||'Course'}`,amount:round2(byCourse.get(a.courseId)?.fineRate||0),automatic:true,attendanceId:a.id})).filter(a=>a.amount>0);
  const manual=state.adjustments.map(a=>({...a,automatic:false}));
  const fineTotal=round2([...automatic,...manual].reduce((s,x)=>s+x.amount,0));
  const billsTotal=round2(state.bills.reduce((s,b)=>s+b.amount,0));
  const finePaid=round2(state.payments.filter(p=>p.targetType==='fine').reduce((s,p)=>s+p.amount,0));
  const billPaid=round2(state.payments.filter(p=>p.targetType==='bill').reduce((s,p)=>s+p.amount,0));
  const paid=round2(finePaid+billPaid),charged=round2(fineTotal+billsTotal);
  const balance=round2(charged-paid);
  return {automatic,manual,fineTotal,billsTotal,finePaid,billPaid,paid,charged,balance,due:Math.max(0,balance),credit:Math.max(0,-balance),fineDue:Math.max(0,round2(fineTotal-finePaid)),fineCredit:Math.max(0,round2(finePaid-fineTotal))};
}
export const billPaidAmount=(id,state=getState())=>round2(state.payments.filter(p=>p.targetType==='bill'&&p.targetId===id).reduce((s,p)=>s+p.amount,0));
export const billBalance=(bill,state=getState())=>round2(bill.amount-billPaidAmount(bill.id,state));
export function getAttendanceStats(state=getState()){
 const relevant=state.attendance.filter(a=>a.status==='present'||a.status==='absent');
 const present=relevant.filter(a=>a.status==='present').length,absent=relevant.length-present;
 const rate=relevant.length?round2(present/relevant.length*100):null;
 const byCourse=state.courses.map(c=>{const records=state.attendance.filter(a=>a.courseId===c.id),counted=records.filter(a=>['present','absent'].includes(a.status));const p=counted.filter(a=>a.status==='present').length;return {...c,present:p,absent:counted.length-p,sessions:counted.length,rate:counted.length?round2(p/counted.length*100):null};});
 return {present,absent,rate,records:state.attendance.length,byCourse};
}
export const overdueBills=(state=getState())=>state.bills.filter(b=>b.dueDate&&b.dueDate<today()&&billBalance(b,state)>0);

export function sessionsToTarget(present,absent,threshold){
 const total=present+absent,rate=Number(threshold)/100;
 if(total===0||present/total>=rate)return 0;
 if(rate>=1)return Infinity;
 return Math.ceil((rate*total-present)/(1-rate)-1e-9);
}
