import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('main app shell removes the entire top header and keeps controls reachable in sidebar',()=>{const html=read('index.html'),app=read('js/app.js');assert.doesNotMatch(html,/<header class="topbar"/);assert.match(html,/id="theme-toggle"/);assert.match(html,/id="logout-button"/);assert.match(html,/id="mobile-more"/);assert.doesNotMatch(app,/menuButton/);});
test('profile banner uses one picker for static image and animated video',()=>{const settings=read('js/features/settings.js');assert.match(settings,/id="profileBannerMediaFile"/);assert.match(settings,/image\/png,image\/jpeg,image\/webp,video\/mp4,video\/webm,video\/quicktime/);assert.doesNotMatch(settings,/profileBannerVideoFile|profileBannerFile/);assert.match(settings,/data-widget-toggle/);});
test('dashboard widget choices are tap-to-toggle named buttons, not checkboxes',()=>{const settings=read('js/features/settings.js');assert.match(settings,/class="dashboard-widget-toggle/);assert.match(settings,/aria-pressed=/);assert.match(settings,/addEventListener\('click'/);assert.doesNotMatch(settings,/form-check-input.*widget-|widget-[A-Za-z]+.*type="checkbox"/);});
