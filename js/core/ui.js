import {html} from './utils.js';
import {getState} from './store.js';
import {applyTheme} from './theme.js';
let refreshHandler=()=>{};
export function setRefresh(fn){refreshHandler=fn;}
export const refresh=()=>refreshHandler();
export function editModal({title,body,submit='Save changes',onSave}){
 const host=document.querySelector('#editor-modal');
 document.querySelector('#editor-modal-title').textContent=title;
 const editorBody=document.querySelector('#editor-modal-body');
 editorBody.innerHTML=body;
 editorBody.scrollTop=0; // opening a different editor must start at the first field
 document.querySelector('#editor-submit').textContent=submit;
 const form=document.querySelector('#editor-form');form.reset(); // values embedded in markup are now used as the form reset defaults
 form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;try{const data=Object.fromEntries(new FormData(form).entries());const result=onSave(data,form);if(result===false)return;bootstrap.Modal.getOrCreateInstance(host).hide();toast('Changes saved');refresh();}catch(err){toast(err.message||'Unable to save',true);}};
 bootstrap.Modal.getOrCreateInstance(host).show();
}
export function toast(message,isError=false){
 const host=document.querySelector('#toast-host'),elem=document.createElement('div');
 elem.className=`toast align-items-center border-0 text-bg-${isError?'danger':'dark'}`;
 elem.setAttribute('role','status');elem.setAttribute('aria-live','polite');elem.setAttribute('aria-atomic','true');
 elem.innerHTML=`<div class="d-flex"><div class="toast-body">${html(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
 host.append(elem);
 elem.addEventListener('hidden.bs.toast',()=>{bootstrap.Toast.getInstance(elem)?.dispose();elem.remove();},{once:true});
 bootstrap.Toast.getOrCreateInstance(elem,{autohide:true,delay:4600}).show();
}
export function confirmDelete(label,fn){if(!confirm(`Delete ${label}? This cannot be undone. Consider exporting a backup first.`))return;try{fn();toast('Deleted');refresh();}catch(err){toast(err.message,true);}}
export function renderSettings(){const s=getState().settings;applyTheme(s.theme);const name=document.querySelector('#workspace-name');if(name)name.textContent=s.workspace;}
export function captureClick(id,fn){document.getElementById(id)?.addEventListener('click',fn)}
export function escAttr(s){return html(s)}
export function changeRoute(route){location.hash=`#/${route}`;}
