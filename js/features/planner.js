import {getState} from '../core/store.js';
import {html,blank,pageHead,friendlyDate} from '../core/utils.js';
import {groupWeeklySchedule} from '../core/planner.js';
import {openCourseEditor} from './courses.js';

function courseCard(c){
 const room=c.roomNumber?`<span><strong>Room:</strong> ${html(c.roomNumber)}</span>`:'';
 const professor=c.professorName?`<span><strong>Professor:</strong> ${html(c.professorName)}</span>`:'';
 return `<div class="planner-course">
  <div class="d-flex align-items-start justify-content-between gap-2"><div class="min-width-0"><strong>${html(c.name)}</strong>${c.code?`<div class="mini-muted">${html(c.code)}</div>`:''}</div><button class="btn btn-sm btn-outline-primary" type="button" data-edit-course="${html(c.id)}" aria-label="Edit ${html(c.name)}">Edit</button></div>
  <div class="mini-muted mt-2">${html(c.time||'Time not specified')}${c.venue?` · ${html(c.venue)}`:''}</div>
  ${room||professor?`<div class="schedule-reference mt-2">${room}${professor}</div>`:''}
  ${c.startDate||c.endDate?`<div class="mini-muted mt-2">${html(c.startDate||'Start not set')}${c.endDate?' — '+html(c.endDate):' onward'}</div>`:''}
 </div>`;
}
export function render(){
 const {days,events}=groupWeeklySchedule(getState().courses);
 const hasEntries=days.some(d=>d.courses.length)||events.length;
 return `${pageHead('Schedule Planner','Weekly Class Planner','See your classroom, professor, and schedule in one place. Edit any course to update the calendar automatically.','<button class="btn btn-primary" id="planner-add-course">+ Add course / event</button>')}
 <div class="card mb-3"><div class="card-body"><h2 class="section-title mb-2">Weekly timetable</h2><p class="mini-muted mb-0">Recurring courses appear on each selected weekday. One-time events are listed below. Archived courses are hidden.</p></div></div>
 ${hasEntries?`<div id="planner-schedule" class="planner-week row g-3">${days.map(d=>`<div class="col-12 col-md-6 col-xl-4"><section class="card planner-day h-100"><div class="card-header d-flex justify-content-between"><span>${html(d.name)}</span><span class="mini-muted">${d.courses.length} scheduled</span></div><div class="card-body">${d.courses.map(courseCard).join('')||'<div class="mini-muted">No classes scheduled</div>'}</div></section></div>`).join('')}</div>
 ${events.length?`<section id="planner-events" class="card mt-4 mb-3"><div class="card-header">One-time events</div><div class="card-body"><div class="planner-events">${events.map(c=>`<div><div class="mini-muted mb-1">${html(friendlyDate(c.eventDate))}</div>${courseCard(c)}</div>`).join('')}</div></div></section>`:''}`:blank('No scheduled classes yet','Add a course and select recurring weekdays to fill your planner.')}
 `;
}
export function bind(){
 document.querySelector('#planner-add-course')?.addEventListener('click',()=>openCourseEditor());
 for(const node of document.querySelectorAll('#planner-schedule, #planner-events'))node.onclick=e=>{const btn=e.target.closest('[data-edit-course]');if(!btn)return;const course=getState().courses.find(c=>c.id===btn.dataset.editCourse);if(course)openCourseEditor(course);};
}
