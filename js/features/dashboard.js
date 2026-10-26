import {getState,update} from '../core/store.js';
import {getFinance,getAttendanceStats,overdueBills,billBalance,sessionsToTarget} from '../core/finance.js';
import {html,money,chip,blank,pageHead,friendlyDate,today} from '../core/utils.js';
import {captureClick,changeRoute,toast} from '../core/ui.js';
import {entriesOnDate} from '../core/schedule.js';
import {markAttendance} from './calendar.js';
import {openAttendanceEditor} from './attendance.js';
import {countEventSlots} from '../core/event-slots.js';
import {getSemesterFinance} from '../core/semesters.js';
import {getSemesterAttendance} from '../core/semester-attendance.js';
import {attendanceRing} from '../core/progress-ring.js';
import {semesterOptions,openSemesterEditor,deleteSemester} from './semesters.js';
// Keep the expanded state if changing a record causes the dashboard to rerender.
let subjectListExpanded = false;
export function render(){const s=getState(),f=getFinance(s),stats=getAttendanceStats(s),overdue=overdueBills(s);const needed=sessionsToTarget(stats.present,stats.absent,s.settings.minimumAttendance);const recent=[...s.attendance].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);const courses=new Map(s.courses.map(c=>[c.id,c.name]));const currentSemester=s.settings.selectedSemesterId||'all';const term=s.semesters.some(x=>x.id===currentSemester)?currentSemester:'all';const semesterSummary=getSemesterFinance(s,term);const semesterAttendance=getSemesterAttendance(s,term);const termDetails=s.semesters.find(x=>x.id===term);const todaysClasses=entriesOnDate(s,today()).filter(e=>e.scheduled);const bills=s.bills.filter(b=>billBalance(b,s)>0).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).slice(0,5);
return `${pageHead('Overview','Your attendance, at a glance','Keep track of sessions, missed days, fines, and upcoming payments.','<button class="btn btn-primary" id="dashboard-add">+ New attendance</button>')}
<div class="row g-3 mb-4">
 <div class="col-6 col-xl-3"><div class="card metric"><div class="metric-label">Attendance rate</div><div class="metric-value">${stats.rate===null?'—':stats.rate+'%'}</div><div class="metric-note">${stats.present} present · ${stats.absent} absent</div><div class="metric-icon">◉</div></div></div>
 <div class="col-6 col-xl-3"><div class="card metric"><div class="metric-label">Total absences</div><div class="metric-value">${stats.absent}</div><div class="metric-note">Across ${s.courses.length} courses / events</div><div class="metric-icon red">⌁</div></div></div>
 <div class="col-6 col-xl-3"><div class="card metric"><div class="metric-label">Total collected</div><div class="metric-value">${money(f.paid)}</div><div class="metric-note">Recorded payments</div><div class="metric-icon green">↗</div></div></div>
 <div class="col-6 col-xl-3"><div class="card metric"><div class="metric-label">Outstanding balance</div><div class="metric-value">${money(f.due)}</div><div class="metric-note">${f.credit>0?`Credit: ${money(f.credit)}`: `${overdue.length} overdue bills`}</div><div class="metric-icon yellow">₱</div></div></div>
</div>
<section class="row g-3 mb-4" aria-label="Financial snapshot and overall attendance health">
 <div class="col-lg-4"><div class="card quick-card h-100"><div class="card-body d-flex flex-column"><div class="page-kicker" style="color:#90e2d1">FINANCIAL SNAPSHOT</div><h2 class="fs-3 fw-bold mt-3">${money(f.charged)}</h2><p class="text-white-50">Total recorded charges · all time</p><div class="mt-3 small d-flex justify-content-between gap-2"><span>Absence fines + adjustments</span><strong>${money(f.fineTotal)}</strong></div><hr style="opacity:.15"><div class="small d-flex justify-content-between gap-2"><span>Other bills</span><strong>${money(f.billsTotal)}</strong></div><div class="mt-auto pt-4"><button class="btn btn-light w-100" id="dashboard-payment">Record a payment</button></div></div></div></div>
 <div class="col-lg-8"><div class="card h-100 attendance-health-card"><div class="card-header d-flex flex-wrap justify-content-between gap-2"><span>Attendance health</span><span class="text-secondary small">Overall attendance target: ${html(s.settings.minimumAttendance)}%</span></div><div class="card-body">
  <div class="attendance-health-layout">
   <div class="d-flex flex-column align-items-center gap-2">
    ${attendanceRing(stats.rate,{label:'Overall recorded attendance',target:s.settings.minimumAttendance,size:'overall'})}
    <span class="chip ${stats.rate===null?'chip-holiday':stats.rate<s.settings.minimumAttendance?'chip-absent':'chip-present'}">${stats.rate===null?'Not started':stats.rate<s.settings.minimumAttendance?'Below target':'On track'}</span>
    <div class="mini-muted text-center">Minimum target: <strong>${html(s.settings.minimumAttendance)}%</strong></div>
   </div>
   <div class="attendance-health-details">
    <h3 class="h6 fw-bold mb-1">Overall attendance</h3>
    <p class="mini-muted mb-3">${stats.present} present · ${stats.absent} absent · Excused not counted</p>
    ${needed>0?`<div class="insight mb-3">${Number.isFinite(needed)?`Attend your next <strong>${needed}</strong> session${needed===1?'':'s'} to reach the ${s.settings.minimumAttendance}% minimum (assuming no new absences).`:'A 100% target cannot be restored after an absence.'}</div>`:''}
    <div class="row g-3">${stats.byCourse.filter(c=>!c.archived).slice(0,4).map(c=>`<div class="col-sm-6"><div class="d-flex justify-content-between small gap-2 mb-1"><strong>${html(c.name)}</strong><span>${c.rate===null?'—':c.rate+'%'}</span></div><div class="progress"><div class="progress-bar" style="width:${c.rate??0}%"></div></div></div>`).join('')||'<div class="text-secondary">Add a course to see attendance health here.</div>'}</div>
   </div>
  </div>
 </div></div></div>
</section>
<div class="card mb-4"><div class="card-header d-flex justify-content-between align-items-center"><span>Today's scheduled classes &amp; events</span><button class="link-button small" id="dashboard-calendar">Open calendar</button></div><div class="card-body pt-2">${todaysClasses.length?`<div class="row g-3">${todaysClasses.map(({course,record})=>`<div class="col-lg-6"><div class="dashboard-today d-flex flex-wrap justify-content-between align-items-center gap-2"><div><strong>${html(course.name)}</strong><div class="mini-muted">${html(course.time||'Time not set')} · ${record?chip(record.status):'<span class="chip chip-pending">Pending</span>'}</div></div>${course.type==='event'?`<div class="d-flex flex-column gap-1"><div class="mini-muted">${record?.slots?(()=>{const n=countEventSlots(record.slots,record.status);return `${n.absent} Absent slots · ${n.excused} Excused`})():'Select individual time slots'}</div><button class="btn btn-sm btn-outline-primary" data-today-event="${html(course.id)}">Set AM/PM slots</button></div>`:
 `<div class="attendance-quick-actions"><button class="btn btn-sm ${record?.status==='present'?'btn-success':'btn-outline-success'}" data-today-mark="present" data-course="${html(course.id)}">Present</button><button class="btn btn-sm ${record?.status==='absent'?'btn-danger':'btn-outline-danger'}" data-today-mark="absent" data-course="${html(course.id)}">Absent</button><button class="btn btn-sm ${record?.status==='excused'?'btn-warning':'btn-outline-warning'}" data-today-mark="excused" data-course="${html(course.id)}">Excused</button></div>`}</div></div>`).join('')}</div>`:blank('No scheduled classes today','Choose meeting weekdays in Courses & Events to populate the calendar automatically.')}</div></div>
<section class="card semester-hub mb-4" aria-label="Semester summaries">
 <div class="card-body">
  <div class="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
   <div><div class="page-kicker mb-1">SEMESTER SUMMARIES</div><h2 class="section-title mb-1">Your semester overview</h2><p class="mini-muted mb-0">Choose a semester. Tap either card to view the complete details.</p></div>
   <div class="semester-controls">
    <div><label for="dashboard-semester-select" class="form-label mb-1">Semester</label><select class="form-select semester-picker" id="dashboard-semester-select">${semesterOptions(s).map(([value,label])=>`<option value="${html(value)}" ${value===term?'selected':''}>${html(label)}</option>`).join('')}</select></div>
    <div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-outline-primary btn-sm" id="semester-add">+ Add semester</button><button type="button" class="btn btn-light btn-sm" id="semester-edit" ${term==='all'?'disabled':''}>Edit</button><button type="button" class="btn btn-outline-danger btn-sm" id="semester-delete" ${term==='all'?'disabled':''}>Delete</button></div>
   </div>
  </div>
  <div class="row g-3">
   <div class="col-md-6"><button type="button" class="semester-summary-launch" data-summary-open="financial" aria-haspopup="dialog" aria-controls="summary-modal">
    <span class="semester-launch-heading"><span class="bi-icon bi-cash-coin" aria-hidden="true"></span><strong>Semester Financial Summary</strong></span>
    <span class="semester-launch-primary"><span><span class="mini-muted">Total paid</span><strong>${money(semesterSummary.paid)}</strong></span><span><span class="mini-muted">Remaining</span><strong class="text-due">${money(semesterSummary.due)}</strong></span></span>
    <span class="semester-launch-action">View financial details <span class="bi-icon bi-chevron-down" aria-hidden="true"></span></span>
   </button></div>
   <div class="col-md-6"><button type="button" class="semester-summary-launch" data-summary-open="attendance" aria-haspopup="dialog" aria-controls="summary-modal">
    <span class="semester-launch-heading"><span class="bi-icon bi-journal-check" aria-hidden="true"></span><strong>Semester Attendance Summary</strong></span>
    <span class="semester-launch-attendance">${attendanceRing(semesterAttendance.rate,{label:'Semester attendance rate',size:'semester'})}<span class="semester-launch-counts"><span class="mini-muted">${semesterAttendance.present} Present · ${semesterAttendance.absent} Absent</span><span class="mini-muted">${semesterAttendance.excused} Excused · ${semesterAttendance.pendingDates} Pending</span></span></span>
    <span class="semester-launch-action">View attendance details <span class="bi-icon bi-chevron-down" aria-hidden="true"></span></span>
   </button></div>
  </div>
 </div>
</section>
<template id="semester-financial-detail-template"><section class="card semester-summary mb-0" aria-label="Semester financial summary">
 <div class="card-body pb-2"><div class="d-flex flex-wrap align-items-start justify-content-between gap-3">
  <div><div class="page-kicker mb-2">SEMESTER FINANCIAL SUMMARY</div><h2 class="section-title mb-1">Charges &amp; payments by semester</h2><p class="mini-muted mb-0">${termDetails?`${html(termDetails.startDate)} to ${html(termDetails.endDate)} · ${html(termDetails.name)}`:'All recorded attendance fines, bills, and payments'}</p></div>
 </div></div>
 <div class="card-body pt-2"><div class="row g-3">
  <div class="col-6 col-xl-3"><div class="semester-metric"><div class="metric-label">Total charges</div><div class="semester-amount">${money(semesterSummary.charged)}</div><div class="metric-note">Fines + other fees</div></div></div>
  <div class="col-6 col-xl-3"><div class="semester-metric"><div class="metric-label">Total paid</div><div class="semester-amount text-success">${money(semesterSummary.paid)}</div><div class="metric-note">Payments credited to this term</div></div></div>
  <div class="col-6 col-xl-3"><div class="semester-metric"><div class="metric-label">Remaining balance</div><div class="semester-amount text-due">${money(semesterSummary.due)}</div><div class="metric-note">${semesterSummary.credit>0?`Overpayment credit ${money(semesterSummary.credit)}`:'After credited payments'}</div></div></div>
  <div class="col-6 col-xl-3"><div class="semester-metric"><div class="metric-label">Total fines</div><div class="semester-amount">${money(semesterSummary.fineTotal)}</div><div class="metric-note">Including manual adjustments</div></div></div>
 </div><div class="semester-breakdown d-flex flex-wrap gap-3 justify-content-between mt-3"><span>Other fees: <strong>${money(semesterSummary.billsTotal)}</strong></span><span>Fine payments: <strong>${money(semesterSummary.finePaid)}</strong></span><span>Bill payments: <strong>${money(semesterSummary.billPaid)}</strong></span>${term!=='all'?`<span>Payments received during these dates: <strong>${money(semesterSummary.receivedInPeriod)}</strong></span>`:''}</div>
 <p class="mini-muted mt-3 mb-0">${term==='all'?'Showing overall totals. Add a semester to filter by your school term.':'Attendance and manual fine dates determine semester fines. Bills use their assigned semester or due/creation date. Bill payments follow the bill even if paid later; fine payments use the selected semester or payment date. “Payments received” uses transaction dates.'}</p>
 ${!s.semesters.length?'<div class="insight mt-3">No semesters configured yet. Click <strong>+ Add</strong> and enter your school semester name, start date, and end date.</div>':''}
 </div>
</section>
</template>
<template id="semester-attendance-detail-template"><section class="card semester-summary semester-attendance mb-0" aria-label="Semester attendance summary">
 <div class="card-body">
  <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
   <div><div class="page-kicker mb-2">SEMESTER ATTENDANCE SUMMARY</div><h2 class="section-title mb-1">Attendance for ${termDetails?html(termDetails.name):'all dates'}</h2><p class="mini-muted mb-0">Based on attendance logs; unlogged scheduled dates stay Pending, never automatically Absent.</p></div>
   <span class="badge text-bg-light border">${semesterAttendance.recordedDates} logged dates</span>
  </div>
  <div class="row g-3 align-items-stretch">
   <div class="col-sm-6 col-xl-4"><div class="semester-metric semester-rate d-flex flex-column align-items-center text-center"><div class="metric-label">Attendance rate</div>${attendanceRing(semesterAttendance.rate,{label:'Semester attendance rate',size:'semester'})}<div class="metric-note mt-2">Present ÷ (Present + Absent)</div></div></div>
   <div class="col-6 col-sm-3 col-xl-2"><div class="semester-metric"><div class="metric-label">Present</div><div class="semester-amount text-success">${semesterAttendance.present}</div><div class="metric-note">Attendance units</div></div></div>
   <div class="col-6 col-sm-3 col-xl-2"><div class="semester-metric"><div class="metric-label">Absent</div><div class="semester-amount text-danger">${semesterAttendance.absent}</div><div class="metric-note">Attendance units</div></div></div>
   <div class="col-6 col-sm-3 col-xl-2"><div class="semester-metric"><div class="metric-label">Excused</div><div class="semester-amount">${semesterAttendance.excused}</div><div class="metric-note">Excluded from rate</div></div></div>
   <div class="col-6 col-sm-3 col-xl-2"><div class="semester-metric"><div class="metric-label">Pending</div><div class="semester-amount">${semesterAttendance.pendingDates}</div><div class="metric-note">Scheduled dates through today</div></div></div>
  </div>
  <div class="semester-breakdown d-flex flex-wrap gap-3 mt-3"><span>Logged dates: <strong>${semesterAttendance.recordedDates}</strong></span><span>Present dates: <strong>${semesterAttendance.presentDates}</strong></span><span>Absent dates: <strong>${semesterAttendance.absentDates}</strong></span><span>Excused dates: <strong>${semesterAttendance.excusedDates}</strong></span><span>Holidays: <strong>${semesterAttendance.holidayDates}</strong></span></div>
  <div class="semester-breakdown d-flex flex-wrap gap-3 mt-2"><span><strong>Event AM/PM slots:</strong></span><span>Present: <strong>${semesterAttendance.eventSlots.present}</strong></span><span>Absent: <strong>${semesterAttendance.eventSlots.absent}</strong></span><span>Excused: <strong>${semesterAttendance.eventSlots.excused}</strong></span>${semesterAttendance.legacyEventDays?`<span>Legacy event days without slot detail: <strong>${semesterAttendance.legacyEventDays}</strong></span>`:''}</div>
  <p class="mini-muted mt-3 mb-3">Each class log counts as one attendance unit; each recorded event AM/PM In/Out slot counts as one unit. Older event logs without slot details count as one unit. Excused, Holiday, and Pending are excluded from the rate. Mixed-status event days can appear as an Absent date while retaining Present slots.</p>
  <div class="semester-subject-section mt-3">
   <button id="semester-subject-toggle" type="button" class="semester-subject-toggle w-100" data-bs-toggle="collapse" data-bs-target="#semester-subject-collapse" aria-expanded="${subjectListExpanded?'true':'false'}" aria-controls="semester-subject-collapse">
    <span class="d-flex flex-wrap align-items-center gap-2"><span class="bi-icon bi-journal-text" aria-hidden="true"></span><strong>Subjects &amp; Events</strong><span class="badge rounded-pill text-bg-light border">${semesterAttendance.byCourse.length}</span></span>
    <span class="d-flex align-items-center gap-2"><span class="small fw-semibold semester-expand-label"><span class="semester-expand-closed">View details</span><span class="semester-expand-open">Hide details</span></span><span class="bi-icon bi-chevron-down semester-chevron" aria-hidden="true"></span></span>
   </button>
   <div id="semester-subject-collapse" class="collapse ${subjectListExpanded?'show':''}" aria-labelledby="semester-subject-toggle">
    <div class="semester-subject-panel">
     <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2"><span class="mini-muted">Scroll to browse subjects and events. Swipe sideways on smaller screens.</span><button type="button" class="link-button small" id="semester-attendance-logs">Open attendance logs</button></div>
     ${semesterAttendance.byCourse.length?`<div class="semester-course-table" role="region" aria-label="Scrollable subject and event attendance details" tabindex="0"><table class="table table-sm mb-0"><thead><tr><th>Subject / Event</th><th>Present</th><th>Absent</th><th>Excused</th><th>Pending days</th><th>Rate</th></tr></thead><tbody>${semesterAttendance.byCourse.map(c=>`<tr><td><strong>${html(c.name)}</strong><div class="mini-muted">${c.type==='event'?'Event':'Class'}</div></td><td>${c.present}</td><td>${c.absent}</td><td>${c.excused}</td><td>${c.pendingDates}</td><td class="fw-bold">${c.rate===null?'—':c.rate+'%'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="insight">No attendance records or scheduled dates for this selection. Add a subject schedule or log an attendance status to get started.</div>'}
    </div>
   </div>
  </div>
 </div>
</section>
</template>
<div class="row g-3"><div class="col-xl-7"><div class="card h-100"><div class="card-header d-flex justify-content-between"><span>Recent attendance</span><button class="link-button small" id="dashboard-log">View all</button></div><div class="card-body pt-2">${recent.length?`<div class="table-wrap"><table class="table"><tbody>${recent.map(a=>`<tr><td class="mono small">${friendlyDate(a.date)}</td><td>${html(courses.get(a.courseId)||'Unknown')}</td><td class="text-end">${chip(a.status)}</td></tr>`).join('')}</tbody></table></div>`:blank('No records yet','Use Log attendance to add one.')}</div></div></div><div class="col-xl-5"><div class="card h-100"><div class="card-header d-flex justify-content-between"><span>Outstanding bills</span><button class="link-button small" id="dashboard-bills">View bills</button></div><div class="card-body pt-2">${bills.length?bills.map(b=>`<div class="d-flex justify-content-between border-bottom py-3 gap-3"><div><strong>${html(b.title)}</strong><div class="mini-muted">${b.dueDate?`Due ${friendlyDate(b.dueDate)}`:'No due date'} ${b.dueDate&&b.dueDate<today()?'<span class="text-due"> · OVERDUE</span>':''}</div></div><strong class="text-due mono">${money(Math.max(0,billBalance(b,s)))}</strong></div>`).join(''):blank('All clear','No unpaid bills currently.')}</div></div></div></div>`;}
export function bind(){
 const picker=document.querySelector('#dashboard-semester-select');
 if(picker)picker.onchange=()=>update(s=>{s.settings.selectedSemesterId=picker.value;});
 const summaryModal=document.querySelector('#summary-modal');
 const summaryBody=document.querySelector('#summary-modal-body');
 const summaryTitle=document.querySelector('#summary-modal-title');
 document.querySelectorAll('[data-summary-open]').forEach(button=>button.addEventListener('click',()=>{
  const type=button.dataset.summaryOpen;
  const template=document.querySelector(`#semester-${type==='financial'?'financial':'attendance'}-detail-template`);
  if(!template)return;
  summaryTitle.textContent=type==='financial'?'Semester Financial Summary':'Semester Attendance Summary';
  summaryBody.innerHTML=template.innerHTML;
  summaryBody.scrollTop=0;
  const subjectPanel=summaryBody.querySelector('#semester-subject-collapse');
  if(subjectPanel){
   subjectPanel.addEventListener('show.bs.collapse',()=>{subjectListExpanded=true;});
   subjectPanel.addEventListener('hide.bs.collapse',()=>{subjectListExpanded=false;});
  }
  const logs=summaryBody.querySelector('#semester-attendance-logs');
  if(logs)logs.onclick=()=>{
   summaryModal.addEventListener('hidden.bs.modal',()=>changeRoute('attendance'),{once:true});
   bootstrap.Modal.getOrCreateInstance(summaryModal).hide();
  };
  bootstrap.Modal.getOrCreateInstance(summaryModal).show();
 }));
 captureClick('semester-add',()=>openSemesterEditor());
 captureClick('semester-edit',()=>{const id=getState().settings.selectedSemesterId,sem=getState().semesters.find(x=>x.id===id);if(sem)openSemesterEditor(sem);});
 captureClick('semester-delete',()=>{const id=getState().settings.selectedSemesterId,sem=getState().semesters.find(x=>x.id===id);if(sem)deleteSemester(sem);});
 captureClick('dashboard-add',()=>document.getElementById('quick-attendance').click());
 captureClick('dashboard-payment',()=>changeRoute('payments'));
 captureClick('dashboard-calendar',()=>changeRoute('calendar'));
 document.querySelectorAll('[data-today-mark]').forEach(button=>button.onclick=()=>{try{markAttendance(button.dataset.course,today(),button.dataset.todayMark);toast('Attendance saved');}catch(err){toast(err.message,true);}});
 document.querySelectorAll('[data-today-event]').forEach(button=>button.onclick=()=>{const date=today(),record=getState().attendance.find(a=>a.courseId===button.dataset.todayEvent&&a.date===date);openAttendanceEditor(record||null,{courseId:button.dataset.todayEvent,date});});
 captureClick('dashboard-log',()=>changeRoute('attendance'));
 captureClick('dashboard-bills',()=>changeRoute('bills'));
}
