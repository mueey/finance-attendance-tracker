import {getState,update} from '../core/store.js';
import {EVENT_SLOT_KEYS,EVENT_SLOT_LABELS,EVENT_SLOT_STATUSES,normalizeEventSlots,eventDayStatus,countEventSlots} from '../core/event-slots.js';
import {getFinance} from '../core/finance.js';
import {round2,id,today,html,money,field,selectField,optionList,chip,blank,pageHead,friendlyDate,validDate} from '../core/utils.js';
import {editModal,confirmDelete,toast,captureClick} from '../core/ui.js';
const statusOptions=[['present','Present'],['absent','Absent'],['excused','Excused (no fine)'],['holiday','Holiday (excluded)']];
const slotOptions=[['present','Present'],['absent','Absent — charge fine'],['excused','Excused — no fine']];
export function openAttendanceEditor(record=null,defaults={}){
 const s=getState(),courses=s.courses.filter(c=>!c.archived||c.id===record?.courseId);
 if(!courses.length){toast('Add an active course or event first.',true);return;}
 const courseId=record?.courseId||defaults.courseId||courses[0].id;
 const defaultSlots=normalizeEventSlots(record?.slots,record?.status)||Object.fromEntries(EVENT_SLOT_KEYS.map(k=>[k,record?.status==='absent'?'absent':record?.status==='excused'?'excused':'present']));
 const slotInputs=EVENT_SLOT_KEYS.map(key=>`<div class="col-sm-6">${selectField('slot_'+key,EVENT_SLOT_LABELS[key],slotOptions,defaultSlots[key],'col-12')}</div>`).join('');
 editModal({title:record?'Edit attendance entry':'Log attendance',submit:record?'Update attendance':'Save attendance',body:`<div class="row g-3">
 ${selectField('courseId','Course or event',courses.map(c=>[c.id,`${c.name} (${c.type})`]),courseId)}
 ${field('date','Date',record?.date||defaults.date||today(),{type:'date',required:true})}
 <div class="col-12" id="class-status">${selectField('status','Attendance status',statusOptions,record?.status||'present','col-12')}</div>
 <div class="col-12" id="event-status"><div class="card bg-light border-0"><div class="card-body">
 <div class="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-2"><strong>Event time-in / time-out</strong><span class="badge text-bg-secondary">Each Absent slot = 1 fine</span></div>
 <p class="form-text mt-1">Individually choose Present, Absent, or Excused for each slot. The event fine rate applies separately to every Absent choice.</p>
 ${selectField('eventDayType','Event day type',[['regular','Scheduled / normal'],['holiday','Holiday / cancelled (no fines)']],record?.status==='holiday'?'holiday':'regular','col-12')}
 <div id="event-slot-fields" class="row g-2 mt-1">${slotInputs}</div>
 <div class="insight mt-3" id="event-fine-preview" aria-live="polite"></div>
 ${record?.status==='absent'&&!record.slots?'<div class="alert alert-warning small mt-2 mb-0">This old event absence was charged once under the previous rules. If you save it with four Absent slots, it will be recalculated as four fines.</div>':''}
 </div></div></div>
 <div class="col-12"><label class="form-label" for="fld-note">Note / reason</label><input class="form-control" id="fld-note" name="note" value="${html(record?.note||'')}" placeholder="Optional explanation"></div>
 <div class="col-12"><div class="insight">Editing this record replaces its previous statuses. Fines recalculate instead of being duplicated; recorded payments stay in your ledger.</div></div></div>`,onSave:d=>{
   if(!validDate(d.date))throw Error('Enter a valid date.');
   const c=getState().courses.find(x=>x.id===d.courseId);if(!c)throw Error('Course not found.');
   let status=d.status,slots=null;
   if(c.type==='event'){
     if(d.eventDayType==='holiday')status='holiday';
     else{
       slots=Object.fromEntries(EVENT_SLOT_KEYS.map(k=>[k,d['slot_'+k]]));
       if(!Object.values(slots).every(x=>EVENT_SLOT_STATUSES.includes(x)))throw Error('Choose an attendance status for each event slot.');
       status=eventDayStatus(slots);
     }
   }else if(!statusOptions.some(([v])=>v===status))throw Error('Invalid attendance status.');
   update(state=>{
     const existing=state.attendance.find(a=>a.courseId===d.courseId&&a.date===d.date);
     if(existing&&existing.id!==record?.id)throw Error('An attendance entry already exists for this course and date. Edit that entry instead.');
     const value={courseId:d.courseId,date:d.date,status,slots,note:d.note.trim(),updatedAt:new Date().toISOString()};
     if(record)Object.assign(state.attendance.find(x=>x.id===record.id),value);
     else state.attendance.push({id:id(),...value});
   });
 }});
 const form=document.querySelector('#editor-form');
 function sync(){
   const course=s.courses.find(c=>c.id===form.elements.courseId.value),isEvent=course?.type==='event';
   document.querySelector('#event-status').classList.toggle('d-none',!isEvent);
   document.querySelector('#class-status').classList.toggle('d-none',isEvent);
   const holiday=isEvent&&form.elements.eventDayType.value==='holiday';
   document.querySelector('#event-slot-fields').classList.toggle('d-none',holiday);
   document.querySelectorAll('#event-slot-fields select').forEach(el=>el.disabled=!isEvent||holiday);
   form.elements.status.disabled=isEvent;
   const missed=isEvent&&!holiday?EVENT_SLOT_KEYS.filter(k=>form.elements['slot_'+k].value==='absent').length:0;
   const rate=Number(course?.fineRate||0);
   document.querySelector('#event-fine-preview').textContent=isEvent?`${missed} Absent slot${missed===1?'':'s'} × ${money(rate)} = ${money(round2(missed*rate))} total event fine${holiday?' (holiday: no fine)':''}`:'';
 }
 form.elements.courseId.onchange=sync;form.elements.eventDayType.onchange=sync;
 EVENT_SLOT_KEYS.forEach(key=>form.elements['slot_'+key].onchange=sync);
 sync();
}
export function render(){const s=getState();return `${pageHead('Attendance log','Attendance records','Record class attendance or each event check-in/out separately. Edit past entries any time.','<button class="btn btn-primary" id="add-attendance">+ Log attendance</button>')}<div class="card"><div class="card-body"><div class="filter-row mb-4"><div><label class="form-label">Course / event</label><select id="attendance-course" class="form-select"><option value="">All courses</option>${optionList(s.courses.map(c=>({id:c.id,name:c.name})))}</select></div><div><label class="form-label">Status</label><select id="attendance-status" class="form-select"><option value="">All statuses</option>${statusOptions.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div><div><label class="form-label">Find date</label><input type="date" id="attendance-date" class="form-control"></div><button class="btn btn-light" id="attendance-clear">Clear filters</button></div><div id="attendance-table"></div></div></div>`;}
function draw(){
 const s=getState(),courseId=document.querySelector('#attendance-course').value,status=document.querySelector('#attendance-status').value,date=document.querySelector('#attendance-date').value;
 const courses=new Map(s.courses.map(c=>[c.id,c])),fineByAttendance=new Map();
 for(const fine of getFinance(s).automatic)fineByAttendance.set(fine.attendanceId,(fineByAttendance.get(fine.attendanceId)||0)+fine.amount);
 const items=s.attendance.filter(a=>(!courseId||a.courseId===courseId)&&(!status||a.status===status)&&(!date||a.date===date)).sort((a,b)=>b.date.localeCompare(a.date));
 document.querySelector('#attendance-table').innerHTML=items.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Course / event</th><th>Status</th><th>Event slots</th><th>Fine</th><th>Note</th><th>Actions</th></tr></thead><tbody>${items.map(a=>{
   const course=courses.get(a.courseId),counts=course?.type==='event'?countEventSlots(a.slots,a.status):null;
   const slotSummary=counts?counts.legacy?'Legacy absence (1 fine)':a.status==='holiday'?'Holiday':`${counts.present} Present · ${counts.absent} Absent · ${counts.excused} Excused`:'—';
   return `<tr><td class="mono">${friendlyDate(a.date)}</td><td class="fw-semibold">${html(course?.name||'Deleted course')}</td><td>${chip(a.status)}</td><td class="small">${html(slotSummary)}</td><td class="mono">${money(fineByAttendance.get(a.id)||0)}</td><td class="text-secondary small">${html(a.note||'—')}</td><td><div class="d-flex gap-1"><button class="btn btn-sm btn-outline-primary table-action" data-edit="${html(a.id)}">Edit</button><button class="btn btn-sm btn-outline-danger table-action" data-delete="${html(a.id)}">Delete</button></div></td></tr>`;
 }).join('')}</tbody></table></div>`:blank('No attendance records','Log your first session or adjust the filters.');
}
export function bind(){captureClick('add-attendance',()=>openAttendanceEditor());for(const k of ['attendance-course','attendance-status','attendance-date'])document.querySelector('#'+k).onchange=draw;captureClick('attendance-clear',()=>{for(const k of ['attendance-course','attendance-status','attendance-date'])document.querySelector('#'+k).value='';draw();});document.querySelector('#attendance-table').onclick=e=>{const b=e.target.closest('button');if(!b)return;const a=getState().attendance.find(x=>x.id===(b.dataset.edit||b.dataset.delete));if(!a)return;if(b.dataset.edit)openAttendanceEditor(a);if(b.dataset.delete)confirmDelete(`attendance on ${a.date}`,()=>update(s=>{s.attendance=s.attendance.filter(x=>x.id!==a.id);}));};draw();}
