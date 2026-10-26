import {getFinance} from './finance.js';
import {round2} from './utils.js';

// Date ranges include both the start and end date. Semester dates are set by the user.
export function semesterForDate(date, state){
  return state.semesters.find(s=>date && date>=s.startDate && date<=s.endDate)?.id || '';
}
export function semesterForBill(bill,state){
  if(bill.semesterId && state.semesters.some(s=>s.id===bill.semesterId))return bill.semesterId;
  return semesterForDate(bill.dueDate || bill.createdAt,state);
}
export function semesterForFinePayment(payment,state){
  if(payment.semesterId && state.semesters.some(s=>s.id===payment.semesterId))return payment.semesterId;
  return semesterForDate(payment.date,state);
}
export function getSemesterFinance(state,semesterId='all'){
  const finance=getFinance(state);
  const receivedInPeriod=semesterId==='all' ? finance.paid : round2(state.payments.filter(p=>semesterForDate(p.date,state)===semesterId).reduce((sum,p)=>sum+p.amount,0));
  if(semesterId==='all')return {...finance,receivedInPeriod,period:'all',fineChargeCount:finance.automatic.length+finance.manual.length,billCount:state.bills.length};
  const semester=state.semesters.find(s=>s.id===semesterId);
  if(!semester)throw Error('Unknown semester. Select a valid semester.');
  const inPeriod=date=>date>=semester.startDate && date<=semester.endDate;
  const fines=[...finance.automatic,...finance.manual].filter(a=>inPeriod(a.date));
  const bills=state.bills.filter(b=>semesterForBill(b,state)===semesterId);
  const fineTotal=round2(fines.reduce((sum,f)=>sum+f.amount,0));
  const billsTotal=round2(bills.reduce((sum,b)=>sum+b.amount,0));
  const billIds=new Set(bills.map(b=>b.id));
  const finePaid=round2(state.payments.filter(p=>p.targetType==='fine'&&semesterForFinePayment(p,state)===semesterId).reduce((sum,p)=>sum+p.amount,0));
  // Bill payments follow the semester of the bill, even if paid after the semester ends.
  const billPaid=round2(state.payments.filter(p=>p.targetType==='bill'&&billIds.has(p.targetId)).reduce((sum,p)=>sum+p.amount,0));
  const paid=round2(finePaid+billPaid),charged=round2(fineTotal+billsTotal),balance=round2(charged-paid);
  return {fineTotal,billsTotal,finePaid,billPaid,paid,charged,balance,due:Math.max(0,balance),credit:Math.max(0,-balance),receivedInPeriod,period:semesterId,fineChargeCount:fines.length,billCount:bills.length};
}
