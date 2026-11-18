/* offline cache */
const C='sb-v2';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','./css/styles.css','./js/i18n.js','./js/core.js','./js/views.js','./js/graph.js','./js/app.js','./js/i18n2.js','./js/sync.js','./js/views2.js','./vendor/supabase.js','./icon.svg','./icons/icon-192.png']).catch(()=>{})));});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp)).catch(()=>{});return r;}).catch(()=>caches.match(e.request)));});
