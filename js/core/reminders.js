import {entriesOnDate} from './schedule.js';
import {today} from './utils.js';

export const REMINDER_LEADS=[0,5,10,15,30,60];

// The time field is deliberately free text in Trackerist. Parse only an unambiguous
// leading clock time (12-hour or 24-hour); do not guess a start time from prose.
export function startMinutes(time){
 const match=String(time||'').trim().match(/^(\d{1,2}):(\d{2})(?:\s*(a\.?m\.?|p\.?m\.?))?(?=$|[\s\-–—])/i);
 if(!match)return null;
 let hour=Number(match[1]),minute=Number(match[2]);
 if(minute>59||hour>23)return null;
 const meridiem=match[3]?.replace(/\./g,'').toLowerCase();
 if(meridiem){if(hour<1||hour>12)return null;hour=hour%12+(meridiem==='pm'?12:0);}
 return hour*60+minute;
}

export function todaysReminders(state,date=today()){
 return entriesOnDate(state,date).filter(x=>x.scheduled).map(x=>({...x,date}));
}

export function dueReminders(state,now=new Date(),lead=10){
 const d=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const minutes=now.getHours()*60+now.getMinutes();
 return todaysReminders(state,d).filter(({course,record})=>{
  if(record)return false; // Already marked: never send an unnecessary reminder.
  const start=startMinutes(course.time);
  // For classes with unspecified time, make one daily reminder after 8 AM.
  const planned=start??480;
  return minutes>=planned-lead&&minutes<=planned+120;
 });
}

export function notificationActionAllowed(course,status){
 return course?.type==='class'&&['present','absent'].includes(status);
}
