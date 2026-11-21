/* Second Brain — native (Android) bridge: real notifications even when the app is closed, back button, status bar */
'use strict';
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const NP = NATIVE ? (window.Capacitor.Plugins || {}) : {};
function nid(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h) % 2000000000; }
async function nativeSchedule() {
  const LN = NP.LocalNotifications; if (!LN) return;
  try {
    const perm = await LN.checkPermissions(); if (perm.display !== 'granted') { const r = await LN.requestPermissions(); if (r.display !== 'granted') return; }
    const pend = await LN.getPending(); if (pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
    const now = Date.now(), until = now + 14 * 864e5, list = [];
    const at = (d, hm) => new Date(d + 'T' + (hm || '09:00') + ':00');
    S.tasks.forEach(x => { if (isOpen(x) && x.due && x.time) { const w = at(x.due, x.time); if (+w > now && +w < until) list.push({ id: nid('t' + x.id + x.due + x.time), title: '⏰ ' + x.title, body: x.endTime ? x.time + ' – ' + x.endTime : t('appName'), schedule: { at: w, allowWhileIdle: true } }); } });
    S.people.forEach(p => { if (p.birthday) { const n = nextBday(p.birthday); const w = at(n, '09:00'); if (+w > now && +w < until) list.push({ id: nid('b' + p.id + n), title: '🎂 ' + tf('bday_today', { n: p.name }), body: t('appName'), schedule: { at: w } }); } });
    S.subs.forEach(s => { if (s.next) { const w = at(s.next, '10:00'); if (+w > now && +w < until) list.push({ id: nid('s' + s.id + s.next), title: '💳 ' + tf('sub_today', { n: s.title }), body: fmtNum(s.amount) + ' ' + (S.settings.currency || ''), schedule: { at: w } }); } });
    const d = S.daily[today()]; if (d && d.odFollow && !d.odFollowDone) { const w = at(today(), S.settings.followUp || '20:00'); if (+w > now) list.push({ id: nid('fu' + today()), title: '⏰ ' + t('appName'), body: t('fu_sub'), schedule: { at: w } }); }
    if (list.length) await LN.schedule({ notifications: list.slice(0, 60) });
  } catch (e) { console.warn('notif', e); }
}
if (NATIVE) {
  document.documentElement.classList.add('native');
  // re-schedule after every save (debounced)
  const _save = save; let nt;
  save = function () { _save(); clearTimeout(nt); nt = setTimeout(nativeSchedule, 2500); };
  setTimeout(nativeSchedule, 3000);
  // in-app notifications go through the system tray too
  const _notify = notifyUser;
  notifyUser = function (msg) { _notify(msg); try { NP.LocalNotifications && NP.LocalNotifications.schedule({ notifications: [{ id: nid('now' + Date.now()), title: t('appName'), body: msg }] }); } catch (e) { } };
  // hardware back button
  try { NP.App && NP.App.addListener('backButton', () => {
    if ($('#picker')) closePicker(); else if ($('#overlay') || $('#palette')) closeModal();
    else if ($('#side.open')) closeDrawer();
    else if (route.view !== 'dashboard') history.back(); else NP.App.minimizeApp && NP.App.minimizeApp();
  }); } catch (e) { }
  try { NP.StatusBar && NP.StatusBar.setBackgroundColor({ color: S.settings.theme === 'light' ? '#eef4f2' : '#081311' }); NP.StatusBar && NP.StatusBar.setStyle({ style: S.settings.theme === 'light' ? 'LIGHT' : 'DARK' }); } catch (e) { }
}
