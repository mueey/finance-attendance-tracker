import {html} from './utils.js';

/** A local, keyboard-friendly searchable chooser. Keeps the selected ID separate from search text. */
export function filterAttendanceCourses(courses,query=''){
 const needle=String(query).trim().toLocaleLowerCase();
 return courses.filter(course=>`${course.name||''} ${course.code||''} ${course.type||''}`.toLocaleLowerCase().includes(needle));
}
export function coursePickerMarkup(courses,selectedId){
 const selected=courses.find(course=>course.id===selectedId);
 return `<div class="col-12 attendance-course-picker">
  <label class="form-label" for="attendance-course-search">Search subject or event</label>
  <div class="input-group">
   <span class="input-group-text" aria-hidden="true"><span class="bi-icon bi-journal-text"></span></span>
   <input type="search" class="form-control" id="attendance-course-search" placeholder="Search by name, code, or event" autocomplete="off" aria-describedby="attendance-course-help" aria-controls="attendance-course-results">
  </div>
  <div class="form-text" id="attendance-course-help">Search to filter or scroll the list below. Select a result before saving.</div>
  <div class="attendance-selected-course" aria-live="polite">Selected: <strong id="attendance-selected-course-name">${html(selected?.name||'None')}</strong><span class="badge text-bg-light border ms-2" id="attendance-selected-course-type">${html(selected?.type==='event'?'Event':'Subject')}</span></div>
  <input type="hidden" id="fld-courseId" name="courseId" value="${html(selectedId)}">
  <div class="attendance-course-results" id="attendance-course-results" role="region" aria-label="Scrollable matching subjects and events" tabindex="0"></div>
  <p class="mini-muted mt-1 mb-0" id="attendance-course-count" aria-live="polite"></p>
 </div>`;
}
export function bindCoursePicker(form,courses,onSelect=()=>{}){
 const search=form.querySelector('#attendance-course-search');
 const list=form.querySelector('#attendance-course-results');
 const count=form.querySelector('#attendance-course-count');
 const hidden=form.elements.courseId;
 const selectedName=form.querySelector('#attendance-selected-course-name');
 const selectedType=form.querySelector('#attendance-selected-course-type');
 let matches=[];
 function draw(){
  matches=filterAttendanceCourses(courses,search.value);
  list.innerHTML=matches.length?matches.map(course=>`<button type="button" class="attendance-course-option${course.id===hidden.value?' is-selected':''}" data-course-option="${html(course.id)}" aria-pressed="${course.id===hidden.value?'true':'false'}">
   <span class="course-option-info"><strong>${html(course.name)}</strong><span class="mini-muted">${html([course.code,course.type==='event'?'Event':'Subject'].filter(Boolean).join(' · '))}</span></span>
   <span class="bi-icon ${course.id===hidden.value?'bi-clipboard-check':'bi-chevron-down'}" aria-hidden="true"></span></button>`).join(''):'<div class="attendance-course-empty" role="status">No matching subjects or events. Try a different keyword.</div>';
  count.textContent=`Showing ${matches.length} of ${courses.length} subjects / events`;
 }
 function select(id){
  const course=courses.find(c=>c.id===id);if(!course)return;
  hidden.value=course.id;
  selectedName.textContent=course.name;
  selectedType.textContent=course.type==='event'?'Event':'Subject';
  draw();
  onSelect(course);
 }
 search.addEventListener('input',()=>{draw();list.scrollTop=0;});
 list.addEventListener('click',event=>{const b=event.target.closest('[data-course-option]');if(b)select(b.dataset.courseOption);});
 search.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){
   const first=list.querySelector('[data-course-option]');if(first){event.preventDefault();first.focus();}
  }else if(event.key==='Enter'){event.preventDefault();if(matches.length)select(matches[0].id);}
 });
 list.addEventListener('keydown',event=>{
  const buttons=[...list.querySelectorAll('[data-course-option]')];
  const index=buttons.indexOf(document.activeElement);
  if(event.key==='Escape'){event.preventDefault();search.focus();}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();buttons[Math.min(buttons.length-1,Math.max(0,index+(event.key==='ArrowDown'?1:-1)))]?.focus();
  }
 });
 draw();
 return {select,refresh:draw};
}
