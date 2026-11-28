import {getState,update} from '../core/store.js';
import {html,blank,pageHead,field,selectField,today,friendlyDate,id} from '../core/utils.js';
import {editModal,toast,confirmDelete,changeRoute} from '../core/ui.js';
import {WEEKDAYS,TASK_TYPES,TASK_PRIORITIES,TASK_STATUSES,getProductivitySummary,formatStudyTime,sortTasks} from '../core/productivity.js';

const TYPE_LABELS={assignment:'Assignment',exam:'Exam',project:'Project',task:'Personal task'};
const STATUS_LABELS={todo:'To do','in-progress':'In progress',completed:'Completed'};
let focus={duration:25,remaining:25*60,running:false,endsAt:0,interval:null,courseId:''};

function courseOptions(selected=''){
 const courses=getState().courses.filter(course=>course.type==='class'&&!course.archived);
 return [['','General study / no subject'],...courses.map(course=>[course.id,course.name])];
}
function taskStatus(task){
 if(task.status==='completed')return '<span class="productivity-status status-completed">Completed</span>';
 if(task.dueDate&&task.dueDate<today())return '<span class="productivity-status status-overdue">Overdue</span>';
 return `<span class="productivity-status status-${task.status}">${STATUS_LABELS[task.status]}</span>`;
}
function openTaskEditor(task=null){
 const s=getState();
 const body=`<div class="row g-3">${field('title','Title',task?.title||'',{required:true,col:'col-12',placeholder:'e.g. Submit database project'})}${selectField('type','Category',TASK_TYPES.map(type=>[type,TYPE_LABELS[type]]),task?.type||'assignment')}${selectField('courseId','Subject',courseOptions(task?.courseId||''),task?.courseId||'')}${field('dueDate','Due date',task?.dueDate||'',{type:'date'})}${selectField('priority','Priority',TASK_PRIORITIES.map(x=>[x,x.charAt(0).toUpperCase()+x.slice(1)]),task?.priority||'medium')}${selectField('status','Status',TASK_STATUSES.map(x=>[x,STATUS_LABELS[x]]),task?.status||'todo')}<div class="col-12"><label class="form-label" for="fld-description">Notes / instructions</label><textarea class="form-control" id="fld-description" name="description" rows="3" maxlength="2000" placeholder="Add requirements, coverage, or reminders">${html(task?.description||'')}</textarea></div></div>`;
 editModal({title:task?'Edit academic task':'Add assignment / exam / project',body,onSave:d=>{
  const title=d.title.trim();if(!title)throw Error('Enter a task title.');
  if(d.dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(d.dueDate))throw Error('Choose a valid due date.');
  if(d.courseId&&!s.courses.some(course=>course.id===d.courseId&&course.type==='class'))throw Error('Select a valid academic subject.');
  update(state=>{
   const value={title,type:d.type,courseId:d.courseId,dueDate:d.dueDate,priority:d.priority,status:d.status,description:d.description,createdAt:task?.createdAt||today()};
   if(task){const row=state.tasks.find(item=>item.id===task.id);if(!row)throw Error('Task no longer exists.');Object.assign(row,value);}
   else state.tasks.push({id:id(),...value});
  });
 }});
}
function openStudyPlanEditor(plan=null){
 const body=`<div class="row g-3">${field('title','Study session title',plan?.title||'',{required:true,col:'col-12',placeholder:'e.g. Review programming concepts'})}${selectField('courseId','Subject',courseOptions(plan?.courseId||''),plan?.courseId||'')}${selectField('weekday','Day of week',WEEKDAYS.map((day,index)=>[String(index),day]),String(plan?.weekday??1))}${field('startTime','Start time',plan?.startTime||'18:00',{type:'time',required:true})}${field('durationMinutes','Duration (minutes)',plan?.durationMinutes??60,{type:'number',min:15,max:600,step:5,required:true})}<div class="col-12"><label class="form-label" for="fld-goal">Study goal</label><textarea class="form-control" id="fld-goal" name="goal" rows="2" maxlength="500" placeholder="What do you want to finish?">${html(plan?.goal||'')}</textarea></div></div>`;
 editModal({title:plan?'Edit weekly study plan':'Add weekly study plan',body,onSave:d=>{
  const duration=Number(d.durationMinutes),weekday=Number(d.weekday);
  if(!d.title.trim())throw Error('Enter a study session title.');
  if(!Number.isInteger(weekday)||weekday<0||weekday>6)throw Error('Choose a valid weekday.');
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.startTime))throw Error('Choose a valid start time.');
  if(!Number.isInteger(duration)||duration<15||duration>600)throw Error('Duration must be between 15 and 600 minutes.');
  update(state=>{
   const value={title:d.title.trim(),courseId:d.courseId,weekday,startTime:d.startTime,durationMinutes:duration,goal:d.goal};
   if(plan){const row=state.studyPlans.find(item=>item.id===plan.id);if(!row)throw Error('Study plan no longer exists.');Object.assign(row,value);}
   else state.studyPlans.push({id:id(),...value});
  });
 }});
}
function openStudySessionEditor(session=null){
 const body=`<div class="row g-3">${field('title','Session title',session?.title||'',{required:true,col:'col-12',placeholder:'e.g. Chapter 4 review'})}${selectField('courseId','Subject',courseOptions(session?.courseId||''),session?.courseId||'')}${field('date','Study date',session?.date||today(),{type:'date',required:true})}${field('minutes','Study time (minutes)',session?.minutes??30,{type:'number',min:1,max:1440,step:1,required:true})}<div class="col-12"><label class="form-label" for="fld-note">Notes</label><textarea class="form-control" id="fld-note" name="note" rows="2" maxlength="1000">${html(session?.note||'')}</textarea></div></div>`;
 editModal({title:session?'Edit study log':'Log a study session',body,onSave:d=>{
  const minutes=Number(d.minutes);
  if(!d.title.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(d.date))throw Error('Enter a title and valid study date.');
  if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error('Study time must be between 1 and 1,440 minutes.');
  update(state=>{
   const value={title:d.title.trim(),courseId:d.courseId,date:d.date,minutes,note:d.note,method:session?.method||'manual'};
   if(session){const row=state.studySessions.find(item=>item.id===session.id);if(!row)throw Error('Study log no longer exists.');Object.assign(row,value);}
   else state.studySessions.push({id:id(),...value});
  });
 }});
}
function remainingSeconds(){return focus.running?Math.max(0,Math.ceil((focus.endsAt-Date.now())/1000)):focus.remaining;}
function renderTimer(){
 const remaining=remainingSeconds(),minutes=String(Math.floor(remaining/60)).padStart(2,'0'),seconds=String(remaining%60).padStart(2,'0');
 const output=document.querySelector('#focus-countdown');if(output)output.textContent=`${minutes}:${seconds}`;
 const bar=document.querySelector('#focus-progress');if(bar)bar.style.width=`${Math.max(0,Math.min(100,(1-remaining/(focus.duration*60))*100))}%`;
 const start=document.querySelector('#focus-start');if(start){start.textContent=focus.running?'Running…':remaining===0?'Session complete':'Start focus';start.disabled=focus.running||remaining===0;}
 const pause=document.querySelector('#focus-pause');if(pause)pause.disabled=!focus.running;
 const reset=document.querySelector('#focus-reset');if(reset)reset.disabled=focus.running;
 const duration=document.querySelector('#focus-duration');if(duration)duration.disabled=focus.running;
}
function stopTimer(){if(focus.interval)clearInterval(focus.interval);focus.interval=null;}
function completeFocus(){
 stopTimer();focus.running=false;focus.remaining=0;
 const courseId=focus.courseId;
 try{update(state=>{state.studySessions.push({id:id(),title:'Focus session',courseId,date:today(),minutes:focus.duration,method:'focus',note:'Completed with the Trackerist focus timer.'});});toast('Focus session completed and study time saved.');}
 catch(error){toast(error.message||'Could not save the focus session.',true);}
 renderTimer();
}
function startTimer(){
 if(focus.remaining<=0)return;
 focus.courseId=document.querySelector('#focus-course')?.value||'';
 focus.running=true;focus.endsAt=Date.now()+focus.remaining*1000;
 focus.interval=setInterval(()=>{
  focus.remaining=remainingSeconds();
  if(focus.remaining<=0){completeFocus();return;}
  renderTimer();
 },250);
 renderTimer();
}
function pauseTimer(){if(!focus.running)return;focus.remaining=remainingSeconds();focus.running=false;stopTimer();renderTimer();}
function resetTimer(){if(focus.running)return;stopTimer();focus.remaining=focus.duration*60;renderTimer();}

export function render(){
 const s=getState(),summary=getProductivitySummary(s),courses=new Map(s.courses.map(course=>[course.id,course.name]));
 const tasks=sortTasks(s.tasks),plans=[...s.studyPlans].sort((a,b)=>a.weekday-b.weekday||a.startTime.localeCompare(b.startTime));
 const sessions=[...s.studySessions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12);
 const weeklyPlans=WEEKDAYS.map((day,index)=>({day,items:plans.filter(plan=>plan.weekday===index)}));
 const dueTasks=tasks.filter(task=>task.status!=='completed'&&task.dueDate).slice(0,6);
 const nextTask=summary.nextTask;
 return `${pageHead('Study smarter','Academic Productivity','Organize deadlines, plan focused study time, and track your academic progress.','<button class="btn btn-primary" id="productivity-add-task">+ Add task</button>')}
 <section class="productivity-welcome card mb-4"><div class="card-body"><div><div class="page-kicker mb-1">YOUR ACADEMIC WORKSPACE</div><h2 class="section-title mb-1">Make progress one session at a time.</h2><p class="mini-muted mb-0">Track assignments, exams, projects, weekly study plans, and focus sessions in one place.</p></div><a href="#/settings" class="btn btn-outline-primary btn-sm">Personalize workspace</a></div></section>
 <div class="row g-3 mb-4">
  <div class="col-6 col-xl-3"><div class="card productivity-metric"><div class="metric-label">Pending tasks</div><div class="metric-value">${summary.pending}</div><div class="metric-note">${summary.overdue} overdue</div></div></div>
  <div class="col-6 col-xl-3"><div class="card productivity-metric"><div class="metric-label">Due in 7 days</div><div class="metric-value">${summary.dueSoon}</div><div class="metric-note">Upcoming deadlines</div></div></div>
  <div class="col-6 col-xl-3"><div class="card productivity-metric"><div class="metric-label">Completed tasks</div><div class="metric-value">${summary.completed}</div><div class="metric-note">Out of ${summary.totalTasks} total</div></div></div>
  <div class="col-6 col-xl-3"><div class="card productivity-metric"><div class="metric-label">Study time this week</div><div class="metric-value">${formatStudyTime(summary.studyMinutesThisWeek)}</div><div class="metric-note">${summary.studySessionsThisWeek} sessions logged</div></div></div>
 </div>
 <div class="row g-3 mb-4">
  <div class="col-xl-7"><section class="card h-100"><div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2"><span>Assignments, exams &amp; projects</span><button class="btn btn-sm btn-outline-primary" id="productivity-add-task-list">Add task</button></div><div class="card-body pt-2">
   ${tasks.length?`<div class="productivity-task-list">${tasks.map(task=>`<article class="productivity-task"><div class="productivity-task-main"><div class="d-flex flex-wrap align-items-center gap-2"><span class="productivity-type">${TYPE_LABELS[task.type]}</span><span class="productivity-priority priority-${task.priority}">${task.priority} priority</span>${taskStatus(task)}</div><h3>${html(task.title)}</h3><div class="mini-muted">${html(courses.get(task.courseId)||'No subject selected')}${task.dueDate?` · Due ${friendlyDate(task.dueDate)}`:' · No due date'}</div>${task.description?`<p class="productivity-description">${html(task.description)}</p>`:''}</div><div class="productivity-task-actions"><button class="btn btn-sm btn-outline-primary" data-task-edit="${html(task.id)}">Edit</button><button class="btn btn-sm btn-outline-success" data-task-toggle="${html(task.id)}">${task.status==='completed'?'Reopen':'Complete'}</button><button class="btn btn-sm btn-outline-danger" data-task-delete="${html(task.id)}" aria-label="Delete ${html(task.title)}">Delete</button></div></article>`).join('')}</div>`:blank('No academic tasks yet','Add an assignment, exam, project, or personal task to get started.')}
  </div></section></div>
  <div class="col-xl-5"><section class="card h-100"><div class="card-header d-flex justify-content-between align-items-center"><span>Upcoming deadlines</span><span class="badge text-bg-light border">${dueTasks.length}</span></div><div class="card-body pt-2">${dueTasks.length?dueTasks.map(task=>`<div class="productivity-deadline"><div><strong>${html(task.title)}</strong><div class="mini-muted">${html(TYPE_LABELS[task.type])} · ${html(courses.get(task.courseId)||'General')}</div></div><div class="text-end"><strong class="${task.dueDate<today()?'text-danger':'text-primary'}">${friendlyDate(task.dueDate)}</strong><div class="mini-muted">${task.dueDate<today()?'Overdue':'Due date'}</div></div></div>`).join(''):blank('No upcoming deadlines','Add due dates to your assignments, exams, and projects.')}</div></section></div>
 </div>
 <div class="row g-3 mb-4">
  <div class="col-xl-7"><section class="card h-100"><div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2"><span>Weekly study planner</span><button class="btn btn-sm btn-outline-primary" id="productivity-add-plan">+ Add study plan</button></div><div class="card-body pt-2">${plans.length?`<div class="study-week-grid">${weeklyPlans.filter(day=>day.items.length).map(day=>`<section class="study-day"><h3>${day.day}</h3>${day.items.map(plan=>`<article class="study-plan-item"><div><strong>${html(plan.title)}</strong><div class="mini-muted">${html(plan.startTime)} · ${plan.durationMinutes} min · ${html(courses.get(plan.courseId)||'General study')}</div>${plan.goal?`<div class="mini-muted mt-1">${html(plan.goal)}</div>`:''}</div><div class="d-flex gap-1"><button class="btn btn-sm btn-outline-primary" data-plan-edit="${html(plan.id)}">Edit</button><button class="btn btn-sm btn-outline-danger" data-plan-delete="${html(plan.id)}" aria-label="Delete study plan">×</button></div></article>`).join('')}</section>`).join('')}</div>`:blank('No weekly study plan','Create recurring study blocks for your subjects and goals.')}</div></section></div>
  <div class="col-xl-5"><section class="card focus-card h-100"><div class="card-header"><span>Focus timer</span><span class="mini-muted">Pomodoro-style study session</span></div><div class="card-body text-center"><div class="focus-clock" id="focus-countdown">${String(Math.floor(remainingSeconds()/60)).padStart(2,'0')}:${String(remainingSeconds()%60).padStart(2,'0')}</div><div class="progress focus-progress my-3"><div class="progress-bar" id="focus-progress" style="width:${Math.max(0,Math.min(100,(1-remainingSeconds()/(focus.duration*60))*100))}%"></div></div><div class="row g-2 text-start"><div class="col-6"><label class="form-label" for="focus-duration">Focus length</label><select class="form-select" id="focus-duration">${[15,25,45,60,90].map(value=>`<option value="${value}" ${focus.duration===value?'selected':''}>${value} minutes</option>`).join('')}</select></div><div class="col-6"><label class="form-label" for="focus-course">Subject</label><select class="form-select" id="focus-course">${courseOptions(focus.courseId).map(([value,label])=>`<option value="${html(value)}" ${value===focus.courseId?'selected':''}>${html(label)}</option>`).join('')}</select></div></div><div class="d-flex justify-content-center gap-2 mt-3"><button class="btn btn-primary" id="focus-start" ${focus.running||remainingSeconds()===0?'disabled':''}>${focus.running?'Running…':remainingSeconds()===0?'Session complete':'Start focus'}</button><button class="btn btn-outline-secondary" id="focus-pause" ${focus.running?'':'disabled'}>Pause</button><button class="btn btn-outline-secondary" id="focus-reset" ${focus.running?'disabled':''}>Reset</button></div><p class="mini-muted mt-3 mb-0">Completed focus sessions are automatically added to your study history. Keep this browser tab open; reloading interrupts the active countdown.</p></div></section></div>
 </div>
 <section class="card"><div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2"><span>Study history</span><button class="btn btn-sm btn-outline-primary" id="productivity-log-session">+ Log study time</button></div><div class="card-body pt-2">${sessions.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Study session</th><th>Subject</th><th>Method</th><th>Duration</th><th></th></tr></thead><tbody>${sessions.map(session=>`<tr><td>${friendlyDate(session.date)}</td><td><strong>${html(session.title)}</strong></td><td>${html(courses.get(session.courseId)||'General study')}</td><td>${session.method==='focus'?'Focus timer':'Manual log'}</td><td class="fw-bold">${formatStudyTime(session.minutes)}</td><td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-primary" data-session-edit="${html(session.id)}">Edit</button> <button class="btn btn-sm btn-outline-danger" data-session-delete="${html(session.id)}">Delete</button></td></tr>`).join('')}</tbody></table></div>`:blank('No study sessions recorded','Use the focus timer or log study time manually.')}</div></section>
 `;
}

export function bind(){
 document.querySelector('#productivity-add-task')?.addEventListener('click',()=>openTaskEditor());
 document.querySelector('#productivity-add-task-list')?.addEventListener('click',()=>openTaskEditor());
 document.querySelector('#productivity-add-plan')?.addEventListener('click',()=>openStudyPlanEditor());
 document.querySelector('#productivity-log-session')?.addEventListener('click',()=>openStudySessionEditor());
 document.querySelectorAll('[data-task-edit]').forEach(button=>button.onclick=()=>{const task=getState().tasks.find(item=>item.id===button.dataset.taskEdit);if(task)openTaskEditor(task);});
 document.querySelectorAll('[data-task-toggle]').forEach(button=>button.onclick=()=>{update(s=>{const task=s.tasks.find(item=>item.id===button.dataset.taskToggle);if(task)task.status=task.status==='completed'?'todo':'completed';});toast('Task status updated');});
 document.querySelectorAll('[data-task-delete]').forEach(button=>button.onclick=()=>{const task=getState().tasks.find(item=>item.id===button.dataset.taskDelete);if(task)confirmDelete(`task “${task.title}”`,()=>update(s=>{s.tasks=s.tasks.filter(item=>item.id!==task.id);}));});
 document.querySelectorAll('[data-plan-edit]').forEach(button=>button.onclick=()=>{const plan=getState().studyPlans.find(item=>item.id===button.dataset.planEdit);if(plan)openStudyPlanEditor(plan);});
 document.querySelectorAll('[data-plan-delete]').forEach(button=>button.onclick=()=>{const plan=getState().studyPlans.find(item=>item.id===button.dataset.planDelete);if(plan)confirmDelete('weekly study plan',()=>update(s=>{s.studyPlans=s.studyPlans.filter(item=>item.id!==plan.id);}));});
 document.querySelectorAll('[data-session-edit]').forEach(button=>button.onclick=()=>{const session=getState().studySessions.find(item=>item.id===button.dataset.sessionEdit);if(session)openStudySessionEditor(session);});
 document.querySelectorAll('[data-session-delete]').forEach(button=>button.onclick=()=>{const session=getState().studySessions.find(item=>item.id===button.dataset.sessionDelete);if(session)confirmDelete('study session',()=>update(s=>{s.studySessions=s.studySessions.filter(item=>item.id!==session.id);}));});
 const duration=document.querySelector('#focus-duration');if(duration)duration.onchange=()=>{if(focus.running)return;focus.duration=Number(duration.value);focus.remaining=focus.duration*60;renderTimer();};
 document.querySelector('#focus-start')?.addEventListener('click',startTimer);
 document.querySelector('#focus-pause')?.addEventListener('click',pauseTimer);
 document.querySelector('#focus-reset')?.addEventListener('click',resetTimer);
 renderTimer();
}
