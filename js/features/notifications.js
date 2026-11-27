import {getState,update} from '../core/store.js';
import {todaysReminders,dueReminders,REMINDER_LEADS,notificationActionAllowed} from '../core/reminders.js';
import {isScheduled} from '../core/schedule.js';
import {id,today,html,pageHead,chip} from '../core/utils.js';
import {toast} from '../core/ui.js';
import {markAttendance} from './calendar.js';
import {openAttendanceEditor} from './attendance.js';

const SENT_KEY='trackerist_notification_sent_v1';
const TOKENS_KEY='trackerist_notification_tokens_v1';
let timer=null;
let checking=false;
function readObject(key){try{const x=JSON.parse(localStorage.getItem(key)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {};}}
function persistObject(key,obj){localStorage.setItem(key,JSON.stringify(obj));}
function trimTokens(){const expiry=Date.now();const all=readObject(TOKENS_KEY);for(const [key,value] of Object.entries(all))if(!value||value.expires<expiry)delete all[key];persistObject(TOKENS_KEY,all);return all;}
function permissionLabel(){if(!('Notification' in window))return 'This browser does not support system notifications.';return `Browser permission: ${Notification.permission}.`}
function displayStatus(record){return record?chip(record.status):'<span class="chip chip-pending">Pending</span>';}
function enabled(){return !!getState().settings.notificationEnabled;}

export function render(){
 const state=getState(),entries=todaysReminders(state);const canNotify=('Notification' in window)&&('serviceWorker' in navigator);
 return `${pageHead('Reminder center','Daily attendance notifications','View today’s classes and mark Present or Absent from one place. Event reminders open the four-slot attendance editor.')}<div class="row g-3">
  <div class="col-lg-5"><div class="card h-100"><div class="card-header d-flex align-items-center gap-2"><span class="bi-icon bi-bell" aria-hidden="true"></span> Reminder settings</div><div class="card-body"><p class="small text-secondary">Daily reminders are checked while Trackerist is open and you are signed in. Notifications when the app is fully closed are not guaranteed on GitHub Pages.</p>
   <div class="form-check form-switch mb-3"><input type="checkbox" class="form-check-input" role="switch" id="notification-enabled" ${enabled()?'checked':''} ${canNotify?'':'disabled'}><label class="form-check-label" for="notification-enabled">Enable system attendance reminders</label></div>
   <label class="form-label" for="notification-lead">Remind before class</label><select class="form-select" id="notification-lead">${REMINDER_LEADS.map(m=>`<option value="${m}" ${m===state.settings.notificationLeadMinutes?'selected':''}>${m===0?'At class start':`${m} minutes before`}</option>`).join('')}</select>
   <div class="form-text mt-2" id="notification-permission">${html(permissionLabel())} Notifications require HTTPS/localhost and user permission. Some devices do not display notification action buttons.</div>
   <button class="btn btn-outline-primary mt-3" id="notification-test" type="button" ${!canNotify?'disabled':''}>Send test reminder for a pending class</button>
   <p class="small text-secondary mt-3 mb-0">For an academic class, Present / Absent in a supported system notification opens Trackerist and saves the status after confirming your local session. For an event, open the AM/PM editor instead; no fines are charged automatically by notifications.</p>
  </div></div></div>
  <div class="col-lg-7"><div class="card h-100"><div class="card-header d-flex justify-content-between align-items-center"><span>Today's attendance</span><span class="badge text-bg-light border">${entries.length} scheduled</span></div><div class="card-body"><div class="reminder-records">${entries.length?entries.map(({course,record})=>`<div class="reminder-record border-bottom py-3"><div class="d-flex justify-content-between align-items-start gap-2 mb-2"><div><strong>${html(course.name)}</strong><div class="mini-muted">${html(course.time||'Time not set')} · ${course.type==='event'?'Special event':'Academic class'}</div></div>${displayStatus(record)}</div>${course.type==='class'?`<div class="attendance-quick-actions"><button type="button" class="btn btn-sm ${record?.status==='present'?'btn-success':'btn-outline-success'}" data-reminder-mark="present" data-course="${html(course.id)}">Present</button><button type="button" class="btn btn-sm ${record?.status==='absent'?'btn-danger':'btn-outline-danger'}" data-reminder-mark="absent" data-course="${html(course.id)}">Absent</button><button type="button" class="btn btn-sm btn-outline-warning" data-reminder-mark="excused" data-course="${html(course.id)}">Excused</button></div>`:`<button type="button" class="btn btn-sm btn-outline-primary" data-reminder-event="${html(course.id)}">Log AM / PM slots</button>`}</div>`).join(''):'<p class="text-secondary mb-0">No classes or events scheduled for today. Add weekly meeting days in Courses & Events.</p>'}</div></div></div></div>
 </div>`;
}

export function bind(){
 const enabledInput=document.querySelector('#notification-enabled'),leadInput=document.querySelector('#notification-lead');
 enabledInput.onchange=async()=>{
  if(enabledInput.checked){
   let permission='denied';
   try{permission=await Notification.requestPermission();}catch{}
   if(permission!=='granted'){enabledInput.checked=false;toast('Allow notifications in your browser settings to use system reminders.',true);return;}
  }
  update(s=>{s.settings.notificationEnabled=enabledInput.checked;});
  toast(enabledInput.checked?'System reminders enabled':'System reminders disabled');
  if(enabledInput.checked)checkReminders();
 };
 leadInput.onchange=()=>update(s=>{s.settings.notificationLeadMinutes=Number(leadInput.value);});
 document.querySelector('#notification-test').onclick=async()=>{
  if(Notification.permission!=='granted'){toast('Enable and allow system notifications first.',true);return;}
  const next=todaysReminders(getState()).find(e=>e.course.type==='class'&&!e.record);
  if(!next){toast('Add a class scheduled today without an attendance log to test the buttons.',true);return;}
  try{await sendNative(next,true);toast('Test notification sent, if supported by the device.');}catch(err){toast(err.message,true);}
 };
 document.querySelector('.reminder-records').onclick=e=>{
  const btn=e.target.closest('button');if(!btn)return;
  try{
   if(btn.dataset.reminderMark){markAttendance(btn.dataset.course,today(),btn.dataset.reminderMark);toast('Attendance saved');}
   else if(btn.dataset.reminderEvent){const cId=btn.dataset.reminderEvent;const record=getState().attendance.find(a=>a.courseId===cId&&a.date===today());openAttendanceEditor(record||null,{courseId:cId,date:today()});}
  }catch(err){toast(err.message||'Unable to save attendance',true);}
 };
}

async function sendNative({course,date},test=false){
 if(Notification.permission!=='granted'||!('serviceWorker' in navigator))throw Error('System notification permission is unavailable.');
 const reg=await navigator.serviceWorker.getRegistration('./');
 if(!reg?.active)throw Error('Offline service worker is not ready yet. Reload once while online.');
 const token=id(),tokens=trimTokens();
 tokens[token]={courseId:course.id,date,expires:Date.now()+24*60*60*1000};
 persistObject(TOKENS_KEY,tokens);
 try{
  const classActions=course.type==='class'?[{action:'present',title:'Mark Present'},{action:'absent',title:'Mark Absent'}]:[{action:'open',title:'Log AM/PM'}];
  const title=test?`Test: ${course.name}`:`Attendance reminder · ${course.name}`;
  const options={
   body:course.type==='class'?`${date} · ${course.time||'Schedule time not set'} · Mark your attendance.`:`${date} · Log AM/PM slots separately.`,
   tag:`trackerist-${test?'test-':''}${course.id}-${date}`,icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',
   actions:classActions,data:{token},silent:false
  };
  try{await reg.showNotification(title,options);}
  catch(err){
   // Some mobile browsers reject the actions property outright. Still open
   // Trackerist from the main notification and show in-app quick buttons.
   if(err?.name!=='TypeError')throw err;
   const {actions,...fallback}=options;
   await reg.showNotification(title,fallback);
  }
 }catch(err){const tokens=trimTokens();delete tokens[token];persistObject(TOKENS_KEY,tokens);throw err;}
}

export async function checkReminders(){
 if(checking||!enabled()||!('Notification' in window)||Notification.permission!=='granted'||document.visibilityState==='hidden')return;
 checking=true;
 try{
  const due=dueReminders(getState(),new Date(),getState().settings.notificationLeadMinutes),sent=readObject(SENT_KEY);
  const oldDate=new Date(Date.now()-5*86400000).toISOString().slice(0,10);
  for(const key of Object.keys(sent))if(key.slice(0,10)<oldDate)delete sent[key];
  for(const entry of due){
   const key=`${entry.date}:${entry.course.id}`;
   if(sent[key])continue;
   try{await sendNative(entry);sent[key]=Date.now();persistObject(SENT_KEY,sent);}catch(err){console.warn('Unable to display reminder:',err);break;}
  }
 }finally{checking=false;}
}

export function startReminders(isUnlocked){
 if(timer)return;
 const tick=()=>{if(isUnlocked())checkReminders().catch(console.warn);};
 timer=setInterval(tick,30000);
 window.addEventListener('focus',tick);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick();});
 tick();
}

export function consumeNotificationIntent(token,action){
 if(!token||!['present','absent','open'].includes(action))return false;
 const tokens=trimTokens(),entry=tokens[token];
 if(!entry)return false;
 delete tokens[token];persistObject(TOKENS_KEY,tokens); // Single-use; prevents replay.
 const state=getState(),course=state.courses.find(c=>c.id===entry.courseId);
 if(!course||entry.date!==today()||!isScheduled(course,entry.date)){
  toast('This reminder is no longer current. Open the calendar to log the correct date.',true);return true;
 }
 if(action==='open'||course.type==='event'){
  const existing=state.attendance.find(a=>a.courseId===course.id&&a.date===entry.date);
  openAttendanceEditor(existing||null,{courseId:course.id,date:entry.date});
  return true;
 }
 if(!notificationActionAllowed(course,action))return false;
 const prior=state.attendance.find(a=>a.courseId===entry.courseId&&a.date===entry.date);
 if(prior){toast(`${course.name} is already marked ${prior.status}. Use the reminder center to change it.`,true);return true;}
 try{markAttendance(course.id,entry.date,action);toast(`${course.name}: marked ${action}.`);}catch(err){toast(err.message,true);}
 return true;
}
