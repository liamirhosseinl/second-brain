/* offline-first cache: answer instantly from cache, refresh in background */
const C = 'sb-v3.1';
const CORE = ['./', './index.html', './css/styles.css', './js/i18n.js', './js/i18n2.js', './js/i18n3.js', './js/core.js', './js/sync.js', './js/views.js', './js/views2.js', './js/views3.js', './js/mind.js', './js/graph.js', './js/app.js', './js/native.js', './js/boot.js', './vendor/supabase.js', './icon.svg', './icons/icon-192.png', './fonts/IRANSansXFaNum-RegularD4.woff2', './fonts/IRANSansXFaNum-MediumD4.woff2', './fonts/IRANSansXFaNum-BoldD4.woff2', './fonts/Lahzeh-Bold.woff2'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).catch(() => { })); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(C).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
