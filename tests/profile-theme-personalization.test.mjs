import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
test('new workspace defaults include profile media and custom accent settings',()=>{const s=initialState();assert.equal(s.settings.profileImage,'');assert.equal(s.settings.profileBanner,'');assert.equal(s.settings.customAccentColor,'#3985ed');});
test('backup restore preserves profile media and validates custom accent color',()=>{const s=initialState();s.settings.profileImage='data:image/jpeg;base64,AAAA';s.settings.profileBanner='data:image/jpeg;base64,BBBB';s.settings.customAccentColor='#aabbcc';const restored=validateAndNormalize(s);assert.equal(restored.settings.profileImage,s.settings.profileImage);assert.equal(restored.settings.profileBanner,s.settings.profileBanner);assert.equal(restored.settings.customAccentColor,'#aabbcc');s.settings.customAccentColor='red';assert.equal(validateAndNormalize(s).settings.customAccentColor,'#3985ed');});
test('settings expose profile photo, banner, remove controls and custom theme color',()=>{const settings=read('../js/features/settings.js');assert.match(settings,/profileImageFile/);assert.match(settings,/profileBannerMediaFile/);assert.match(settings,/remove-profile-image/);assert.match(settings,/remove-profile-banner/);assert.match(settings,/customAccentColor/);});
test('dashboard renders uploaded profile image and banner',()=>{const dashboard=read('../js/features/dashboard.js');assert.match(dashboard,/profileBanner/);assert.match(dashboard,/profileImage/);});
