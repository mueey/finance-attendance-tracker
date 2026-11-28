import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const dashboard=readFileSync(new URL('../js/features/dashboard.js',import.meta.url),'utf8');
test('header no longer duplicates the dashboard New attendance action',()=>{
  assert.doesNotMatch(index,/id="quick-attendance"/);
  assert.doesNotMatch(app,/quick-attendance/);
  assert.match(dashboard,/id="dashboard-add"/);
  assert.match(dashboard,/captureClick\('dashboard-add',\(\)=>openAttendanceEditor\(\)\)/);
});
