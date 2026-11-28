import test from 'node:test';
import assert from 'node:assert/strict';
import {initStore,getState,update} from '../js/core/store.js';
import {validateAndNormalize,initialState} from '../js/core/migrate.js';
const db=new Map();
globalThis.localStorage={getItem:k=>db.has(k)?db.get(k):null,setItem:(k,v)=>db.set(k,String(v))};
initStore();
test('calendar customization offers one upload control for a calendar card theme and live preview',async()=>{
 const {render}=await import('../js/features/calendar.js');const output=render();
 for(const item of ['calendar-card-theme-file','calendar-card-theme-preview','calendar-save-card-theme','calendar-remove-card-theme','Calendar card theme','glass-style date tiles'])assert.ok(output.includes(item),`missing ${item}`);
 for(const restored of ['calendar-sticker-file','calendar-date-sticker','calendar-apply-date-style','calendar-sticker-library','calendar-date-color','calendar-personal-date'])assert.ok(output.includes(restored),`missing restored date customization: ${restored}`);
 assert.ok(output.includes('class="card calendar-main-card"'));
});
test('uploaded calendar card theme survives backup normalization',()=>{
 const state=initialState();state.settings.calendarCustomization={cardImage:'data:image/png;base64,aGVsbG8=',cardThemeName:'Pastel flowers.png'};
 const normalized=validateAndNormalize(state).settings.calendarCustomization;
 assert.equal(normalized.cardImage,state.settings.calendarCustomization.cardImage);assert.equal(normalized.cardThemeName,'Pastel flowers.png');
});
test('invalid calendar card theme image is safely discarded',()=>{
 const state=initialState();state.settings.calendarCustomization={cardImage:'javascript:alert(1)',cardThemeName:'Bad'};
 const normalized=validateAndNormalize(state).settings.calendarCustomization;
 assert.equal(normalized.cardImage,'');assert.equal(normalized.cardThemeName,'');
});
test('uploaded stickers and per-date colors survive backup normalization without affecting attendance or courses',()=>{
 const state=initialState();state.settings.calendarCustomization={stickers:[{id:'s',name:'Star',data:'data:image/png;base64,aGVsbG8='}],dateStyles:{'2026-11-28':{color:'#ffccdd',stickerId:'s'}}};
 const normalized=validateAndNormalize(state).settings.calendarCustomization;
 assert.equal(normalized.stickers.length,1);assert.equal(normalized.dateStyles['2026-11-28'].color,'#ffccdd');assert.equal(normalized.dateStyles['2026-11-28'].stickerId,'s');
 const before={courses:getState().courses.length,attendance:getState().attendance.length};
 update(s=>{s.settings.calendarCustomization={cardImage:'data:image/png;base64,aGVsbG8=',cardThemeName:'My theme'};});
 assert.equal(getState().settings.calendarCustomization.cardThemeName,'My theme');assert.equal(getState().courses.length,before.courses);assert.equal(getState().attendance.length,before.attendance);
});
test('calendar customization is opened from one button in a scrollable modal, keeping the calendar uncluttered',async()=>{
 const {render}=await import('../js/features/calendar.js');const output=render();
 assert.match(output,/id="calendar-customize-open"[^>]*data-bs-toggle="modal"[^>]*data-bs-target="#calendar-customize-modal"/);
 assert.match(output,/class="modal fade calendar-customize-modal" id="calendar-customize-modal"/);
 assert.match(output,/modal-dialog-centered modal-dialog-scrollable modal-lg/);
 assert.ok(output.indexOf('id="calendar-customize-modal"')<output.indexOf('id="calendar-card-theme-file"'));
 assert.ok(output.includes('id="calendar-grid"'));
});
test('calendar exposes an in-place refresh so customization updates do not replace an open modal',async()=>{
 const {refresh}=await import('../js/features/calendar.js');assert.equal(typeof refresh,'function');
 const app=await (await import('node:fs/promises')).readFile(new URL('../js/app.js',import.meta.url),'utf8');
 assert.match(app,/customizationOpen[\s\S]*calendar\.refresh\(\)/);
});

test('calendar uses a clear surface and glassmorphism date tiles while preserving per-date color customization',async()=>{
 const css=await (await import('node:fs/promises')).readFile(new URL('../css/app.css',import.meta.url),'utf8');
 assert.match(css,/calendar-main-card:not\(\.has-card-theme\)\{background:transparent!important/);
 assert.match(css,/backdrop-filter:blur\(14px\) saturate\(155%\)/);
 assert.match(css,/--calendar-date-bg/);
 assert.match(css,/color-mix\(in srgb,var\(--calendar-date-bg\)/);
 assert.match(css,/body\[data-theme="dark"\] \.calendar-grid \.calendar-cell/);
});


test('calendar customization preloads the selected date color and sticker into the controls',async()=>{
 const date=new Date().toISOString().slice(0,10);update(s=>{s.settings.calendarCustomization={stickers:[{id:'s',name:'Star',data:'data:image/png;base64,aGVsbG8='}],dateStyles:{[date]:{color:'#abcdef',stickerId:'s'}}};});
 const {render}=await import('../js/features/calendar.js');const output=render();
 assert.ok(output.includes('value="#abcdef"'));assert.ok(output.includes('value="s" selected'));
});

test('reset card theme preserves uploaded stickers and per-date styles',async()=>{
 const source=await (await import('node:fs/promises')).readFile(new URL('../js/features/calendar.js',import.meta.url),'utf8');
 const start=source.indexOf("document.querySelector('#calendar-reset-theme')");const reset=source.slice(start,source.indexOf('const stickerFile',start));
 assert.match(reset,/delete c\.cardImage;delete c\.cardThemeName/);
 assert.doesNotMatch(reset,/state.settings.calendarCustomization=\{\};/);
});

test('sticker upload enforces the same aggregate limit used by backup normalization',async()=>{
 const source=await (await import('node:fs/promises')).readFile(new URL('../js/features/calendar.js',import.meta.url),'utf8');
 assert.match(source,/used\+data\.length>900000/);
});
