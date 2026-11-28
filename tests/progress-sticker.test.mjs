import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('progress sticker settings default safely and preserve left/right placement in backups',()=>{
 const state=initialState();assert.equal(state.settings.hasProgressSticker,false);assert.equal(state.settings.progressStickerPosition,'right');
 state.settings.hasProgressSticker=true;state.settings.progressStickerPosition='left';
 const restored=validateAndNormalize(state);assert.equal(restored.settings.hasProgressSticker,true);assert.equal(restored.settings.progressStickerPosition,'left');
 state.settings.progressStickerPosition='center';assert.equal(validateAndNormalize(state).settings.progressStickerPosition,'right');
});
test('settings allow users to upload, preview, position, and remove their own GIF or sticker',()=>{
 const settings=read('../js/features/settings.js');
 assert.match(settings,/progressStickerFile/);assert.match(settings,/image\/gif,image\/png,image\/jpeg,image\/webp/);
 assert.match(settings,/progressStickerPosition/);assert.match(settings,/progress-sticker-preview/);assert.match(settings,/remove-progress-sticker/);
 assert.match(settings,/5\*1024\*1024/);assert.match(settings,/saveProgressSticker/);assert.match(settings,/removeProgressSticker/);
});
test('progress card displays only user-uploaded sticker and supports left/right placement',()=>{
 const dashboard=read('../js/features/dashboard.js');assert.match(dashboard,/academic-progress-sticker/);assert.match(dashboard,/sticker-\$\{s\.settings\.progressStickerPosition/);assert.match(dashboard,/getProgressSticker/);
});
test('GIF and sticker media are stored in IndexedDB and included in JSON backup/restore',()=>{
 const media=read('../js/core/profile-media.js');const settings=read('../js/features/settings.js');
 assert.match(media,/progress-sticker/);assert.match(media,/progressStickerAsDataURL/);assert.match(media,/restoreProgressStickerDataURL/);
 assert.ok(media.includes('image\\/(?:gif|png|jpeg|webp)'));assert.match(settings,/progressStickerData/);
});
test('service worker cache is versioned for the user-uploaded sticker update',()=>{
 const sw=read('../sw.js');assert.match(sw,/trackerist-v4\.5\.5-responsive-mobile/);assert.match(sw,/\.\/js\/core\/profile-media\.js/);
});

test('Open productivity button is placed on a separate row below the academic progress sticker row',()=>{
 const dashboard=read('../js/features/dashboard.js');
 const start=dashboard.indexOf('aria-label=\"Academic progress and XP\"');
 const end=dashboard.indexOf('</section>',start);
 const card=dashboard.slice(start,end);
 const sticker=card.indexOf('academic-progress-sticker');
 const button=card.indexOf('Open productivity');
 assert.ok(sticker>=0 && button>sticker);
 assert.match(card,/academic-progress-sticker[\s\S]*?<\/div><div class=\"d-flex justify-content-end mt-3 mb-3\"><a href=\"#\/productivity\"/);
});
