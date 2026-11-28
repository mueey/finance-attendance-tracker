import {validDate,today} from './utils.js';

export const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const TASK_TYPES = ['assignment','exam','project','task'];
export const TASK_PRIORITIES = ['low','medium','high'];
export const TASK_STATUSES = ['todo','in-progress','completed'];

function addDays(dateString,days){
 const date=new Date(`${dateString}T12:00:00`);
 date.setDate(date.getDate()+days);
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function mondayOf(dateString){
 const date=new Date(`${dateString}T12:00:00`);
 const offset=(date.getDay()+6)%7;
 date.setDate(date.getDate()-offset);
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export function getProductivitySummary(state, date=today()){
 const tasks=Array.isArray(state.tasks)?state.tasks:[];
 const sessions=Array.isArray(state.studySessions)?state.studySessions:[];
 const pending=tasks.filter(task=>task.status!=='completed');
 const nextWeek=addDays(date,7);
 const overdue=pending.filter(task=>task.dueDate&&task.dueDate<date);
 const dueSoon=pending.filter(task=>task.dueDate&&task.dueDate>=date&&task.dueDate<=nextWeek);
 const weekStart=mondayOf(date);
 const weeklySessions=sessions.filter(session=>session.date>=weekStart&&session.date<=date);
 const studyMinutesThisWeek=weeklySessions.reduce((sum,session)=>sum+session.minutes,0);
 const studyMinutesTotal=sessions.reduce((sum,session)=>sum+session.minutes,0);
 const nextTask=[...pending].filter(task=>task.dueDate).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0]||null;
 return {
  totalTasks:tasks.length,
  pending:pending.length,
  overdue:overdue.length,
  dueSoon:dueSoon.length,
  completed:tasks.filter(task=>task.status==='completed').length,
  studyMinutesThisWeek,
  studySessionsThisWeek:weeklySessions.length,
  studyMinutesTotal,
  nextTask
 };
}

export function formatStudyTime(minutes){
 const value=Math.max(0,Math.floor(Number(minutes)||0));
 const hours=Math.floor(value/60),mins=value%60;
 if(hours&&mins)return `${hours}h ${mins}m`;
 if(hours)return `${hours}h`;
 return `${mins}m`;
}

export function sortTasks(tasks){
 const order={high:0,medium:1,low:2};
 return [...tasks].sort((a,b)=>{
  if(a.status==='completed'&&b.status!=='completed')return 1;
  if(b.status==='completed'&&a.status!=='completed')return -1;
  if((a.dueDate||'9999-12-31')!==(b.dueDate||'9999-12-31'))return (a.dueDate||'9999-12-31').localeCompare(b.dueDate||'9999-12-31');
  return order[a.priority]-order[b.priority]||a.title.localeCompare(b.title);
 });
}

export function isValidTime(value){
 if(!/^\d{2}:\d{2}$/.test(String(value)))return false;
 const [hours,minutes]=value.split(':').map(Number);
 return hours>=0&&hours<=23&&minutes>=0&&minutes<=59;
}

export function isValidProductivityDate(value){return !value||validDate(value);}
