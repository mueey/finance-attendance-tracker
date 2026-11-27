import {parseWeekdays,formatWeekdays} from './schedule.js';
import {validDate} from './utils.js';

const DATE_SOURCE=String.raw`(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})`;
const DATE_RE=new RegExp(DATE_SOURCE,'g');
const TIME_POINT=String.raw`(?:\b(?:[01]?\d|2[0-3]):[0-5]\d\s*(?:[AaPp]\.?[Mm]\.?)?)`;
const RANGE_RE=new RegExp(`(${TIME_POINT})\\s*(?:-|–|—|to|until)\\s*(${TIME_POINT})`,'i');
const DAY_RE=/\b(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Tues|Wed|Thu|Thurs|Fri|Sat)\b|\b(?:M\s*\/\s*W\s*\/\s*F|T\s*\/\s*TH|MWF|TTH|MW|M-W-F|T-TH)\b/gi;
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
export function normalizeScanDate(value){
 const text=norm(value).replace(/\//g,'-');if(!text)return '';
 const parts=text.split('-');if(parts.length!==3)return '';
 let y,m,d;
 if(parts[0].length===4){[y,m,d]=parts.map(Number);}else if(parts[2].length===4){[m,d,y]=parts.map(Number);}else return '';
 const result=`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 return validDate(result)?result:'';
}
export function parseDateRange(text){
 const matches=[...String(text||'').matchAll(DATE_RE)].map(m=>normalizeScanDate(m[0])).filter(Boolean);
 return {startDate:matches[0]||'',endDate:matches[1]||''};
}
export function extractTimeRange(text){
 const match=String(text||'').match(RANGE_RE);if(!match)return '';
 return norm(match[0]).replace(/\s*(?:–|—|to|until)\s*/gi,' - ').replace(/\s*-\s*/g,' - ');
}
export function findWeekdays(text){
 // Parse one line or explicit day column, never try to guess a weekday from a course name.
 const s=String(text||'');const hits=s.match(DAY_RE)||[];
 let days=new Set();for(const hit of hits)for(const d of parseWeekdays(hit))days.add(d);
 // Single-letter schedule codes only after a labeled prefix, or when the entire column is shorthand.
 const labelled=s.match(/\b(?:Days?|Meeting\s*Days?|Weekdays?|Schedule)\s*[:#-]\s*([MTWFSUa-z\s/,&-]{1,30})(?=\s{2,}|[|;]|$)/i);
 if(labelled)for(const d of parseWeekdays(labelled[1]))days.add(d);
 if(!days.size)for(const d of parseWeekdays(s))days.add(d);
 return [...days].sort((a,b)=>a-b);
}
function headerIndex(text){
 const labels=text.split(/\s*\|\s*|\t+|\s{3,}/).map(s=>s.trim().toLowerCase());
 if(!labels.some(s=>/subject|course|class name/.test(s)))return null;
 if(!labels.some(s=>/time|days|schedule|room|instructor|professor/.test(s)))return null;
 const mapping={};for(let i=0;i<labels.length;i++){
  const l=labels[i];
  if(/\b(code|course no|subject code)\b/.test(l))mapping.code=i;
  else if(/\b(subject|course|class)\b/.test(l))mapping.name=i;
  else if(/\b(days|meeting day|weekday|schedule)\b/.test(l))mapping.days=i;
  else if(/\btime\b/.test(l))mapping.time=i;
  else if(/\b(room|location|venue)\b/.test(l))mapping.room=i;
  else if(/\b(professor|instructor|teacher|faculty)\b/.test(l))mapping.professor=i;
  else if(/\b(start|begin)\b/.test(l))mapping.start=i;
  else if(/\b(end|until)\b/.test(l))mapping.end=i;
 }
 return mapping;
}
export function parseScheduleLine(line,columns=null){
 const raw=norm(line);if(!raw||raw.length>600)return null;
 let name='',code='',time='',days=[],roomNumber='',professorName='',dates={startDate:'',endDate:''};
 const segments=String(line).trim().split(/\s*\|\s*|\t+|\s{3,}/).map(norm);
 if(columns&&segments.length>=2){
  const read=k=>segments[columns[k]??-1]||'';
  name=read('name');code=read('code');days=findWeekdays(read('days'));time=extractTimeRange(read('time'))||read('time');
  roomNumber=read('room').replace(/^(?:room|rm|lab)\s*[:#-]?\s*/i,'');
  professorName=read('professor').replace(/^(?:professor|prof\.?|instructor)\s*[:#-]?\s*/i,'');
  dates={startDate:normalizeScanDate(read('start')),endDate:normalizeScanDate(read('end'))};
 }
 if(!columns&&segments.length>=2){
  // A typical photo/table line starts with "CS 105 | Web Development | MWF...".
  if(/^[A-Z]{2,8}\s*[- ]?\d{1,4}[A-Z]?$/i.test(segments[0]) && segments[1] && !extractTimeRange(segments[1])){
   code=segments[0];name=segments[1];
  }
 }
 if(!time)time=extractTimeRange(raw);
 if(!days.length)days=findWeekdays(raw);
 if(!dates.startDate)dates=parseDateRange(raw);
 if(!roomNumber){const rm=raw.match(/\b(?:Room|Rm|Classroom|Lab)\s*(?:No\.?|Number)?\s*[:#-]?\s*([\w\-/.]+(?:\s+\d{1,4})?)/i);if(rm)roomNumber=norm(rm[1]);}
 if(!professorName){const p=raw.match(/\b(?:Professor|Prof\.?|Instructor|Faculty|Teacher)\s*[:\-]?\s*([^|;]+?)(?=\s*\||;|\s+(?:Room|Rm|Days|Schedule|Time|Date|Starts?|Ends?)\s*[:#]|$)/i);if(p)professorName=norm(p[1]);}
 if(!name){
  let candidate=segments[0]||raw;
  if(segments.length===1){
   candidate=candidate.replace(RANGE_RE,' ').replace(DATE_RE,' ')
    .replace(DAY_RE,' ').replace(/\b(?:Room|Rm|Classroom|Lab)\s*(?:No\.?|Number)?\s*[:#-]?\s*[\w\-/.]+(?:\s+\d{1,4})?/gi,' ')
    .replace(/\b(?:Professor|Prof\.?|Instructor|Faculty|Teacher)\s*[:\-].*$/i,' ')
    .replace(/\b(?:Days?|Meeting Days?|Schedule|Weekdays?)\s*[:#-]\s*[MTWFSUa-z\s/,&-]{1,30}$/i,' ');
  }
  name=norm(candidate.replace(/[|;,]+$/g,''));
 }
 if(!code){const m=name.match(/^([A-Za-z]{2,7}\s*[- ]?\d{1,4}[A-Za-z]?)\s*(?:-|:)?\s+(.+)$/);if(m){code=norm(m[1]);name=norm(m[2]);}}
 if(!time&&!days.length&&!columns)return null;
 // Do not convert unrecognized text into an invented subject.
 if(!name||/^(?:schedule|subject|course|time|days|room)$/i.test(name))return null;
 return {name:name.slice(0,250),code:code.slice(0,50),weekdays:days,time:time.slice(0,100),roomNumber:roomNumber.slice(0,80),professorName:professorName.slice(0,120),startDate:dates.startDate,endDate:dates.endDate,source:raw};
}
export function parseScheduleText(text){
 const lines=String(text||'').replace(/\r\n?/g,'\n').split('\n').map(s=>s.trim()).filter(Boolean);
 let columns=null,rows=[],skipped=0,pending='';
 for(const line of lines){
  const h=headerIndex(line);if(h){columns=h;pending='';continue;}
  // OCR sometimes splits room, instructor, and semester dates onto the next line.
  const detailOnly=/^(?:Room|Rm|Classroom|Lab|Professor|Prof\.?|Instructor|Faculty|Teacher|Start|End|Date)\b/i.test(line)||
    (!!rows.length && !!line.match(DATE_RE) && !extractTimeRange(line) && !findWeekdays(line).length);
  if(detailOnly && rows.length){
   const previous=rows[rows.length-1];const merged=parseScheduleLine(`${previous.source} | ${line}`);
   if(merged){
    previous.roomNumber=merged.roomNumber||previous.roomNumber;
    previous.professorName=merged.professorName||previous.professorName;
    previous.startDate=merged.startDate||previous.startDate;
    previous.endDate=merged.endDate||previous.endDate;
    previous.source+=` | ${line}`;
    continue;
   }
  }
  let parsed=parseScheduleLine(pending?`${pending} | ${line}`:line,columns);
  if(!parsed&&pending){parsed=parseScheduleLine(line,columns);}
  if(parsed){rows.push(parsed);pending='';}
  else if(!detailOnly&&line.length<180&&!extractTimeRange(line)&&!findWeekdays(line).length&&/\b[A-Za-z]{2,7}\s*\d{1,4}\b/.test(line))pending=line;
  else skipped++;
 }
 const seen=new Set();rows=rows.filter(r=>{const key=[r.name,r.code,r.time,r.weekdays.join(',')].join('|').toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});
 return {rows,warnings:[...(skipped?[`${skipped} lines did not contain a recognizable schedule.`]:[]),...(rows.some(r=>!r.weekdays.length)?['Some rows do not have detectable meeting days. Check them before saving.']:[]),...(!rows.length?['No schedule rows recognized. Paste text with one class per line or add a row manually.']:[])]};
}

export function looksLikeDuplicate(existing,candidate){
 return existing.some(c=>c.type==='class'&&!c.archived&&norm(c.name).toLowerCase()===norm(candidate.name).toLowerCase()&&norm(c.time).toLowerCase()===norm(candidate.time).toLowerCase()&&String(c.startDate||'')===String(candidate.startDate||'')&&formatWeekdays(c.weekdays||[])===formatWeekdays(candidate.weekdays||[]));
}
export function validateScannedCourse(course){
 if(!norm(course.name))return 'Course name is required.';
 if(!Array.isArray(course.weekdays)||!course.weekdays.length||course.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6))return 'Select at least one weekday.';
 if(!norm(course.time)||!extractTimeRange(course.time))return 'Enter a valid start and end time, such as 8:00 AM - 9:30 AM.';
 if(!validDate(course.startDate))return 'Set a valid semester start date.';
 if(!validDate(course.endDate))return 'Set a valid semester end date.';
 if(course.endDate<course.startDate)return 'End date must be on or after start date.';
 return '';
}
export {formatWeekdays};
