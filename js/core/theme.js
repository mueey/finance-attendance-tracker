import {getState,update} from './store.js';

export function normalizeTheme(value){return value==='dark'?'dark':'light';}
export function applyTheme(value){
 let mode=value;
 if(mode===undefined){
  try{mode=getState().settings.theme;}catch{
   try{mode=JSON.parse(localStorage.getItem('trackerist_v2_state')||'{}')?.settings?.theme;}catch{mode='light';}
  }
 }
 mode=normalizeTheme(mode);
 document.documentElement.setAttribute('data-bs-theme',mode); // Bootstrap 5.3 component variables
 document.body.dataset.theme=mode; // Trackerist custom design tokens
 document.documentElement.style.colorScheme=mode;
 const toggle=document.querySelector('#theme-toggle');
 if(toggle){const dark=mode==='dark';toggle.setAttribute('aria-pressed',String(dark));toggle.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');toggle.title=dark?'Switch to light mode':'Switch to dark mode';const label=toggle.querySelector('.theme-button-label');if(label)label.textContent=dark?'Light':'Dark';}
 return mode;
}
export function toggleTheme(){
 const next=getState().settings.theme==='dark'?'light':'dark';
 update(s=>{s.settings.theme=next;}); // state update also re-renders and applies theme
 return next;
}
