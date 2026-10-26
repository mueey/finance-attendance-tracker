import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';
import {groupWeeklySchedule} from '../js/core/planner.js';
import {isScheduled} from '../js/core/schedule.js';
import {initStore,replaceState,getState} from '../js/core/store.js';
import {render as planner} from '../js/features/planner.js';
import {render as courses} from '../js/features/courses.js';
import {normalizeTheme,applyTheme,toggleTheme} from '../js/core/theme.js';
const root=new URL('../',import.meta.url);
const file=x=>fs.readFileSync(new URL(x,root),'utf8');
const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,String(v))};
initStore();
const sample={id:'course-1',type:'class',name:'Algorithms <script>',code:'IT102',weekdays:[1,3],schedule:'Mon / Wed',startDate:'2026-08-01',endDate:'2026-12-20',fineRate:20,roomNumber:'C-202',professorName:'Dr. Reyes',time:'9:00 AM',venue:'West campus',createdAt:'2026-08-01'};
test('optional professor and room survive save, normalization, old backups and restore',()=>{
 const s=initialState();s.courses=[sample];const normalized=validateAndNormalize(s);
 assert.equal(normalized.courses[0].roomNumber,'C-202');assert.equal(normalized.courses[0].professorName,'Dr. Reyes');
 const old=initialState();old.courses=[{...sample,roomNumber:undefined,professorName:undefined}];
 assert.equal(validateAndNormalize(old).courses[0].professorName,'');
 replaceState(normalized);assert.equal(getState().courses[0].roomNumber,'C-202');
});
test('planner groups repeating class on selected weekdays, leaves event one-time',()=>{
 const evt={...sample,id:'ev1',type:'event',name:'Orientation',eventDate:'2026-08-14',weekdays:[]};
 const {days,events}=groupWeeklySchedule([sample,evt,{...sample,id:'old',archived:true}]);
 assert.deepEqual(days.filter(d=>d.courses.length).map(d=>d.day),[1,3]);
 assert.equal(events[0].name,'Orientation');
 assert.ok(isScheduled(sample,'2026-10-26'));
 assert.equal(isScheduled(sample,'2026-10-27'),false);
});
test('planner and directory show escaped professor, room and accessible Edit actions',()=>{
 replaceState({...initialState(),courses:[{...sample,professorName:'<img src=x>'}]});
 const view=planner(),dir=courses();
 assert.match(view,/Room:<\/strong> C-202/);assert.match(view,/Professor:<\/strong> &lt;img src=x&gt;/);
 assert.doesNotMatch(view,/<img src=x>/);
 assert.match(view,/data-edit-course="course-1"/);
 assert.match(dir,/Schedule Planner/);
 assert.match(file('js/features/courses.js'),/Room \${c.roomNumber}/);
 assert.match(file('js/features/courses.js'),/fld-roomNumber|field\('roomNumber'/);
});
test('theme supports light/dark with Bootstrap color mode and persists store state',()=>{
 assert.equal(normalizeTheme('invalid'),'light');
 const attrs={};const themeAttrs={};const label={textContent:''};
 globalThis.document={documentElement:{setAttribute:(k,v)=>attrs[k]=v,style:{}},body:{dataset:themeAttrs},querySelector:()=>({setAttribute:()=>{},querySelector:()=>label})};
 replaceState(initialState());assert.equal(toggleTheme(),'dark');
 assert.equal(getState().settings.theme,'dark');
 assert.equal(applyTheme(),'dark');assert.equal(attrs['data-bs-theme'],'dark');assert.equal(themeAttrs.theme,'dark');
 assert.equal(label.textContent,'Light');
 assert.equal(toggleTheme(),'light');assert.equal(themeAttrs.theme,'dark'); // store updated; theme applies on page refresh
 assert.equal(applyTheme(),'light');assert.equal(attrs['data-bs-theme'],'light');
});
test('sticky topbar and dark styling load offline',()=>{
 assert.match(file('index.html'),/id="theme-toggle"/);
 assert.match(file('index.html'),/href="#\/planner"/);
 assert.match(file('index.html'),/css\/theme\.css/);
 assert.match(file('css/theme.css'),/\.topbar\{[^}]*position:sticky;/);
 assert.match(file('css/theme.css'),/body\{overflow-x:clip\}/);
 assert.match(file('js/core/ui.js'),/applyTheme\(s\.theme\)/);
 assert.match(file('sw.js'),/\.\/css\/theme\.css/);
 assert.match(file('sw.js'),/\.\/js\/features\/planner\.js/);
});
