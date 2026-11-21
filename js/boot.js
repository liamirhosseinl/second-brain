/* Second Brain — boot */
'use strict';
stamp(true); parseHash(); render();
requestAnimationFrame(() => setTimeout(() => { initSync(); setTimeout(checkOverdueOnOpen, 900); }, 50));
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(checkOverdueOnOpen, 600); });
if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor) navigator.serviceWorker.register('sw.js').catch(() => { });
