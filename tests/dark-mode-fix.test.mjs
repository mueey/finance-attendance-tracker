import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const dark = read('css/theme.css');
test('dark mode styles cover navigation, cards, schedule, forms, reports, and finance', () => {
  for (const selector of ['.mobile-bottom-nav', '.mobile-tab.active', '.card', '.quick-card', '.modal-content',
    '.calendar-cell', '.attendance-course-results', '.form-control', '.semester-summary-launch',
    '.table th', '.chip-present', '.dashboard-today', '.auth-panel', '.attendance-ring-track']) {
    assert.ok(dark.includes(selector), `Missing dark theme target ${selector}`);
  }
  assert.match(dark, /html\[data-bs-theme="dark"\]\s+body\s*\{/);
  assert.match(dark, /html\[data-bs-theme="dark"\]\s+\.mobile-bottom-nav\s*\{/);
});
test('saved theme is set before loading Bootstrap styles to prevent incorrect first paint', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('trackerist_v2_state') < html.indexOf('vendor/bootstrap.min.css'));
  assert.ok(html.indexOf('data-bs-theme') < html.indexOf('vendor/bootstrap.min.css'));
  for (const page of ['privacy.html','credits.html']) {
    const content=read(page);
    assert.ok(content.indexOf('trackerist_v2_state') < content.indexOf('vendor/bootstrap.min.css'));
  }
});
test('theme state synchronizes instantly and offline cache includes updated stylesheet', () => {
  const source=read('js/core/theme.js'),sw=read('sw.js');
  assert.match(source,/applyTheme\(next\)/);
  assert.match(source,/s\.settings\.theme=next/);
  assert.match(sw,/trackerist-v4\.5\.5-responsive-mobile/);
  assert.match(sw,/\.\/css\/theme\.css/);
  assert.match(read('index.html'),/Trackerist 4\.5\.5/);
});
