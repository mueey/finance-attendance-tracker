import {getState,update} from '../core/store.js';
import {id,today,html,chip,pageHead,friendlyDate} from '../core/utils.js';
import {entriesOnDate} from '../core/schedule.js';
import {openAttendanceEditor} from './attendance.js';
import {toast} from '../core/ui.js';
let visibleMonth=today().slice(0,7),selectedDate=today();
const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function dateKey(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function statusLabel(record){return record?chip(record.status):'<span class="chip chip-pending">Pending</span>';}
export function render(){return `${pageHead('Planner','Automatic Attendance Calendar','Subjects are placed on their scheduled days. Click a date, then simply mark Present, Absent, or Excused.','<button class="btn btn-primary" id="calendar-new">+ Other attendance</button>')}
 <div class="row g-3"><div class="col-xl-8"><div class="card"><div class="card-body"><div class="d-flex align-items-center justify-content-between gap-2 mb-4"><button class="btn btn-light btn-sm" id="calendar-prev">← Prev</button><h2 class="section-title m-0 text-center" id="calendar-label"></h2><button class="btn btn-light btn-sm" id="calendar-next">Next →</button></div>
 <div class="calendar-header">${weekdays.map(s=>`<div>${s}</div>`).join('')}</div><div class="calendar-grid" id="calendar-grid"></div>
 <div class="d-flex gap-3 flex-wrap small text-secondary mt-4"><span><i class="legend-dot" style="background:#a3aebe"></i>Pending</span><span><i class="legend-dot" style="background:#2bb69b"></i>Present</span><span><i class="legend-dot" style="background:#eb6477"></i>Absent</span><span><i class="legend-dot" style="background:#e8b34d"></i>Excused</span><span><i class="legend-dot" style="background:#809ef2"></i>Holiday</span></div></div></div></div>
 <div class="col-xl-4"><div class="card h-100"><div class="card-header">Subjects on selected day</div><div class="card-body"><h3 class="section-title" id="calendar-selected-label"></h3><p class="small text-secondary mb-2" id="calendar-day-count"></p><div id="calendar-day-records"></div></div></div></div></div>`;}
function draw(){
 const s=getState(),[year,mon]=visibleMonth.split('-').map(Number),month=mon-1;
 const first=new Date(year,month,1),start=first.getDay(),days=new Date(year,month+1,0).getDate();
 document.querySelector('#calendar-label').textContent=first.toLocaleDateString('en-PH',{month:'long',year:'numeric'});
 let grid='';for(let i=0;i<start;i++)grid+='<div class="calendar-cell empty"></div>';
 for(let day=1;day<=days;day++){
  const date=dateKey(year,month,day),entries=entriesOnDate(s,date),pending=entries.filter(e=>!e.record).length;
  grid+=`<button class="calendar-cell text-start ${date===selectedDate?'is-selected':''}" type="button" data-date="${date}" aria-label="${date}, ${entries.length} scheduled or logged entries, ${pending} pending" aria-pressed="${date===selectedDate}">
    <div class="calendar-number">${day}${date===today()?' ·':''}</div>
    <div class="calendar-subjects">${entries.slice(0,2).map(e=>`<div class="calendar-subject"><i class="cal-dot ${e.record?.status||'pending'}"></i><span title="${html(e.course.name)}">${html(e.course.code||e.course.name)}</span></div>`).join('')}${entries.length>2?`<div class="calendar-more">+${entries.length-2} more</div>`:''}</div>
    <div class="calendar-count">${entries.length?`${entries.length} subject${entries.length===1?'':'s'}`:''}</div></button>`;
 }
 document.querySelector('#calendar-grid').innerHTML=grid;
 document.querySelectorAll('.calendar-cell[data-date]').forEach(c=>c.classList.toggle('is-today',c.dataset.date===today()));
 showDay();
}
function showDay(){
 const s=getState(),entries=entriesOnDate(s,selectedDate),pending=entries.filter(e=>!e.record).length;
 document.querySelector('#calendar-selected-label').textContent=friendlyDate(selectedDate);
 document.querySelector('#calendar-day-count').textContent=entries.length?`${entries.length} subject${entries.length===1?'':'s'} · ${pending} pending`:'No scheduled subjects';
 document.querySelector('#calendar-day-records').innerHTML=entries.length?entries.map(({course,record,scheduled})=>`<div class="calendar-day-course border-bottom py-3">
   <div class="d-flex align-items-start justify-content-between gap-2 mb-2"><div><strong>${html(course.name)}</strong><div class="mini-muted">${html(course.time||'No time set')}${scheduled?' · Scheduled':' · Extra log'}</div></div>${statusLabel(record)}</div>
   <div class="attendance-quick-actions" role="group" aria-label="Mark attendance for ${html(course.name)}">
     <button class="btn btn-sm ${record?.status==='present'?'btn-success':'btn-outline-success'}" data-mark="present" data-course="${html(course.id)}">Present</button>
     <button class="btn btn-sm ${record?.status==='absent'?'btn-danger':'btn-outline-danger'}" data-mark="absent" data-course="${html(course.id)}">Absent</button>
     <button class="btn btn-sm ${record?.status==='excused'?'btn-warning':'btn-outline-warning'}" data-mark="excused" data-course="${html(course.id)}">Excused</button>
     <button class="btn btn-sm btn-light" data-edit-course="${html(course.id)}">${record?'Edit / note':'More'}</button>
   </div>
  </div>`).join(''):`<div class="text-secondary small py-4">No scheduled classes this day. Set weekly days in Courses & Events, or add an extra log using the button above.</div>`;
}
export function markAttendance(courseId,date,status){
 if(!['present','absent','excused'].includes(status))throw Error('Invalid attendance status.');
 const course=getState().courses.find(c=>c.id===courseId);if(!course)throw Error('Subject not found.');
 update(s=>{const existing=s.attendance.find(a=>a.courseId===courseId&&a.date===date);
 const slots=course.type==='event'&&status==='present'?{amIn:true,amOut:true,pmIn:true,pmOut:true}:null;
 if(existing)Object.assign(existing,{status,slots,updatedAt:new Date().toISOString()});
 else s.attendance.push({id:id(),courseId,date,status,slots,note:'',updatedAt:new Date().toISOString()});
 });
}
export function bind(){
 document.querySelector('#calendar-prev').onclick=()=>shift(-1);
 document.querySelector('#calendar-next').onclick=()=>shift(1);
 document.querySelector('#calendar-new').onclick=()=>openAttendanceEditor(null,{date:selectedDate});
 document.querySelector('#calendar-grid').onclick=e=>{const cell=e.target.closest('[data-date]');if(!cell)return;selectedDate=cell.dataset.date;draw();};
 document.querySelector('#calendar-day-records').onclick=e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.mark){try{markAttendance(button.dataset.course,selectedDate,button.dataset.mark);toast('Attendance saved');}catch(err){toast(err.message||'Unable to save',true);}return;}
  if(button.dataset.editCourse){const s=getState(),record=s.attendance.find(a=>a.courseId===button.dataset.editCourse&&a.date===selectedDate);
   openAttendanceEditor(record||null,{courseId:button.dataset.editCourse,date:selectedDate});}
 };
 draw();
}
function shift(delta){const [year,m]=visibleMonth.split('-').map(Number);const d=new Date(year,m-1+delta,1);visibleMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;selectedDate=dateKey(d.getFullYear(),d.getMonth(),1);draw();}
