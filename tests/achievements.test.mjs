import test from 'node:test';
import assert from 'node:assert/strict';
import {getAcademicRewards} from '../js/core/achievements.js';
import {initialState,validateAndNormalize} from '../js/core/migrate.js';

test('academic XP derives from completed task types and 25-minute study blocks',()=>{
 const state=initialState();
 state.tasks=[{type:'assignment',status:'completed'},{type:'project',status:'completed'},{type:'exam',status:'completed'},{type:'task',status:'completed'},{type:'project',status:'todo'}];
 state.studySessions=[{date:'2026-11-27',minutes:60},{date:'2026-11-26',minutes:20}];
 const result=getAcademicRewards(state,'2026-11-27');
 assert.equal(result.taskXp,115);assert.equal(result.studyXp,45);assert.equal(result.totalXp,160);assert.equal(result.completedTasks,4);
 assert.equal(result.level,2);assert.equal(result.xpToNext,140);assert.equal(result.studyStreak,2);
});

test('reopened tasks remove derived XP and invalid/future study logs do not extend streak',()=>{
 const state=initialState();state.tasks=[{type:'assignment',status:'completed'}];state.studySessions=[{date:'2026-11-27',minutes:25},{date:'2026-11-29',minutes:100}];
 assert.equal(getAcademicRewards(state,'2026-11-27').totalXp,45);
 state.tasks[0].status='todo';
 const result=getAcademicRewards(state,'2026-11-27');
 assert.equal(result.totalXp,15);assert.equal(result.studyStreak,1);
});

test('legacy dashboard widget preferences default academic rewards on and can be disabled',()=>{
 const state=initialState();delete state.settings.dashboardWidgets.academicRewards;
 const restored=validateAndNormalize(state);
 assert.equal(restored.settings.dashboardWidgets.academicRewards,true);
 state.settings.dashboardWidgets.academicRewards=false;
 assert.equal(validateAndNormalize(state).settings.dashboardWidgets.academicRewards,false);
});
