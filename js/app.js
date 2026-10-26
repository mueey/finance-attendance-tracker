import {initStore,subscribe} from './core/store.js';
import {installMobileTables} from './core/mobile.js';
import {setRefresh,renderSettings,toast} from './core/ui.js';
import {accountExists,accountName,createAccount,signIn,signOut,isUnlocked} from './features/auth.js';
import * as dashboard from './features/dashboard.js';
import * as courses from './features/courses.js';
import * as attendance from './features/attendance.js';
import * as calendar from './features/calendar.js';
import * as fines from './features/fines.js';
import * as bills from './features/bills.js';
import * as payments from './features/payments.js';
import * as reports from './features/reports.js';
import * as settings from './features/settings.js';
const modules={dashboard,courses,attendance,calendar,fines,bills,payments,reports,settings};
const view=document.querySelector('#app-view'),shell=document.querySelector('#app-shell'),authShell=document.querySelector('#auth-shell');
const sidebar=document.querySelector('#sidebar'),backdrop=document.querySelector('#sidebar-backdrop');
const moreButton=document.querySelector('#mobile-more'),menuButton=document.querySelector('#menu-toggle');
let started=false;
function setSidebarOpen(open){
 const hadSidebarFocus=sidebar.contains(document.activeElement);
 sidebar.classList.toggle('open',open);backdrop.hidden=!open;
 moreButton?.setAttribute('aria-expanded',String(open));
 sidebar.inert=window.innerWidth<992&&!open;
 menuButton?.setAttribute('aria-expanded',String(open));
 if(open){sidebar.querySelector('.sidebar-nav .nav-link')?.focus();}
 else if(hadSidebarFocus)menuButton?.focus({preventScroll:true});
}
function closeSidebar(){setSidebarOpen(false);}
function draw(){
 if(!isUnlocked())return;
 const route=location.hash.replace(/^#\//,'').split(/[?#]/)[0],page=modules[route]?route:'dashboard';
 renderSettings();moreButton?.classList.toggle('active',!['dashboard','attendance','calendar','fines'].includes(page));document.querySelectorAll('[data-route]').forEach(a=>{const active=a.dataset.route===page;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 view.onclick=null;view.innerHTML=modules[page].render();view.querySelectorAll('[data-route]').forEach(a=>a.setAttribute('href',`#/${a.dataset.route}`));modules[page].bind();
 document.title=`${page.charAt(0).toUpperCase()+page.slice(1)} • Trackerist 2.7`;closeSidebar();
}
function connection(){const x=document.querySelector('#connection-status');if(!x)return;x.textContent=navigator.onLine?'● Ready offline':'● Offline mode';x.classList.toggle('offline',!navigator.onLine);}
function fatal(err){view.innerHTML='<div class="card"><div class="card-body"><h1 class="fs-4 text-danger">Unable to load Trackerist data</h1><p id="fatal-message"></p><p>Your browser data was not intentionally reset. Check storage permissions or recover from a prior JSON backup.</p></div></div>';view.querySelector('#fatal-message').textContent=err.message||String(err);}
function showAuth(){
 shell.classList.add('d-none');authShell.classList.remove('d-none');closeSidebar();
 const create=!accountExists();
 document.querySelector('#auth-kicker').textContent=create?'FIRST-TIME SETUP':'LOCAL ACCOUNT';
 document.querySelector('#auth-title').textContent=create?'Create your local account':'Welcome back';
 document.querySelector('#auth-subtitle').textContent=create?'Set a username and password for this browser. Existing Trackerist data will be kept.':'Sign in to continue to your attendance dashboard.';
 document.querySelector('#auth-submit').textContent=create?'Create account & open dashboard':'Sign in';
 document.querySelector('#auth-confirm-wrap').classList.toggle('d-none',!create);
 document.querySelector('#auth-password').autocomplete=create?'new-password':'current-password';
 document.querySelector('#auth-username').value=create?'':accountName();
 document.querySelector('#auth-password').value='';document.querySelector('#auth-confirm').value='';
 document.querySelector('#auth-error').classList.add('d-none');
 document.querySelector('#auth-notice').textContent=create?'This is a single-device account, not an online account. No password recovery is available. Back up your attendance data regularly.':'Login works offline. Your password is stored as a salted verifier, but local records are not encrypted.';
 document.querySelector('#auth-username').focus();
}
function openDashboard(){
 try{if(!started){initStore();subscribe(draw);setRefresh(draw);window.addEventListener('hashchange',draw);started=true;}authShell.classList.add('d-none');shell.classList.remove('d-none');draw();connection();}
 catch(err){authShell.classList.add('d-none');shell.classList.remove('d-none');fatal(err);}
}
function start(){
 const form=document.querySelector('#auth-form');
 form.onsubmit=async event=>{
  event.preventDefault();const create=!accountExists();const username=form.elements.username.value,password=form.elements.password.value;
  const error=document.querySelector('#auth-error'),submit=document.querySelector('#auth-submit');error.classList.add('d-none');
  if(create&&password!==document.querySelector('#auth-confirm').value){error.textContent='Passwords do not match.';error.classList.remove('d-none');return;}
  submit.disabled=true;try{if(create)await createAccount(username,password);else await signIn(username,password);openDashboard();}
  catch(err){error.textContent=err.message||'Login failed.';error.classList.remove('d-none');}
  finally{submit.disabled=false;}
 };
 document.querySelector('#auth-show-password').onchange=e=>{document.querySelector('#auth-password').type=e.target.checked?'text':'password';document.querySelector('#auth-confirm').type=e.target.checked?'text':'password';};
 document.querySelector('#logout-button').onclick=()=>{signOut();view.innerHTML='';const instance=bootstrap.Modal.getInstance(document.querySelector('#editor-modal'));instance?.hide();showAuth();};
 document.querySelector('#quick-attendance').onclick=()=>attendance.openAttendanceEditor();
 menuButton.onclick=()=>setSidebarOpen(!sidebar.classList.contains('open'));
 moreButton.onclick=()=>setSidebarOpen(!sidebar.classList.contains('open'));
 document.querySelector('#sidebar-close').onclick=closeSidebar;
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&sidebar.classList.contains('open')){closeSidebar();event.preventDefault();}});
 window.addEventListener('resize',()=>{if(window.innerWidth>=992)closeSidebar();});
 installMobileTables(view);
 backdrop.onclick=closeSidebar;sidebar.addEventListener('click',e=>{if(e.target.closest('[data-route]'))closeSidebar();});
 window.addEventListener('online',connection);window.addEventListener('offline',connection);
 showAuth();
 if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>console.warn('Offline service worker registration failed.'));
}
try{start();}catch(err){document.querySelector('#auth-error').textContent=err.message||String(err);document.querySelector('#auth-error').classList.remove('d-none');}
