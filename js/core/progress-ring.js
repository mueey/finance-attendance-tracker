import {html} from './utils.js';

/**
 * Accessible, SVG-based attendance ring. Rendering does not depend on a charting CDN.
 * Null rate means no recorded Present/Absent units, not 0% attendance.
 */
export function normalizedRate(rate){
  if(rate===null||rate===undefined||rate==='')return null;
  const numeric=Number(rate);
  return Number.isFinite(numeric)?Math.min(100,Math.max(0,numeric)):null;
}

export function attendanceRing(rate,{label='Attendance rate',target=null,size='overall'}={}){
  const value=normalizedRate(rate);
  const goal=normalizedRate(target);
  const below=value!==null&&goal!==null&&value<goal;
  const tone=value===null?'empty':below?'below':'good';
  const percent=value===null?'—':`${value}%`;
  const description=`${label}: ${value===null?'No recorded attendance':percent}${goal!==null?`, target ${goal}%`:''}`;
  // A target marker (short outer dash) identifies the minimum on the circular scale.
  const targetMarker=goal===null?'':`<circle class="attendance-ring-goal" cx="60" cy="60" r="55" pathLength="100" stroke-dasharray="1.2 98.8" stroke-dashoffset="${-goal}" />`;
  return `<div class="attendance-ring attendance-ring--${html(size)} attendance-ring--${tone}" role="img" aria-label="${html(description)}" data-progress="${value??0}"${goal===null?'':` data-target="${goal}"`}>
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <circle class="attendance-ring-track" cx="60" cy="60" r="48" pathLength="100" />
      <circle class="attendance-ring-progress" cx="60" cy="60" r="48" pathLength="100" stroke-dasharray="${value??0} 100" />
      ${targetMarker}
    </svg>
    <div class="attendance-ring-center" aria-hidden="true"><strong class="attendance-ring-value">${percent}</strong><span>Attendance</span></div>
  </div>`;
}
