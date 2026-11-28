// All application scripts, Bootstrap assets and icons are local so the app works after first install.
const CACHE='trackerist-v4.5.4-calendar-reliability-fix';
const FILES=['./','./index.html','./privacy.html','./credits.html','./manifest.webmanifest','./css/app.css','./css/mobile.css','./css/theme.css','./css/bootstrap-icons-local.css','./vendor/bootstrap.min.css','./vendor/bootstrap.bundle.min.js','./vendor/bootstrap-icons/speedometer2.svg','./vendor/bootstrap-icons/journal-text.svg','./vendor/bootstrap-icons/clipboard-check.svg','./vendor/bootstrap-icons/calendar3.svg','./vendor/bootstrap-icons/cash-coin.svg','./vendor/bootstrap-icons/receipt.svg','./vendor/bootstrap-icons/credit-card.svg','./vendor/bootstrap-icons/graph-up.svg','./vendor/bootstrap-icons/gear.svg','./vendor/bootstrap-icons/house-door-fill.svg','./vendor/bootstrap-icons/journal-check.svg','./vendor/bootstrap-icons/three-dots.svg','./vendor/bootstrap-icons/list.svg','./vendor/bootstrap-icons/x-lg.svg','./vendor/bootstrap-icons/plus-circle.svg','./vendor/bootstrap-icons/box-arrow-right.svg','./vendor/bootstrap-icons/chevron-down.svg','./vendor/bootstrap-icons/bell.svg','./icons/icon-192.png','./icons/icon-512.png','./js/app.js','./js/core/utils.js','./js/core/course-picker.js','./js/core/planner.js','./js/core/productivity.js','./js/core/achievements.js','./js/core/theme.js','./js/core/profile-media.js','./js/core/schedule.js','./js/core/migrate.js','./js/core/store.js','./js/core/finance.js','./js/core/event-slots.js','./js/core/semesters.js','./js/core/semester-attendance.js','./js/core/progress-ring.js','./js/core/ui.js','./js/core/mobile.js','./js/core/reminders.js','./js/features/schedule-scan.js','./js/core/schedule-import.js','./js/core/schedule-ocr.js','./js/features/dashboard.js','./js/features/semesters.js','./js/features/auth.js','./js/features/courses.js','./js/features/planner.js','./js/features/productivity.js','./js/features/attendance.js','./js/features/calendar.js','./js/features/fines.js','./js/features/bills.js','./js/features/payments.js','./js/features/reports.js','./js/features/settings.js','./js/features/notifications.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('trackerist-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));});

// Clicking a notification action never writes storage in the service worker.
// Open/focus the app, require its local login, validate a one-time token, then save.
self.addEventListener('notificationclick',event=>{
 const action=['present','absent'].includes(event.action)?event.action:'open';
 const token=String(event.notification.data?.token||'');
 event.notification.close();
 if(!token)return;
 const target=new URL('./',self.registration.scope);
 target.hash='#/notifications?notificationIntent='+encodeURIComponent(token)+'&mark='+encodeURIComponent(action);
 event.waitUntil((async()=>{
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=clients.find(c=>c.url.startsWith(self.registration.scope));
  if(existing){
   await existing.focus();
   existing.postMessage({type:'TRACKERIST_NOTIFICATION_ACTION',token,action});
  }else{await self.clients.openWindow(target.href);}
 })());
});
