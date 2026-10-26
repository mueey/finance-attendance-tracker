// Event attendance is assessed independently for each of four check-in/out slots.
// The previous Trackerist releases used boolean slots; these are supported here.
export const EVENT_SLOT_LABELS = {amIn:'AM In',amOut:'AM Out',pmIn:'PM In',pmOut:'PM Out'};
export const EVENT_SLOT_KEYS = Object.keys(EVENT_SLOT_LABELS);
export const EVENT_SLOT_STATUSES = ['present','absent','excused'];

export function normalizeEventSlots(slots,dayStatus='present') {
  if(!slots || typeof slots!=='object' || Array.isArray(slots))return null;
  return Object.fromEntries(EVENT_SLOT_KEYS.map(key=>{
    const raw=slots[key];
    const value=raw===true?'present':raw===false?'absent':EVENT_SLOT_STATUSES.includes(raw)?raw:dayStatus==='excused'?'excused':dayStatus==='absent'?'absent':'present';
    return [key,value];
  }));
}
export function countEventSlots(slots,status){
  if(!slots)return {present:status==='present'?4:0,absent:status==='absent'?1:0,excused:status==='excused'?4:0,legacy:status==='absent'};
  return {
    present:EVENT_SLOT_KEYS.filter(k=>slots[k]==='present').length,
    absent:EVENT_SLOT_KEYS.filter(k=>slots[k]==='absent').length,
    excused:EVENT_SLOT_KEYS.filter(k=>slots[k]==='excused').length,
    legacy:false
  };
}
export function eventDayStatus(slots){
  const counts=countEventSlots(slots,'present');
  return counts.absent?'absent':counts.excused?'excused':'present';
}
export function missedEventSlots(record){
  if(record.status!=='absent')return [];
  // Legacy quick-marked event days (without slot details) retain one historical fine.
  // The user can edit the day and explicitly select its four slots under the new policy.
  if(!record.slots)return [{key:'legacy',label:'Legacy whole-day absence'}];
  return EVENT_SLOT_KEYS.filter(k=>(record.slots[k]==='absent'||record.slots[k]===false)).map(key=>({key,label:EVENT_SLOT_LABELS[key]}));
}
