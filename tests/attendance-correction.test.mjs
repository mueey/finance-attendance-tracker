import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('attendance editor supports correcting an existing record in place',()=>{
 const attendance=read('js/features/attendance.js');
 assert.match(attendance,/Correct attendance record/);
 assert.match(attendance,/Save correction/);
 assert.match(attendance,/record\.courseId!==d\.courseId/);
 assert.match(attendance,/Change this attendance record from/);
 assert.match(attendance,/state\.attendance\.find\(x=>x\.id===record\.id\)/);
 assert.match(attendance,/existing\.id!==record\?\.id/);
});
test('dashboard recent attendance exposes a Correct action for each record',()=>{
 const dashboard=read('js/features/dashboard.js');
 assert.match(dashboard,/data-correct-attendance=/);
 assert.match(dashboard,/openAttendanceEditor\(record\)/);
});
test('attendance list labels existing-record edit action as Correct',()=>{
 const attendance=read('js/features/attendance.js');
 assert.match(attendance,/data-edit=\"\$\{html\(a\.id\)\}\">Correct</);
});
