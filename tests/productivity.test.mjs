import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';
import {getProductivitySummary,formatStudyTime,sortTasks,isValidTime} from '../js/core/productivity.js';
import {render as renderProductivity} from '../js/features/productivity.js';
import {render as renderDashboard} from '../js/features/dashboard.js';
import {render as renderSettings} from '../js/features/settings.js';
import {initStore,replaceState,getState} from '../js/core/store.js';

const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))};
initStore();

function sample(){
 const state=initialState();
 state.courses=[{id:'course-1',name:'Web Development',type:'class',code:'IT301',schedule:'Mon / Wed',weekdays:[1,3],startDate:'2026-08-01',endDate:'2026-12-20',time:'9:00 AM',venue:'',roomNumber:'',professorName:'',fineRate:0,archived:false,createdAt:'2026-08-01'}];
 state.tasks=[
  {id:'task-1',title:'Build final website',type:'project',courseId:'course-1',dueDate:'2026-11-27',priority:'high',status:'todo',description:'Finish responsive layout',createdAt:'2026-11-20'},
  {id:'task-2',title:'Read chapter 4',type:'assignment',courseId:'course-1',dueDate:'2026-12-02',priority:'medium',status:'in-progress',description:'',createdAt:'2026-11-20'},
  {id:'task-3',title:'Quiz 2',type:'exam',courseId:'course-1',dueDate:'2026-11-26',priority:'high',status:'todo',description:'',createdAt:'2026-11-20'},
  {id:'task-4',title:'Old completed task',type:'task',courseId:'',dueDate:'2026-11-27',priority:'low',status:'completed',description:'',createdAt:'2026-11-20'}
 ];
 state.studyPlans=[{id:'plan-1',title:'Review HTML and CSS',courseId:'course-1',weekday:1,startTime:'18:00',durationMinutes:60,goal:'Prepare for the lab'}];
 state.studySessions=[{id:'session-1',title:'CSS practice',courseId:'course-1',date:'2026-11-24',minutes:45,method:'focus',note:''},{id:'session-2',title:'Reading',courseId:'',date:'2026-11-21',minutes:30,method:'manual',note:''}];
 return state;
}

test('older v2 backups without productivity arrays remain restorable',()=>{
 const old=initialState();delete old.tasks;delete old.studyPlans;delete old.studySessions;
 const restored=validateAndNormalize(old);
 assert.deepEqual(restored.tasks,[]);assert.deepEqual(restored.studyPlans,[]);assert.deepEqual(restored.studySessions,[]);
});

test('personal profile and dashboard widget preferences survive backup normalization',()=>{
 const state=initialState();Object.assign(state.settings,{studentName:'Alex Student',profileProgram:'BSIT',profileYearLevel:'3rd Year',profileBio:'Finish capstone this term',profileColor:'rose'});state.settings.dashboardWidgets.academicProductivity=false;
 const restored=validateAndNormalize(state);
 assert.equal(restored.settings.studentName,'Alex Student');assert.equal(restored.settings.profileProgram,'BSIT');assert.equal(restored.settings.profileColor,'rose');assert.equal(restored.settings.dashboardWidgets.academicProductivity,false);assert.equal(restored.settings.dashboardWidgets.attendanceHealth,true);
});

test('tasks, weekly plans and study sessions normalize and reject invalid references',()=>{
 const normalized=validateAndNormalize(sample());
 assert.equal(normalized.tasks.length,4);assert.equal(normalized.studyPlans[0].weekday,1);assert.equal(normalized.studySessions[0].minutes,45);
 const invalid=sample();invalid.tasks[0].courseId='missing-course';assert.throws(()=>validateAndNormalize(invalid),/Invalid academic task/);
 const invalidPlan=sample();invalidPlan.studyPlans[0].startTime='27:80';assert.throws(()=>validateAndNormalize(invalidPlan),/Invalid weekly study plan/);
 const invalidSession=sample();invalidSession.studySessions[0].minutes=0;assert.throws(()=>validateAndNormalize(invalidSession),/Invalid study session/);
});

test('productivity summary counts pending, overdue, next-seven-day and current-week study time',()=>{
 const state=sample(),summary=getProductivitySummary(state,'2026-11-27');
 assert.equal(summary.pending,3);assert.equal(summary.completed,1);assert.equal(summary.overdue,1);assert.equal(summary.dueSoon,2);assert.equal(summary.studyMinutesThisWeek,45);assert.equal(summary.studySessionsThisWeek,1);assert.equal(summary.nextTask.id,'task-3');
 assert.equal(formatStudyTime(105),'1h 45m');assert.equal(formatStudyTime(30),'30m');
});

test('task sorting puts active deadlines first and completed tasks last',()=>{
 const ordered=sortTasks(sample().tasks);assert.equal(ordered[0].id,'task-3');assert.equal(ordered.at(-1).id,'task-4');
 assert.equal(isValidTime('09:30'),true);assert.equal(isValidTime('24:30'),false);
});

test('productivity page renders task, deadline, weekly planner, focus timer and study history',()=>{
 replaceState(sample());const view=renderProductivity();
 for(const label of ['Academic Productivity','Assignments, exams &amp; projects','Upcoming deadlines','Weekly study planner','Focus timer','Study history','Build final website','Quiz 2'])assert.ok(view.includes(label),`Missing ${label}`);
 assert.match(view,/data-task-edit="task-1"/);assert.match(view,/data-plan-edit="plan-1"/);assert.match(view,/data-session-edit="session-1"/);
});

test('dashboard profile and widget choices control visible personalized sections',()=>{
 const state=sample();Object.assign(state.settings,{studentName:'Alex Student',profileProgram:'BSIT',profileYearLevel:'3rd Year',profileBio:'Capstone first',profileColor:'rose'});state.settings.dashboardWidgets={attendanceHealth:false,financialSnapshot:false,todaySchedule:false,semesterSummaries:false,recentAttendance:false,outstandingBills:false,academicProductivity:true};
 replaceState(state);const view=renderDashboard();
 assert.match(view,/Welcome back, Alex Student/);assert.match(view,/profile-rose/);assert.match(view,/BSIT · 3rd Year/);assert.match(view,/ACADEMIC PRODUCTIVITY/);assert.match(view,/attendance-health-card/); // retained in markup but hidden by its widget preference
 assert.match(view,/aria-label="Financial snapshot and overall attendance health" hidden/);
});

test('settings exposes profile and dashboard widget controls',()=>{
 replaceState(initialState());const view=renderSettings();
 assert.match(view,/id="personalization-form"/);assert.match(view,/name="profileProgram"/);assert.match(view,/data-widget-toggle="academicProductivity"/);assert.match(view,/data-widget-toggle="attendanceHealth"/);
});

test('dashboard shows academic progress XP and streak without any achievement badges',()=>{
 const state=sample();state.settings.dashboardWidgets.academicRewards=true;
 replaceState(state);const view=renderDashboard();
 assert.match(view,/ACADEMIC PROGRESS/);assert.match(view,/Total XP/);assert.match(view,/Study streak/);assert.match(view,/CURRENT LEVEL/);
 assert.doesNotMatch(view,/Unlocked Badges|Achievement Badges|Study Champion/);
});
