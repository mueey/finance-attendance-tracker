import {today} from './utils.js';

// XP is calculated from existing records, not stored as a mutable balance.
// This prevents duplicate rewards when records are edited or the dashboard rerenders.
export const XP_RULES = Object.freeze({assignment:30, project:50, exam:20, task:15, studyBlock:15, studyBlockMinutes:25});
export const LEVELS = Object.freeze([
  {level:1,title:'Beginner',xp:0},
  {level:2,title:'Learner',xp:100},
  {level:3,title:'Dedicated',xp:300},
  {level:4,title:'Achiever',xp:600},
  {level:5,title:'Scholar',xp:1000},
  {level:6,title:'Expert',xp:1500},
  {level:7,title:'Master',xp:2500},
  {level:8,title:'Academic Legend',xp:4000}
]);
function dateOffset(value,days){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function getAcademicRewards(state,date=today()){
 const tasks=Array.isArray(state.tasks)?state.tasks:[];
 const sessions=Array.isArray(state.studySessions)?state.studySessions:[];
 const completed=tasks.filter(t=>t.status==='completed');
 const taskXp=completed.reduce((sum,t)=>sum+(XP_RULES[t.type]||0),0);
 const validSessions=sessions.filter(s=>/^\d{4}-\d{2}-\d{2}$/.test(s.date)&&s.date<=date&&Number.isFinite(Number(s.minutes))&&Number(s.minutes)>0);
 const totalMinutes=validSessions.reduce((sum,s)=>sum+Number(s.minutes),0);
 const studyXp=Math.floor(totalMinutes/XP_RULES.studyBlockMinutes)*XP_RULES.studyBlock;
 const totalXp=taskXp+studyXp;
 const uniqueDays=[...new Set(validSessions.map(s=>s.date))].sort();
 let streak=0;
 const last=uniqueDays.at(-1);
 if(last===date||last===dateOffset(date,-1)){
  let cursor=last;
  const set=new Set(uniqueDays);
  while(set.has(cursor)){streak++;cursor=dateOffset(cursor,-1);}
 }
 let current=LEVELS[0],next=null;
 for(let i=0;i<LEVELS.length;i++){if(totalXp>=LEVELS[i].xp)current=LEVELS[i];else{next=LEVELS[i];break;}}
 const progress=next?Math.max(0,Math.min(100,((totalXp-current.xp)/(next.xp-current.xp))*100)):100;
 return {totalXp,taskXp,studyXp,completedTasks:completed.length,studyMinutes:totalMinutes,studyStreak:streak,level:current.level,levelTitle:current.title,nextLevel:next?.level??null,nextLevelTitle:next?.title??null,nextLevelXp:next?.xp??null,levelProgress:progress,xpToNext:next?next.xp-totalXp:0};
}
