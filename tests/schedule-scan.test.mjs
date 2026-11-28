import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {parseScheduleText,parseDateRange,normalizeScanDate,validateScannedCourse,looksLikeDuplicate,extractTimeRange,findWeekdays} from '../js/core/schedule-import.js';
import {isScheduled} from '../js/core/schedule.js';
const root=path.resolve(import.meta.dirname,'..');

test('parses OCR line with course code, subject, time, days, room, professor and full semester range',()=>{
 const [row]=parseScheduleText('CS 105 | Web Development | Mon/Wed/Fri | 8:00 AM - 9:30 AM | Room B-204 | Prof. Santos | 2026-11-09 - 2027-03-31').rows;
 assert.equal(row.name,'Web Development');assert.equal(row.code,'CS 105');assert.deepEqual(row.weekdays,[1,3,5]);assert.equal(row.time,'8:00 AM - 9:30 AM');assert.equal(row.roomNumber,'B-204');assert.equal(row.professorName,'Santos');assert.equal(row.startDate,'2026-11-09');assert.equal(row.endDate,'2027-03-31');
 assert.equal(validateScannedCourse(row),'');
 assert.equal(isScheduled({type:'class',...row},'2026-11-09'),true);assert.equal(isScheduled({type:'class',...row},'2026-11-10'),false);
 assert.equal(isScheduled({type:'class',...row},'2027-04-01'),false);
});
test('OCR parses multi-line semester table with headers and MM/DD/YYYY dates',()=>{
 const input='Course Code | Subject | Days | Time | Room | Instructor | Start | End\nCS105 | Web Development | MWF | 08:00-09:30 | B204 | Prof. Santos | 11/09/2026 | 03/31/2027\nMATH 121 | Statistics | TTh | 13:00-14:30 | 302 | Dr. Reyes | 11/10/2026 | 03/31/2027';
 const parsed=parseScheduleText(input);assert.equal(parsed.rows.length,2);assert.equal(parsed.rows[0].name,'Web Development');assert.deepEqual(parsed.rows[1].weekdays,[2,4]);assert.equal(parsed.rows[1].professorName,'Dr. Reyes');assert.equal(parsed.rows[0].endDate,'2027-03-31');
});
test('OCR parses a plain-space sentence and warns if dates missing',()=>{
 const parsed=parseScheduleText('MATH 101 Discrete Mathematics Mon Wed Fri 8:00 AM - 9:30 AM Room 205 Professor: Mary Cruz');
 assert.equal(parsed.rows.length,1);assert.equal(parsed.rows[0].name,'Discrete Mathematics');assert.equal(parsed.rows[0].professorName,'Mary Cruz');assert.equal(parsed.rows[0].roomNumber,'205');assert.match(validateScannedCourse(parsed.rows[0]),/start date/i);
});
test('date parsing rejects impossible dates and keeps month/day ordering',()=>{
 assert.equal(normalizeScanDate('02/30/2027'),'');assert.equal(normalizeScanDate('2027-02-28'),'2027-02-28');assert.deepEqual(parseDateRange('11/09/2026 to 03/31/2027'),{startDate:'2026-11-09',endDate:'2027-03-31'});
});
test('attend only valid OCR days and reject bad time/empty subject',()=>{
 assert.deepEqual(findWeekdays('TTH'),[2,4]);assert.deepEqual(findWeekdays('Mon/Wed/Fri'),[1,3,5]);assert.equal(extractTimeRange('8:00 AM to 9:30 AM'),'8:00 AM - 9:30 AM');
 const row={name:'CS',weekdays:[1],time:'8:00 AM - 9:30 AM',startDate:'2026-11-09',endDate:'2027-01-10'};
 assert.equal(validateScannedCourse(row),'');assert.match(validateScannedCourse({...row,endDate:''}),/end date/);assert.match(validateScannedCourse({...row,weekdays:[]}),/weekday/);assert.match(validateScannedCourse({...row,time:'9am'}),/time/);assert.match(validateScannedCourse({...row,endDate:'2025-01-01'}),/End date/);
});
test('duplicate detection blocks identical recurrence but permits different sections',()=>{
 const c={name:'Web Development',code:'CS105',type:'class',weekdays:[1,3,5],startDate:'2026-11-09',time:'8:00 AM - 9:30 AM'};
 assert.equal(looksLikeDuplicate([c],{...c}),true);assert.equal(looksLikeDuplicate([c],{...c,weekdays:[2,4]}),false);
});
test('scan UI is integrated in app routes, planner, courses, privacy and offline cache',()=>{
 const read=f=>fs.readFileSync(path.join(root,f),'utf8');const sw=read('sw.js');const ui=read('js/features/schedule-scan.js');
 for(const asset of ['js/core/schedule-import.js','js/core/schedule-ocr.js','js/features/schedule-scan.js'])assert.ok(sw.includes(asset));
 assert.doesNotMatch(read('index.html'),/data-route="(?:scan|planner)"/);assert.match(read('js/app.js'),/scan:scheduleScan/);assert.match(read('js/features/courses.js'),/id="schedule-tools-modal"/);assert.match(read('js/features/courses.js'),/scheduleScan\.renderPanel\(\)/);
 assert.match(ui,/capture="environment"/);assert.match(ui,/scan-row-list/);assert.match(ui,/scan-semester/);assert.match(ui,/fineRate:0/);
 assert.match(read('privacy.html'),/schedule photos/i);assert.match(read('run-ocr-server.py'),/NamedTemporaryFile/);
});
test('native TextDetector reads a photo without network',async()=>{
 const {readSchedulePhoto}=await import('../js/core/schedule-ocr.js');
 const original={TextDetector:globalThis.TextDetector,createImageBitmap:globalThis.createImageBitmap,location:globalThis.location};
 try{
  let closed=false;globalThis.TextDetector=class{async detect(){return [{rawValue:'CS105 Mon/Wed/Fri 8:00 AM - 9:30 AM'}];}};
  globalThis.createImageBitmap=async()=>({close(){closed=true;}});
  globalThis.location={hostname:'example.github.io'};
  const result=await readSchedulePhoto(new Blob(['image'],{type:'image/png'}));
  assert.match(result.text,/CS105/);assert.equal(closed,true);
 }finally{for(const [k,v] of Object.entries(original)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
test('OCR wrapped row continues on second line with room, instructor, and dates',()=>{
 const text='CS 105 | Web Development | Mon/Wed/Fri | 8:00 AM - 9:30 AM\nRoom B-204 | Prof. Santos | 2026-11-09 - 2027-03-31';
 const {rows}=parseScheduleText(text);
 assert.equal(rows.length,1);
 assert.equal(rows[0].name,'Web Development');
 assert.equal(rows[0].roomNumber,'B-204');
 assert.equal(rows[0].professorName,'Santos');
 assert.equal(rows[0].startDate,'2026-11-09');
 assert.equal(rows[0].endDate,'2027-03-31');
});
