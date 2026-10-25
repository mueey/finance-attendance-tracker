import {initialState,migrateLegacy,validateAndNormalize} from './migrate.js';
const KEY='trackerist_v2_state';let current=null;const listeners=new Set();
export function initStore(){const raw=localStorage.getItem(KEY);if(raw){let parsed;try{parsed=JSON.parse(raw)}catch{throw Error('Saved data is not valid JSON. It has NOT been overwritten.')}current=validateAndNormalize(parsed);}else{current=localStorage.getItem('courses_cal')!==null?migrateLegacy(localStorage):initialState();persist(current);}return current;}
export function getState(){if(!current)throw Error('Storage not initialized.');return current;}
function persist(state){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){throw Error('Could not save changes. Browser storage may be full or disabled. Export a backup.');}}
export function update(mutator){const next=structuredClone(getState());mutator(next);const checked=validateAndNormalize(next);persist(checked);current=checked;listeners.forEach(fn=>fn(checked));return checked;}
export function replaceState(x){const checked=validateAndNormalize(x);persist(checked);current=checked;listeners.forEach(fn=>fn(checked));}
export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
