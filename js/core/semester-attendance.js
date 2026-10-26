import {today,round2,validDate} from './utils.js';
import {getWeekdays,isScheduled} from './schedule.js';
import {EVENT_SLOT_KEYS} from './event-slots.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const toUTC = value => {const [y,m,d] = value.split('-').map(Number);return Date.UTC(y,m-1,d);};
const weekdayUTC = value => new Date(toUTC(value)).getUTCDay();
const maxDate = (...values) => values.filter(Boolean).sort().at(-1);
const minDate = (...values) => values.filter(Boolean).sort()[0];

// Counts repeat weekdays without creating an attendance record for each calendar date.
// This keeps large date ranges fast and does not label future dates as missing.
export function countWeekdayDates(start,end,days){
 if(!validDate(start)||!validDate(end)||start>end||!days.length)return 0;
 const total=Math.round((toUTC(end)-toUTC(start))/DAY_MS)+1;
 const weeks=Math.floor(total/7),extra=total%7,first=weekdayUTC(start);
 return [...new Set(days)].reduce((sum,day)=>{
   const offset=(day-first+7)%7;
   return sum+weeks+(offset<extra?1:0);
 },0);
}

function scheduledThroughDate(course,start,end){
 if(course.archived||start>end)return 0;
 if(course.type==='event' && validDate(course.eventDate))return course.eventDate>=start&&course.eventDate<=end?1:0;
 return countWeekdayDates(start,end,getWeekdays(course));
}

/**
 * Attendance units: each class attendance record counts as one unit; a modern
 * event counts each of four AM/PM slots as a unit. Legacy event-wide records
 * with no slot details count as one unit, since old slot choices are unknown.
 * Excused and Holiday records do not change the attendance percentage.
 * Pending means scheduled dates through asOf that have not been logged; pending
 * never creates automatic absences or fines.
 */
export function getSemesterAttendance(state,semesterId='all',asOf=today()){
 if(!validDate(asOf))throw Error('Invalid attendance summary date.');
 const semester=semesterId==='all'?null:state.semesters.find(s=>s.id===semesterId);
 if(semesterId!=='all'&&!semester)throw Error('Unknown semester.');
 const inside = date => !semester || (date>=semester.startDate && date<=semester.endDate);
 const rows=state.attendance.filter(a=>inside(a.date));
 const byCourse=new Map(state.courses.map(c=>[c.id,{id:c.id,name:c.name,type:c.type,present:0,absent:0,excused:0,holiday:0,recordedDates:0,pendingDates:0,rate:null}]));
 const detail={present:0,absent:0,excused:0,holiday:0,recordedDates:0,pendingDates:0,legacyEventDays:0,
  presentDates:0,absentDates:0,excusedDates:0,holidayDates:0,eventSlots:{present:0,absent:0,excused:0},byCourse:[]};
 for(const a of rows){
   const c=byCourse.get(a.courseId);if(!c)continue;
   detail.recordedDates++;c.recordedDates++;
   if(a.status==='present')detail.presentDates++;
   if(a.status==='absent')detail.absentDates++;
   if(a.status==='excused')detail.excusedDates++;
   if(a.status==='holiday')detail.holidayDates++;
   if(a.status==='holiday'){detail.holiday++;c.holiday++;continue;}
   if(c.type==='event'&&a.slots){
     for(const key of EVENT_SLOT_KEYS){
       const status=a.slots[key];
       if(!['present','absent','excused'].includes(status))continue;
       detail[status]++;c[status]++;detail.eventSlots[status]++;
     }
   }else{
     // Historical events without slot detail are one unit, not four inferred units.
     if(c.type==='event')detail.legacyEventDays++;
     if(['present','absent','excused'].includes(a.status)){detail[a.status]++;c[a.status]++;}
   }
 }
 // A 'pending date' is a scheduled course/event day on or before today with no
 // attendance record. Holidays and excused dates have a record, hence not pending.
 for(const course of state.courses){
   const c=byCourse.get(course.id);if(!c||course.archived)continue;
   const fixedEvent=course.type==='event'&&validDate(course.eventDate);
   const start=maxDate(semester?.startDate,fixedEvent?undefined:(validDate(course.startDate)?course.startDate:(validDate(course.createdAt)?course.createdAt:asOf)));
   const end=minDate(asOf,semester?.endDate,fixedEvent?undefined:(validDate(course.endDate)?course.endDate:undefined));
   // Fixed-date events are explicitly scheduled on their event date, even if
   // the saved generic course start date differs (see isScheduled).
   const lower=start||'0001-01-01';
   if(lower>end)continue;
   const scheduled=scheduledThroughDate(course,lower,end);
   const recorded=state.attendance.filter(a=>a.courseId===course.id&&a.date>=lower&&a.date<=end&&isScheduled(course,a.date)).length;
   c.pendingDates=Math.max(0,scheduled-recorded);
   detail.pendingDates+=c.pendingDates;
 }
 for(const c of byCourse.values()){
   c.rate=c.present+c.absent?round2(c.present/(c.present+c.absent)*100):null;
   if(c.recordedDates||c.pendingDates)detail.byCourse.push(c);
 }
 detail.byCourse.sort((a,b)=>(b.recordedDates+b.pendingDates)-(a.recordedDates+a.pendingDates)||a.name.localeCompare(b.name));
 detail.rate=detail.present+detail.absent?round2(detail.present/(detail.present+detail.absent)*100):null;
 detail.totalUnits=detail.present+detail.absent+detail.excused;
 return detail;
}
