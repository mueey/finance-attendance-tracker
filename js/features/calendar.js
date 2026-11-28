import {getState,update} from '../core/store.js';
import {id,today,html,chip,pageHead,friendlyDate} from '../core/utils.js';
import {entriesOnDate} from '../core/schedule.js';
import {openAttendanceEditor} from './attendance.js';
import {countEventSlots} from '../core/event-slots.js';
import {toast} from '../core/ui.js';
let visibleMonth=today().slice(0,7),selectedDate=today();
const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function dateKey(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
function statusLabel(record){return record?chip(record.status):'<span class="chip chip-pending">Pending</span>';}
export function render(){const cs=getState().settings.calendarCustomization||{},selectedStyle=cs.dateStyles?.[selectedDate]||{},selectedColor=/^#[0-9a-fA-F]{6}$/.test(selectedStyle.color||'')?selectedStyle.color:'#eee8ff';return `${pageHead('Planner','Automatic Attendance Calendar','Subjects are placed on their scheduled days. Click a date, then simply mark Present, Absent, or Excused.','<button class="btn btn-primary" id="calendar-new">+ Other attendance</button>')}
 <div class="d-flex justify-content-end mb-3"><button class="btn btn-outline-primary" type="button" id="calendar-customize-open" data-bs-toggle="modal" data-bs-target="#calendar-customize-modal"><i class="bi bi-palette me-1" aria-hidden="true"></i> Customize calendar</button></div>
 <div class="modal fade calendar-customize-modal" id="calendar-customize-modal" tabindex="-1" aria-labelledby="calendar-customize-title" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg"><div class="modal-content"><div class="modal-header"><div><h2 class="modal-title fs-5" id="calendar-customize-title">Calendar card theme</h2><p class="small text-secondary mb-0">The calendar surface stays clear, with glass-style date tiles. Personalize each date with its own color.</p></div><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body"><div class="row g-3"><div class="col-md-5"><label class="form-label" for="calendar-card-theme-file">Upload calendar card theme</label><input class="form-control" type="file" id="calendar-card-theme-file" accept="image/png,image/jpeg,image/webp"><div class="form-text">PNG, JPG, or WebP · up to 700 KB · saved on this device.</div><div class="d-flex flex-wrap gap-2 mt-3"><button class="btn btn-sm btn-outline-danger" type="button" id="calendar-remove-card-theme">Remove uploaded theme</button><button class="btn btn-sm btn-outline-secondary" type="button" id="calendar-reset-theme">Reset card theme</button></div><p class="small text-secondary mt-3 mb-0">A soft translucent layer keeps dates and attendance details readable over your image.</p><hr class="my-3"><h3 class="h6 fw-bold">Personalize individual dates</h3><label class="form-label" for="calendar-personal-date">Choose date</label><input class="form-control form-control-sm mb-2" type="date" id="calendar-personal-date" value="${selectedDate}"><label class="form-label" for="calendar-date-color">Glass date tint</label><input class="form-control form-control-color d-block mb-2" type="color" id="calendar-date-color" value="${selectedColor}" title="Choose date color"><label class="form-label" for="calendar-sticker-file">Upload a sticker</label><input class="form-control form-control-sm" type="file" id="calendar-sticker-file" accept="image/png,image/jpeg,image/webp"><div class="form-text">PNG, JPG, or WebP · up to 150 KB each · max 10 stickers.</div><label class="form-label mt-2" for="calendar-date-sticker">Sticker for selected date</label><select class="form-select form-select-sm" id="calendar-date-sticker"><option value="">No sticker</option>${(cs.stickers||[]).map(st=>`<option value="${html(st.id)}" ${selectedStyle.stickerId===st.id?'selected':''}>${html(st.name)}</option>`).join('')}</select><div class="d-flex flex-wrap gap-2 mt-2"><button class="btn btn-sm btn-primary" type="button" id="calendar-apply-date-style">Apply to date</button><button class="btn btn-sm btn-outline-secondary" type="button" id="calendar-clear-date-style">Clear date style</button></div><div class="d-flex flex-wrap gap-2 mt-2" id="calendar-sticker-library">${(cs.stickers||[]).map(st=>`<span class="calendar-sticker-thumb"><img src="${st.data}" alt="${html(st.name)}"><button type="button" data-remove-sticker="${html(st.id)}" aria-label="Remove ${html(st.name)}">×</button></span>`).join('')}</div></div><div class="col-md-7"><div class="small fw-bold mb-2">Live preview</div><div class="calendar-card-theme-preview" id="calendar-card-theme-preview"><div class="calendar-card-theme-preview-head"><span>‹</span><strong>November 2026</strong><span>›</span></div><div class="calendar-card-theme-preview-days">${weekdays.map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-card-theme-preview-grid">${Array.from({length:35},(_,i)=>`<span class="${[6,12,19,27].includes(i)?'has-event':''} ${i===17?'is-today':''}" ${i===17?`style="--calendar-date-bg:${selectedColor}"`:''}>${i<6?'':i-5}</span>`).join('')}</div></div><div class="small text-secondary mt-2" id="calendar-card-theme-name">${cs.cardThemeName?html(cs.cardThemeName):'Default calendar appearance'}</div></div></div></div><div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Close</button><button type="button" class="btn btn-primary" id="calendar-save-card-theme">Done</button></div></div></div></div>
 <div class="row g-3"><div class="col-xl-8"><div class="card calendar-main-card" id="calendar-main-card"><div class="card-body"><div class="d-flex align-items-center justify-content-between gap-2 mb-4"><button class="btn btn-light btn-sm" id="calendar-prev">← Prev</button><h2 class="section-title m-0 text-center" id="calendar-label"></h2><button class="btn btn-light btn-sm" id="calendar-next">Next →</button></div>
 <div class="calendar-header">${weekdays.map(s=>`<div>${s}</div>`).join('')}</div><div class="calendar-grid" id="calendar-grid"></div>
 <div class="d-flex gap-3 flex-wrap small text-secondary mt-4"><span><i class="legend-dot" style="background:#a3aebe"></i>Pending</span><span><i class="legend-dot" style="background:#2bb69b"></i>Present</span><span><i class="legend-dot" style="background:#eb6477"></i>Absent</span><span><i class="legend-dot" style="background:#e8b34d"></i>Excused</span><span><i class="legend-dot" style="background:#809ef2"></i>Holiday</span></div></div></div></div>
 <div class="col-xl-4"><div class="card h-100"><div class="card-header">Subjects on selected day</div><div class="card-body"><h3 class="section-title" id="calendar-selected-label"></h3><p class="small text-secondary mb-2" id="calendar-day-count"></p><div id="calendar-day-records"></div></div></div></div></div>`;}
function draw(){
 const s=getState(),[year,mon]=visibleMonth.split('-').map(Number),month=mon-1;
 const first=new Date(year,month,1),start=first.getDay(),days=new Date(year,month+1,0).getDate();
 document.querySelector('#calendar-label').textContent=first.toLocaleDateString('en-PH',{month:'long',year:'numeric'});
 let grid='';for(let i=0;i<start;i++)grid+='<div class="calendar-cell empty"></div>';
 for(let day=1;day<=days;day++){
  const date=dateKey(year,month,day),entries=entriesOnDate(s,date),pending=entries.filter(e=>!e.record).length,custom=(s.settings.calendarCustomization||{}).dateStyles?.[date]||{},sticker=(s.settings.calendarCustomization?.stickers||[]).find(x=>x.id===custom.stickerId);
  grid+=`<button class="calendar-cell text-start ${date===selectedDate?'is-selected':''}" type="button" data-date="${date}" ${/^#[0-9a-fA-F]{6}$/.test(custom.color||'')?`style="--calendar-date-bg:${custom.color}"`:''} aria-label="${date}, ${entries.length} scheduled or logged entries, ${pending} pending" aria-pressed="${date===selectedDate}">
    <div class="calendar-number">${day}${date===today()?' ·':''}</div>${sticker?`<img class="calendar-date-sticker" src="${sticker.data}" alt="${html(sticker.name)}">`:''}
    <div class="calendar-subjects">${entries.slice(0,2).map(e=>`<div class="calendar-subject"><i class="cal-dot ${e.record?.status||'pending'}"></i><span title="${html(e.course.name)}">${html(e.course.code||e.course.name)}</span></div>`).join('')}${entries.length>2?`<div class="calendar-more">+${entries.length-2} more</div>`:''}</div>
    <div class="calendar-count">${entries.length?`${entries.length} subject${entries.length===1?'':'s'}`:''}</div></button>`;
 }
 document.querySelector('#calendar-grid').innerHTML=grid;
 applyCalendarTheme(s.settings.calendarCustomization||{});
 document.querySelectorAll('.calendar-cell[data-date]').forEach(c=>c.classList.toggle('is-today',c.dataset.date===today()));
 showDay();
}
function showDay(){
 const s=getState(),entries=entriesOnDate(s,selectedDate),pending=entries.filter(e=>!e.record).length;
 document.querySelector('#calendar-selected-label').textContent=friendlyDate(selectedDate);
 document.querySelector('#calendar-day-count').textContent=entries.length?`${entries.length} subject${entries.length===1?'':'s'} · ${pending} pending`:'No scheduled subjects';
 document.querySelector('#calendar-day-records').innerHTML=entries.length?entries.map(({course,record,scheduled})=>`<div class="calendar-day-course border-bottom py-3">
   <div class="d-flex align-items-start justify-content-between gap-2 mb-2"><div><strong>${html(course.name)}</strong><div class="mini-muted">${html(course.time||'No time set')}${scheduled?' · Scheduled':' · Extra log'}${course.roomNumber||course.professorName?`<div class="schedule-meta">${html([course.roomNumber?`Room ${course.roomNumber}`:'',course.professorName?`Prof. ${course.professorName}`:''].filter(Boolean).join(' · '))}</div>`:''}</div></div>${statusLabel(record)}</div>
   ${course.type==='event'?`<div class="small mb-2 text-secondary">${record?.slots?(()=>{const x=countEventSlots(record.slots,record.status);return `${x.present} Present · ${x.absent} Absent · ${x.excused} Excused`})():record?.status==='absent'?'Legacy day absence (1 fine)':'Choose AM/PM check-in/out separately'}</div><button class="btn btn-sm btn-outline-primary" data-edit-course="${html(course.id)}">Set AM/PM slots / Edit</button>`:
   `<div class="attendance-quick-actions" role="group" aria-label="Mark attendance for ${html(course.name)}">
     <button class="btn btn-sm ${record?.status==='present'?'btn-success':'btn-outline-success'}" data-mark="present" data-course="${html(course.id)}">Present</button>
     <button class="btn btn-sm ${record?.status==='absent'?'btn-danger':'btn-outline-danger'}" data-mark="absent" data-course="${html(course.id)}">Absent</button>
     <button class="btn btn-sm ${record?.status==='excused'?'btn-warning':'btn-outline-warning'}" data-mark="excused" data-course="${html(course.id)}">Excused</button>
     <button class="btn btn-sm btn-light" data-edit-course="${html(course.id)}">${record?'Edit / note':'More'}</button>
   </div>`}
  </div>`).join(''):`<div class="text-secondary small py-4">No scheduled classes this day. Set weekly days in Courses & Events, or add an extra log using the button above.</div>`;
}
export function markAttendance(courseId,date,status){
 if(!['present','absent','excused'].includes(status))throw Error('Invalid attendance status.');
 const course=getState().courses.find(c=>c.id===courseId);if(!course)throw Error('Subject not found.');
 if(course.type==='event'&&status==='absent')throw Error('For an event, choose the AM/PM slot statuses using the event editor.');
 update(s=>{const existing=s.attendance.find(a=>a.courseId===courseId&&a.date===date);
 const slots=course.type==='event'?Object.fromEntries(['amIn','amOut','pmIn','pmOut'].map(k=>[k,status])):null;
 if(existing)Object.assign(existing,{status,slots,updatedAt:new Date().toISOString()});
 else s.attendance.push({id:id(),courseId,date,status,slots,note:'',updatedAt:new Date().toISOString()});
 });
}
export function bind(){
 document.querySelector('#calendar-prev').onclick=()=>shift(-1);
 document.querySelector('#calendar-next').onclick=()=>shift(1);
 document.querySelector('#calendar-new').onclick=()=>openAttendanceEditor(null,{date:selectedDate});
 bindCustomization();
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

// Refresh calendar contents without replacing the page. This keeps an open
// customization modal and its Bootstrap instance alive during local updates.
export function refresh(){if(document.querySelector('#calendar-grid'))draw();}


function applyCalendarTheme(config){
 const card=document.querySelector('#calendar-main-card');if(!card)return;
 const hasImage=typeof config.cardImage==='string'&&config.cardImage.startsWith('data:image/');
 card.classList.toggle('has-card-theme',hasImage);
 if(hasImage)card.style.setProperty('--calendar-card-image',`url("${config.cardImage}")`);else card.style.removeProperty('--calendar-card-image');
 const preview=document.querySelector('#calendar-card-theme-preview');if(preview){preview.classList.toggle('has-card-theme',hasImage);if(hasImage)preview.style.setProperty('--calendar-card-image',`url("${config.cardImage}")`);else preview.style.removeProperty('--calendar-card-image');}
 const name=document.querySelector('#calendar-card-theme-name');if(name)name.textContent=config.cardThemeName||'Default calendar appearance';
}
function bindCustomization(){
 const file=document.querySelector('#calendar-card-theme-file');
 file.onchange=async e=>{const image=e.target.files?.[0];if(!image)return;
  if(!['image/png','image/jpeg','image/webp'].includes(image.type)){toast('Choose a PNG, JPG, or WebP image.',true);e.target.value='';return;}
  if(image.size>700*1024){toast('Calendar theme image must be 700 KB or smaller.',true);e.target.value='';return;}
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Could not read image.'));reader.readAsDataURL(image);}).catch(err=>{toast(err.message,true);return '';});
  if(!data)return;
  update(state=>{state.settings.calendarCustomization={...(state.settings.calendarCustomization||{}),cardImage:data,cardThemeName:image.name.slice(0,80)};});
  applyCalendarTheme(getState().settings.calendarCustomization);toast('Calendar card theme uploaded.');e.target.value='';
 };
 document.querySelector('#calendar-remove-card-theme').onclick=()=>{update(state=>{const c=state.settings.calendarCustomization||(state.settings.calendarCustomization={});delete c.cardImage;delete c.cardThemeName;});applyCalendarTheme(getState().settings.calendarCustomization||{});toast('Uploaded calendar theme removed.');};
 document.querySelector('#calendar-reset-theme').onclick=()=>{update(state=>{const c=state.settings.calendarCustomization||(state.settings.calendarCustomization={});delete c.cardImage;delete c.cardThemeName;});applyCalendarTheme(getState().settings.calendarCustomization||{});toast('Calendar card theme reset. Your date colors and stickers were kept.');};
 document.querySelector('#calendar-save-card-theme').onclick=()=>{const modal=document.querySelector('#calendar-customize-modal');if(window.bootstrap?.Modal)window.bootstrap.Modal.getOrCreateInstance(modal).hide();};
 const stickerFile=document.querySelector('#calendar-sticker-file');
 stickerFile.onchange=async e=>{const image=e.target.files?.[0];if(!image)return;const c=getState().settings.calendarCustomization||{};if(!['image/png','image/jpeg','image/webp'].includes(image.type)){toast('Choose a PNG, JPG, or WebP sticker.',true);e.target.value='';return;}if(image.size>150*1024){toast('Each sticker must be 150 KB or smaller.',true);e.target.value='';return;}if((c.stickers||[]).length>=10){toast('You can save up to 10 stickers.',true);e.target.value='';return;}const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(Error('Could not read sticker.'));r.readAsDataURL(image);}).catch(err=>{toast(err.message,true);return '';});if(!data)return;const used=(c.stickers||[]).reduce((n,st)=>n+(typeof st.data==='string'?st.data.length:0),0);if(used+data.length>900000){toast('Your sticker library has reached its 900 KB total storage limit. Remove a sticker before adding another.',true);e.target.value='';return;}const sticker={id:id(),name:image.name.slice(0,60),data};update(state=>{const x=state.settings.calendarCustomization||(state.settings.calendarCustomization={});x.stickers=[...(x.stickers||[]),sticker];});refreshCustomizationFields();toast('Sticker uploaded. Choose a date and apply it.');e.target.value='';};
 document.querySelector('#calendar-sticker-library').onclick=e=>{const b=e.target.closest('[data-remove-sticker]');if(!b)return;const stickerId=b.dataset.removeSticker;update(state=>{const c=state.settings.calendarCustomization;c.stickers=(c.stickers||[]).filter(x=>x.id!==stickerId);for(const [date,style] of Object.entries(c.dateStyles||{}))if(style.stickerId===stickerId)delete style.stickerId;});refreshCustomizationFields();draw();toast('Sticker removed.');};
 document.querySelector('#calendar-apply-date-style').onclick=()=>{const date=document.querySelector('#calendar-personal-date').value,color=document.querySelector('#calendar-date-color').value,stickerId=document.querySelector('#calendar-date-sticker').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast('Choose a valid date.',true);return;}update(state=>{const c=state.settings.calendarCustomization||(state.settings.calendarCustomization={});c.dateStyles=c.dateStyles||{};const style={};if(/^#[0-9a-fA-F]{6}$/.test(color))style.color=color;if(stickerId&&(c.stickers||[]).some(x=>x.id===stickerId))style.stickerId=stickerId;if(Object.keys(style).length)c.dateStyles[date]=style;else delete c.dateStyles[date];});selectedDate=date;const [y,m]=date.split('-');visibleMonth=`${y}-${m}`;draw();toast('Date personalization applied.');};
 document.querySelector('#calendar-clear-date-style').onclick=()=>{const date=document.querySelector('#calendar-personal-date').value;update(state=>{const c=state.settings.calendarCustomization||{};if(c.dateStyles)delete c.dateStyles[date];});document.querySelector('#calendar-date-color').value='#eee8ff';document.querySelector('#calendar-date-sticker').value='';draw();toast('Date styling cleared.');};
 document.querySelector('#calendar-personal-date').onchange=e=>{const style=getState().settings.calendarCustomization?.dateStyles?.[e.target.value]||{};document.querySelector('#calendar-date-color').value=style.color||'#eee8ff';document.querySelector('#calendar-date-sticker').value=style.stickerId||'';const previewCell=document.querySelector('#calendar-card-theme-preview .calendar-card-theme-preview-grid span.is-today');if(previewCell)previewCell.style.setProperty('--calendar-date-bg',style.color||'#eee8ff');};
 document.querySelector('#calendar-date-color').oninput=e=>{const previewCell=document.querySelector('#calendar-card-theme-preview .calendar-card-theme-preview-grid span.is-today');if(previewCell)previewCell.style.setProperty('--calendar-date-bg',e.target.value);};
}
function refreshCustomizationFields(){const c=getState().settings.calendarCustomization||{},select=document.querySelector('#calendar-date-sticker'),library=document.querySelector('#calendar-sticker-library');if(select)select.innerHTML='<option value="">No sticker</option>'+(c.stickers||[]).map(st=>`<option value="${html(st.id)}">${html(st.name)}</option>`).join('');if(library)library.innerHTML=(c.stickers||[]).map(st=>`<span class="calendar-sticker-thumb"><img src="${st.data}" alt="${html(st.name)}"><button type="button" data-remove-sticker="${html(st.id)}" aria-label="Remove ${html(st.name)}">×</button></span>`).join('');}

