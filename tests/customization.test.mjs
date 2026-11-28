import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';

test('new installs receive safe appearance customization defaults',()=>{
 const s=initialState();
 assert.equal(s.settings.accentColor,'blue');
 assert.equal(s.settings.fontSize,'medium');
 assert.equal(s.settings.density,'comfortable');
 assert.equal(s.settings.navigation,'auto');
 assert.equal(s.settings.animations,true);
});

test('appearance preferences survive backup normalization',()=>{
 const s=initialState();
 Object.assign(s.settings,{theme:'system',accentColor:'purple',fontSize:'large',density:'compact',navigation:'both',animations:false});
 const restored=validateAndNormalize(s);
 for(const key of ['theme','accentColor','fontSize','density','navigation','animations']) assert.equal(restored.settings[key],s.settings[key]);
});

test('invalid appearance preferences safely fall back to defaults',()=>{
 const s=initialState();
 Object.assign(s.settings,{theme:'neon',accentColor:'ultraviolet',fontSize:'giant',density:'chaotic',navigation:'teleport',animations:'no'});
 const restored=validateAndNormalize(s);
 assert.equal(restored.settings.theme,'light');assert.equal(restored.settings.accentColor,'blue');
 assert.equal(restored.settings.fontSize,'medium');assert.equal(restored.settings.density,'comfortable');
 assert.equal(restored.settings.navigation,'auto');assert.equal(restored.settings.animations,true);
});
