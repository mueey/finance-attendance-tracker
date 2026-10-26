import {getState,update} from '../core/store.js';
import {id,field,validDate,html} from '../core/utils.js';
import {editModal,confirmDelete} from '../core/ui.js';

export function openSemesterEditor(existing=null){
  editModal({
    title:existing?'Edit semester dates':'Add semester',
    submit:existing?'Update semester':'Save semester',
    body:`<div class="row g-3">${field('name','Semester name',existing?.name||'',{required:true,col:'col-12',placeholder:'e.g. 1st Semester AY 2026–2027'})}${field('startDate','Start date',existing?.startDate||'',{type:'date',required:true})}${field('endDate','End date',existing?.endDate||'',{type:'date',required:true})}<div class="col-12"><div class="insight">Set your school's actual term dates. Attendance fines and manual fine adjustments follow their recorded dates. Bills follow their selected semester (or due date by default). Payment allocations update automatically.</div></div></div>`,
    onSave:d=>{
      const name=d.name.trim();
      if(!name||name.length>100||!validDate(d.startDate)||!validDate(d.endDate)||d.startDate>d.endDate)throw Error('Enter a name and a valid semester date range.');
      const state=getState();
      if(state.semesters.some(s=>s.id!==existing?.id && d.startDate<=s.endDate && s.startDate<=d.endDate))throw Error('Semester dates cannot overlap. Edit an existing semester or choose different dates.');
      update(s=>{
        if(existing){const row=s.semesters.find(x=>x.id===existing.id);if(!row)throw Error('Semester no longer exists.');Object.assign(row,{name,startDate:d.startDate,endDate:d.endDate});s.settings.selectedSemesterId=row.id;}
        else {const newId=id();s.semesters.push({id:newId,name,startDate:d.startDate,endDate:d.endDate});s.settings.selectedSemesterId=newId;}
      });
    }
  });
}
export function deleteSemester(semester){
  confirmDelete(`semester "${semester.name}"? This keeps all attendance, charges and payments`,()=>update(s=>{
    s.semesters=s.semesters.filter(x=>x.id!==semester.id);
    for(const b of s.bills)if(b.semesterId===semester.id)b.semesterId='';
    for(const p of s.payments)if(p.semesterId===semester.id)p.semesterId='';
    if(s.settings.selectedSemesterId===semester.id)s.settings.selectedSemesterId='all';
  }));
}
export function semesterOptions(state=getState()){return [['all','Overall · All time'],...state.semesters.slice().sort((a,b)=>b.startDate.localeCompare(a.startDate)).map(s=>[s.id,`${s.name} (${s.startDate} to ${s.endDate})`])];}
