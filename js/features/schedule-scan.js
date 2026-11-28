import {getState,update} from '../core/store.js';
import {html,id,today,pageHead,validDate} from '../core/utils.js';
import {WEEKDAYS,formatWeekdays} from '../core/schedule.js';
import {parseScheduleText,validateScannedCourse,looksLikeDuplicate} from '../core/schedule-import.js';
import {readSchedulePhoto} from '../core/schedule-ocr.js';
import {toast} from '../core/ui.js';

const starter='CS 105 | Web Development | Mon/Wed/Fri | 8:00 AM - 9:30 AM | Room B-204 | Prof. Santos | 2026-11-09 - 2027-03-31';

export function renderPanel(){
 const semesters=getState().semesters;
 return `<div class="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3"><div><h3 class="section-title mb-1">Scan a Class Schedule</h3><p class="mini-muted mb-0">Upload a timetable or take a photo, review the detected subjects, then add confirmed classes.</p></div></div>
 <div class="row g-3 mb-4">
  <div class="col-lg-5"><section class="card h-100"><div class="card-body">
    <h4 class="section-title mb-2"><span class="bi-icon bi-journal-text me-2" aria-hidden="true"></span>1. Upload or take a picture</h4>
    <p class="text-secondary small">Choose a clear photo of a printed or digital class schedule. Avoid shadows and crop out unrelated details.</p>
    <div class="d-grid gap-2 mb-3">
      <label class="btn btn-primary" for="scan-camera">Take a photo <input id="scan-camera" type="file" accept="image/*" capture="environment" class="visually-hidden"></label>
      <label class="btn btn-outline-primary" for="scan-upload">Upload a schedule image <input id="scan-upload" type="file" accept="image/*" class="visually-hidden"></label>
    </div>
    <img id="scan-photo-preview" class="scan-photo-preview d-none" alt="Uploaded schedule for review">
    <div id="scan-status" class="small" role="status" aria-live="polite">No image selected.</div>
    <p class="form-text mt-3 mb-0">Photos are processed on-device when supported, or by an optional offline OCR helper running on your own computer. They are not sent to third-party cloud services. Automatic text reading is not supported by every mobile browser.</p>
  </div></section></div>
  <div class="col-lg-7"><section class="card h-100"><div class="card-body">
    <h4 class="section-title mb-2">2. Check the extracted text</h4>
    <label for="scan-text" class="form-label">Schedule text (editable)</label>
    <textarea id="scan-text" class="form-control scan-textarea" rows="8" placeholder="One class per line. Example:\n${html(starter)}"></textarea>
    <div class="form-text">If image recognition is unavailable, copy the text from your phone's photo/gallery app and paste it here. Supported: tables separated by |, tabs, or multiple spaces, plus labeled lines.</div>
    <div class="d-flex flex-wrap gap-2 mt-3"><button type="button" class="btn btn-primary" id="scan-parse">Find classes in text</button><button type="button" class="btn btn-outline-secondary" id="scan-example">Insert example</button></div>
   </div></section></div>
 </div>
 <section class="card mb-2 d-none" id="scan-review-section"><div class="card-body">
  <div class="d-flex align-items-start flex-wrap justify-content-between gap-2"><div><h4 class="section-title mb-1">3. Review before importing</h4><p class="mini-muted">OCR can misread course names, weekday abbreviations, dates and room numbers. Edit every field before saving.</p></div><button type="button" class="btn btn-outline-primary" id="scan-add-row">+ Add row manually</button></div>
  <div class="row g-2 align-items-end mb-3"><div class="col-md-6"><label class="form-label" for="scan-semester">Fill missing dates from a saved semester</label><select id="scan-semester" class="form-select"><option value="">Choose semester (optional)</option>${semesters.map(s=>`<option value="${html(s.id)}">${html(s.name)} (${html(s.startDate)} — ${html(s.endDate)})</option>`).join('')}</select></div><div class="col-md-6"><p class="form-text mb-0">Import is disabled for incomplete rows. Academic class fines remain zero, and existing attendance records are never overwritten.</p></div></div>
  <div id="scan-warnings" class="small mb-3" role="status"></div><div id="scan-row-list" class="scan-review-list"></div>
  <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mt-3 pt-3 border-top"><span id="scan-selected-count" class="mini-muted"></span><button id="scan-import" type="button" class="btn btn-success">Add selected classes to calendar</button></div>
 </div></section>`;
}
export function render(){return `${pageHead('Schedule Planner','Scan a Class Schedule','Take a photo or upload an image, review the detected subjects, then add confirmed weekly classes to your calendar.')}${renderPanel()}`;}

function input(label,name,value='',type='text',required=false){return `<div class="col-md-6"><label class="form-label">${html(label)}<input class="form-control" type="${type}" data-field="${name}" value="${html(value)}" ${required?'required':''}></label></div>`;}
function rowMarkup(row,index){
 return `<article class="scan-row border rounded-3 p-3 mb-3" data-row="${index}">
 <div class="d-flex justify-content-between align-items-center gap-3 mb-3"><label class="form-check-label fw-semibold"><input type="checkbox" class="form-check-input me-2" data-field="selected" ${row.selected!==false?'checked':''}>Class ${index+1}</label><button class="btn btn-sm btn-outline-danger" type="button" data-remove="${index}">Remove</button></div>
 <div class="row g-3">
 ${input('Class / subject name','name',row.name,'text',true)}
 ${input('Course code','code',row.code)}
 ${input('Time range (e.g. 8:00 AM - 9:30 AM)','time',row.time,'text',true)}
 ${input('Class Room Number','roomNumber',row.roomNumber)}
 ${input('Instructor / Professor Name','professorName',row.professorName)}
 <div class="col-12"><div class="form-label">Meeting days · <span class="scan-frequency fw-medium">${row.weekdays.length} time(s) per week</span></div><div class="weekday-grid">${WEEKDAYS.map((d,i)=>`<label class="weekday-choice"><input type="checkbox" data-day="${i}" ${row.weekdays.includes(i)?'checked':''}><span>${html(d.slice(0,3))}</span></label>`).join('')}</div></div>
 ${input('First date / semester start','startDate',row.startDate,'date',true)}
 ${input('Last date / semester end','endDate',row.endDate,'date',true)}
 <div class="col-12"><details><summary class="small text-secondary">Original detected line</summary><div class="small text-secondary scan-raw mt-2">${html(row.source||'Manually added')}</div></details></div>
 </div></article>`;
}

export function bind(){
 let drafts=[],previewUrl='';
 const status=document.querySelector('#scan-status');
 const preview=document.querySelector('#scan-photo-preview');
 const textArea=document.querySelector('#scan-text');
 const review=document.querySelector('#scan-review-section');
 const list=document.querySelector('#scan-row-list');
 const semester=document.querySelector('#scan-semester');
 function currentDrafts(){
  const rows=[...list.querySelectorAll('[data-row]')];
  if(!rows.length)return drafts;
  return rows.map((el,i)=>{const get=field=>el.querySelector(`[data-field="${field}"]`);return {source:drafts[i]?.source||'',selected:get('selected').checked,name:get('name').value.trim(),code:get('code').value.trim(),time:get('time').value.trim(),roomNumber:get('roomNumber').value.trim(),professorName:get('professorName').value.trim(),startDate:get('startDate').value,endDate:get('endDate').value,weekdays:[...el.querySelectorAll('[data-day]:checked')].map(x=>Number(x.dataset.day))};});
 }
 function setRows(rows){drafts=rows.map(r=>({...r,weekdays:[...(r.weekdays||[])],selected:r.selected!==false}));review.classList.remove('d-none');list.innerHTML=drafts.map(rowMarkup).join('');count();}
 function count(){const selected=[...list.querySelectorAll('[data-field="selected"]')].filter(x=>x.checked).length;document.querySelector('#scan-selected-count').textContent=`${selected} of ${list.querySelectorAll('[data-row]').length} classes selected`;
  document.querySelector('#scan-import').disabled=!selected;}
 async function photoChanged(event){
  const file=event.target.files?.[0];if(!file)return;
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  if(!file.type.startsWith('image/')||file.size>8*1024*1024){status.textContent='Choose a supported image under 8 MB.';preview.classList.add('d-none');return;}
  previewUrl=URL.createObjectURL(file);preview.src=previewUrl;preview.classList.remove('d-none');
  status.textContent='Reading schedule image…';
  try{const result=await readSchedulePhoto(file);textArea.value=result.text;status.textContent=`Text extracted using ${result.engine}. Review it before importing.`;parse();}
  catch(err){status.textContent=err.message||'Could not read the image. Copy the text into the box.';}
 }
 document.querySelector('#scan-camera').addEventListener('change',photoChanged);
 document.querySelector('#scan-upload').addEventListener('change',photoChanged);
 function parse(){const result=parseScheduleText(textArea.value);document.querySelector('#scan-warnings').textContent=result.warnings.join(' ');setRows(result.rows);if(!result.rows.length)list.innerHTML='<p class="text-secondary small">No classes detected. Use “Add row manually”, then enter the subject, meeting days and semester dates.</p>';review.scrollIntoView({behavior:'smooth',block:'start'});}
 document.querySelector('#scan-parse').onclick=parse;
 document.querySelector('#scan-example').onclick=()=>{textArea.value=starter;parse();};
 document.querySelector('#scan-add-row').onclick=()=>{const entries=currentDrafts();entries.push({name:'',code:'',time:'',roomNumber:'',professorName:'',weekdays:[],startDate:'',endDate:'',source:''});setRows(entries);};
 semester.onchange=()=>{const s=getState().semesters.find(x=>x.id===semester.value);if(!s)return;const entries=currentDrafts();entries.forEach(r=>{if(!r.startDate)r.startDate=s.startDate;if(!r.endDate)r.endDate=s.endDate;});setRows(entries);};
 list.addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');if(!remove)return;const entries=currentDrafts();entries.splice(Number(remove.dataset.remove),1);setRows(entries);});
 list.addEventListener('change',e=>{if(e.target.matches('[data-field="selected"]'))count();if(e.target.matches('[data-day]')){const el=e.target.closest('[data-row]');el.querySelector('.scan-frequency').textContent=`${el.querySelectorAll('[data-day]:checked').length} time(s) per week`;}});
 document.querySelector('#scan-import').onclick=()=>{
  const entries=currentDrafts().filter(x=>x.selected);
  if(!entries.length){toast('Choose at least one class.',true);return;}
  for(let i=0;i<entries.length;i++){
   const problem=validateScannedCourse(entries[i]);if(problem){toast(`Class ${i+1}: ${problem}`,true);return;}
  }
  const existing=getState().courses;
  const staged=[];
  for(const item of entries){if(looksLikeDuplicate([...existing,...staged],item)){toast(`Possible duplicate: ${item.name}. Uncheck it before importing.`,true);return;}staged.push(item);}
  if(!confirm(`Add ${staged.length} academic class(es) to the calendar? Check all dates and names carefully.`))return;
  update(state=>{for(const entry of staged){state.courses.push({id:id(),type:'class',name:entry.name.slice(0,250),code:entry.code.slice(0,60),weekdays:entry.weekdays,schedule:formatWeekdays(entry.weekdays),time:entry.time,roomNumber:entry.roomNumber.slice(0,80),professorName:entry.professorName.slice(0,120),venue:'',startDate:entry.startDate,endDate:entry.endDate,eventDate:'',fineRate:0,createdAt:today(),archived:false});}});
  toast(`${staged.length} class(es) added. Your calendar is ready.`);const modal=document.querySelector('#schedule-tools-modal');if(modal&&window.bootstrap?.Modal)bootstrap.Modal.getOrCreateInstance(modal).hide();location.hash='#/courses';
 };
 window.addEventListener('pagehide',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);},{once:true});
}
