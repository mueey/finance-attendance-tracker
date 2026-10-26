import {getWeekdays, WEEKDAYS} from './schedule.js';

// The planner is derived from stored course schedules, so it doesn't create
// attendance logs or change fines. One-time events are listed separately.
export function groupWeeklySchedule(courses){
 const days=WEEKDAYS.map((name,day)=>({day,name,courses:[]}));
 const events=[];
 for(const course of courses||[]){
  if(course.archived)continue;
  if(course.type==='event'&&course.eventDate){events.push(course);continue;}
  for(const day of getWeekdays(course))days[day].courses.push(course);
 }
 for(const row of days)row.courses.sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))||a.name.localeCompare(b.name));
 events.sort((a,b)=>a.eventDate.localeCompare(b.eventDate)||a.name.localeCompare(b.name));
 return {days,events};
}
