import {validDate} from './utils.js';

export const WEEKDAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const SHORT_DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Accept the schedule strings used by the original Trackerist as well as structured days.
export function parseWeekdays(text){
 const str=String(text||'').trim();if(!str)return [];
 const found=new Set();
 const aliases=[[/\bsun(?:day)?\b/gi,0],[/\bmon(?:day)?\b/gi,1],[/\btue(?:s|sday|sday)?\b/gi,2],[/\bwed(?:nesday)?\b/gi,3],[/\bthu(?:rs|rsday|rsday)?\b/gi,4],[/\bfri(?:day)?\b/gi,5],[/\bsat(?:urday)?\b/gi,6]];
 for(const [regex,day] of aliases)if(regex.test(str))found.add(day);
 // Compact academic notation e.g. MWF, MW, TTH, M/W/F, TTh.
 const compact=str.replace(/[\s,./|&\-]+/g,'').toUpperCase();
 const compactMap={M:[1],T:[2],W:[3],TH:[4],F:[5],SA:[6],SU:[0]};
 if(!found.size&&/^(?:(?:TH|SA|SU|M|T|W|F))+$/i.test(compact)){
  for(const token of compact.match(/TH|SA|SU|M|T|W|F/g)||[])for(const day of compactMap[token])found.add(day);
 }
 return [...found].sort((a,b)=>a-b);
}
export function getWeekdays(course){return Array.isArray(course.weekdays)?[...new Set(course.weekdays.filter(x=>Number.isInteger(x)&&x>=0&&x<=6))].sort((a,b)=>a-b):parseWeekdays(course.schedule);}
export function formatWeekdays(days){return [...new Set(days)].sort((a,b)=>a-b).map(d=>SHORT_DAYS[d]).filter(Boolean).join(' / ');}
export function isScheduled(course,date){
 if(!course||course.archived||!validDate(date))return false;
 if(course.type==='event'&&validDate(course.eventDate))return date===course.eventDate;
 const start=validDate(course.startDate)?course.startDate:(validDate(course.createdAt)?course.createdAt:'');
 if(start&&date<start)return false;
 if(validDate(course.endDate)&&date>course.endDate)return false;
 const days=getWeekdays(course);
 if(!days.length)return false;
 const [y,m,d]=date.split('-').map(Number);
 return days.includes(new Date(y,m-1,d).getDay());
}
// Calendar entries are derived on demand. No empty attendance rows, duplicate fines, or endless recurring writes.
export function entriesOnDate(state,date){
 const recorded=new Map(state.attendance.filter(a=>a.date===date).map(a=>[a.courseId,a]));
 return state.courses.filter(c=>isScheduled(c,date)||recorded.has(c.id)).map(course=>({course,record:recorded.get(course.id)||null,scheduled:isScheduled(course,date)}))
  .sort((a,b)=>Number(b.scheduled)-Number(a.scheduled)||String(a.course.time||'').localeCompare(String(b.course.time||''))||a.course.name.localeCompare(b.course.name));
}
