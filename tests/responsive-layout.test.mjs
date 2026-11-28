import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const mobileCss = fs.readFileSync(path.join(root, 'css/mobile.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('mobile viewport is configured for device-width scaling', () => {
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
});

test('mobile responsive stylesheet is loaded by the app', () => {
  assert.match(html, /href="css\/mobile\.css"/);
});

test('responsive rules cover phone, tablet, narrow and landscape layouts', () => {
  assert.match(mobileCss, /@media\s*\(max-width:\s*991\.98px\)/);
  assert.match(mobileCss, /@media\s*\(max-width:\s*767\.98px\)/);
  assert.match(mobileCss, /@media\s*\(max-width:\s*575\.98px\)/);
  assert.match(mobileCss, /@media\s*\(max-width:\s*359\.98px\)/);
  assert.match(mobileCss, /orientation:\s*landscape/);
});

test('mobile layout accounts for safe areas and scrollable modals', () => {
  assert.match(mobileCss, /env\(safe-area-inset-bottom/);
  assert.match(mobileCss, /\.modal-body\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(mobileCss, /overscroll-behavior-x:\s*contain/);
});

test('service worker cache is versioned for responsive release', () => {
  assert.match(sw, /trackerist-v4\.5\.5-responsive-mobile/);
});
