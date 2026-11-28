import {getState,update} from './store.js';
const ACCENTS={blue:'#3985ed',purple:'#9065db',green:'#239b72',orange:'#e58b35',red:'#dc5965'};
export function normalizeTheme(value){return ['dark','light','system'].includes(value)?value:'light';}
export function applyTheme(value){
 let settings;try{settings=getState().settings;}catch{settings={theme:value||'light'};}
 const requested=normalizeTheme(value??settings.theme);
 const mode=requested==='system'?(window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'):requested;
 document.documentElement.setAttribute('data-bs-theme',mode);document.body.dataset.theme=mode;document.documentElement.style.colorScheme=mode;
 const accent=ACCENTS[settings.accentColor]||ACCENTS.blue;const custom=/^#[0-9a-fA-F]{6}$/.test(settings.customAccentColor||'')?settings.customAccentColor:accent;document.documentElement.style?.setProperty?.('--trackerist-accent',custom);document.documentElement.style?.setProperty?.('--bs-primary',custom);document.documentElement.style?.setProperty?.('--bs-link-color',custom);
 const root=document.documentElement;root.setAttribute('data-font-size',['small','medium','large'].includes(settings.fontSize)?settings.fontSize:'medium');root.setAttribute('data-density',['compact','comfortable','spacious'].includes(settings.density)?settings.density:'comfortable');root.setAttribute('data-animations',settings.animations===false?'off':'on');root.setAttribute('data-navigation',settings.navigation||'auto');
 const toggle=document.querySelector('#theme-toggle');if(toggle){const dark=mode==='dark';toggle.setAttribute('aria-pressed',String(dark));toggle.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');toggle.title=dark?'Switch to light mode':'Switch to dark mode';const label=toggle.querySelector('.theme-button-label');if(label)label.textContent=dark?'Light':'Dark';}
 return mode;
}
export function toggleTheme(){const next=getState().settings.theme==='dark'?'light':'dark';update(s=>{s.settings.theme=next;});applyTheme(next);return next;}
