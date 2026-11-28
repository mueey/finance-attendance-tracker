import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const courses = readFileSync(new URL('../js/features/courses.js', import.meta.url), 'utf8');
const scan = readFileSync(new URL('../js/features/schedule-scan.js', import.meta.url), 'utf8');
const planner = readFileSync(new URL('../js/features/planner.js', import.meta.url), 'utf8');

test('Scan Schedule and Schedule Planner are no longer sidebar navigation items', () => {
  assert.doesNotMatch(index, /data-route="(?:scan|planner)"/);
});

test('Courses & Events exposes one Scan Schedule button that opens a popup', () => {
  assert.match(courses, /id="open-schedule-tools"[^>]*>[^<]*<span[\s\S]*?Scan Schedule/);
  assert.match(courses, /id="schedule-tools-modal"/);
  assert.match(courses, /bootstrap\.Modal\.getOrCreateInstance\(toolsModal\)\.show\(\)/);
});

test('The popup contains both scanner and planner tabs', () => {
  assert.match(courses, /id="schedule-scan-tab"/);
  assert.match(courses, /id="schedule-planner-tab"/);
  assert.match(courses, /scheduleScan\.renderPanel\(\)/);
  assert.match(courses, /planner\.renderPanel\(\)/);
  assert.match(scan, /export function renderPanel\(\)/);
  assert.match(planner, /export function renderPanel\(\)/);
});

test('Importing scanned classes returns to Courses & Events rather than a standalone planner route', () => {
  assert.match(scan, /location\.hash='#\/courses'/);
  assert.doesNotMatch(scan, /location\.hash='#\/planner'/);
});

test('Schedule tool updates refresh the planner panel without rebuilding the open Courses page', () => {
  const app = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /scheduleToolsOpen[\s\S]*?courses\.refreshCoursesView\(\);return/);
  assert.match(courses, /export function refreshCoursesView\(\)/);
});
