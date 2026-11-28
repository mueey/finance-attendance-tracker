import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {startMinutes,dueReminders,todaysReminders,notificationActionAllowed} from '../js/core/reminders.js';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';
const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(join(ROOT,path),'utf8');
const date='2026-11-23'; // Monday
const course={id:'math',name:'Mathematics',type:'class',code:'MATH101',weekdays:[1],schedule:'Mon',startDate:'2026-11-01',endDate:'2026-12-31',time:'9:00 AM – 10:30 AM',createdAt:'2026-11-01',archived:false,fineRate:0};
const make=(time='9:00 AM – 10:30 AM')=>{const s=initialState();s.courses.push({...course,time});return s;};
function at(hours,minutes){return new Date(2026,10,23,hours,minutes,0);}
test('supports start times in common schedule formats but never guesses free text',()=>{
 assert.equal(startMinutes('9:00 AM – 10:30 AM'),540);
 assert.equal(startMinutes('12:00 PM - 1:00 PM'),720);
 assert.equal(startMinutes('12:00 AM'),0);
 assert.equal(startMinutes('14:45-16:15'),885);
 assert.equal(startMinutes('unknown'),null);
 assert.equal(startMinutes('25:00'),null);
});
test('daily reminder is due before class and skipped once attendance is logged',()=>{
 const s=make();assert.equal(todaysReminders(s,date).length,1);
 assert.equal(dueReminders(s,at(8,49),10).length,0);
 assert.equal(dueReminders(s,at(8,50),10).length,1);
 assert.equal(dueReminders(s,at(10,0),10).length,1);
 assert.equal(dueReminders(s,at(12,1),10).length,0);
 s.attendance.push({id:'a1',courseId:'math',date,status:'present',slots:null,note:'',updatedAt:''});
 assert.equal(dueReminders(s,at(8,55),10).length,0);
});
test('time not set uses an 8 AM daily reminder and does not create a log',()=>{
 const s=make('');assert.equal(dueReminders(s,at(7,50),0).length,0);
 assert.equal(dueReminders(s,at(8,0),0).length,1);
 assert.equal(s.attendance.length,0);
});
test('event fine safety: push quick-mark only permitted for academic classes',()=>{
 assert.equal(notificationActionAllowed(course,'present'),true);
 assert.equal(notificationActionAllowed(course,'absent'),true);
 assert.equal(notificationActionAllowed({...course,type:'event'},'absent'),false);
 assert.equal(notificationActionAllowed(course,'excused'),false);
});
test('notification preferences persist through store validation and default off in legacy backups',()=>{
 const s=make();assert.equal(s.settings.notificationEnabled,false);assert.equal(s.settings.notificationLeadMinutes,10);
 s.settings.notificationEnabled=true;s.settings.notificationLeadMinutes=15;
 const restored=validateAndNormalize(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.settings.notificationEnabled,true);assert.equal(restored.settings.notificationLeadMinutes,15);
 const old=initialState();delete old.settings.notificationLeadMinutes;delete old.settings.notificationEnabled;
 const fallback=validateAndNormalize(old);
 assert.equal(fallback.settings.notificationEnabled,false);assert.equal(fallback.settings.notificationLeadMinutes,10);
});
test('notification center has quick action controls and the app only processes signed-in notification actions',()=>{
 const center=read('js/features/notifications.js'),app=read('js/app.js'),sw=read('sw.js');
 assert.match(center,/data-reminder-mark="present"/);assert.match(center,/data-reminder-mark="absent"/);
 assert.match(center,/data-reminder-event/);assert.match(center,/notificationActionAllowed/);
 assert.match(app,/if\(!isUnlocked\(\)\)showAuth\(\)/);assert.match(app,/consumeNotificationIntent/);
 assert.match(sw,/notificationclick/);assert.match(center,/action:'present'/);assert.match(center,/action:'absent'/);assert.match(sw,/notificationclick/);
 assert.match(sw,/postMessage/);
});
test('offline serviceworker and Bootstrap bell icons are shipped',()=>{
 const sw=read('sw.js'),page=read('index.html'),css=read('css/bootstrap-icons-local.css');
 assert.match(sw,/trackerist-v4\.5\.4-calendar-reliability-fix/);
 for(const path of ['./js/features/notifications.js','./js/core/reminders.js','./vendor/bootstrap-icons/bell.svg']){
  assert.ok(sw.includes(path),path);assert.ok(existsSync(join(ROOT,path)),path);
 }
 assert.match(page,/data-route="notifications"/);assert.match(css,/bi-bell/);
});
