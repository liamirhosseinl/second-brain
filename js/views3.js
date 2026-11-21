/* Second Brain — v3: modern pickers, overdue follow-up, missed reasons, focus forest */
'use strict';
const isOpen = x => x && x.status !== 'done' && x.status !== 'cancelled';

/* =================== DATE / TIME PICKER =================== */
const hm2m = s => { if (!s) return null; const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
const m2hm = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
function durLabel(min) { if (!min || min <= 0) return ''; const h = Math.floor(min / 60), m = min % 60; return L === 'fa' ? [h ? h + ' ساعت' : '', m ? m + ' دقیقه' : ''].filter(Boolean).join(' و ') : [h ? h + 'h' : '', m ? m + 'm' : ''].filter(Boolean).join(' '); }
function pickLabel(kind, v, v2) {
  if (kind === 'date') return v ? `${ic('calendar', 'sm')}<span>${esc(relDay(v))}</span><small>${esc(fmtDate(v, { day: 'numeric', month: 'long' }))}</small>` : `${ic('calendar', 'sm')}<span class="muted">${t('pick_date')}</span>`;
  if (kind === 'time') return v ? `${ic('clock', 'sm')}<span class="ltr">${esc(v)}</span>` : `${ic('clock', 'sm')}<span class="muted">${t('pick_time')}</span>`;
  if (!v) return `${ic('clock', 'sm')}<span class="muted">${t('pick_time')}</span>`;
  const d = v2 ? hm2m(v2) - hm2m(v) : 0;
  return `${ic('clock', 'sm')}<span class="ltr">${esc(v)}${v2 ? ' → ' + esc(v2) : ''}</span>${d > 0 ? `<small>${durLabel(d)}</small>` : ''}`;
}
function pickField(kind, name, v, v2 = '') {
  if (kind === 'timerange') return `<div class="pick-wrap"><input type="hidden" name="time" value="${esc(v)}"><input type="hidden" name="endTime" value="${esc(v2)}"><button type="button" class="pick-btn" data-act="pick" data-kind="timerange">${pickLabel(kind, v, v2)}</button></div>`;
  return `<div class="pick-wrap"><input type="hidden" name="${name}" value="${esc(v)}"><button type="button" class="pick-btn" data-act="pick" data-kind="${kind}">${pickLabel(kind, v)}</button></div>`;
}
let PK = null;
function closePicker() { if (PK) { PK.el.remove(); document.removeEventListener('mousedown', PK.out, true); PK = null; } }
function openPicker(anchor, kind, vals, cb) {
  closePicker();
  const el = document.createElement('div'); el.className = 'picker'; el.id = 'picker'; el.dir = document.documentElement.dir;
  document.body.appendChild(el);
  const st = { kind, ref: vals[0] && kind === 'date' ? vals[0] : today(), sel: vals[0] || '', start: kind !== 'date' ? (vals[0] || '') : '', end: vals[1] || '', tab: 'start' };
  if (kind === 'time') st.start = vals[0] || '';
  const out = e => { if (!el.contains(e.target) && !anchor.contains(e.target)) closePicker(); };
  PK = { el, out, anchor };
  setTimeout(() => document.addEventListener('mousedown', out, true), 0);
  const done = v => { cb(v); closePicker(); };
  const place = () => {
    const sheet = window.innerWidth < 640; el.classList.toggle('sheet', sheet);
    if (sheet) { el.style.cssText = ''; return; }
    const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    let top = r.bottom + 8; if (top + h > window.innerHeight - 10) top = Math.max(10, r.top - h - 8);
    let left = document.documentElement.dir === 'rtl' ? r.right - w : r.left; left = clamp(left, 10, window.innerWidth - w - 10);
    el.style.top = top + 'px'; el.style.left = left + 'px';
  };
  const draw = () => {
    if (kind === 'date') {
      const days = monthDays(st.ref), lead = (new Date(days[0] + 'T00:00:00').getDay() - (L === 'fa' ? 6 : 1) + 7) % 7;
      const wkEnd = (() => { let d = today(); for (let i = 0; i < 7; i++) { if (new Date(d + 'T00:00:00').getDay() === (L === 'fa' ? 5 : 6)) return d; d = addDays(d, 1); } return d; })();
      const q = [['today', today()], ['tomorrow', addDays(today(), 1)], ['pk_weekend', wkEnd], ['pk_nextweek', addDays(weekStart(today()), 7)]];
      el.innerHTML = `<div class="pk-quick">${q.map(([k, v]) => `<button class="pk-chip ${st.sel === v ? 'on' : ''}" data-v="${v}"><b>${t(k)}</b><small>${fmtDate(v, { weekday: 'short' })}</small></button>`).join('')}</div>
        <div class="pk-head"><button class="icon-btn sm" data-nav="-1">${ic('chevL', 'sm flip')}</button><b>${monthLabel(st.ref)}</b><button class="icon-btn sm" data-nav="1">${ic('chevR', 'sm flip')}</button></div>
        <div class="pk-grid">${weekDays(days[0]).map(x => `<span class="pk-wd">${weekday(x, 'narrow')}</span>`).join('')}${'<span></span>'.repeat(lead)}
        ${days.map(x => `<button class="pk-day ${x === today() ? 'today' : ''} ${x === st.sel ? 'on' : ''} ${x < today() ? 'past' : ''}" data-v="${x}">${fmtDate(x, { day: 'numeric' })}</button>`).join('')}</div>
        <div class="pk-foot"><span class="small muted">${st.sel ? fmtDate(st.sel, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + fmtDateAlt(st.sel) : ''}</span><button class="btn ghost sm" data-v="">${t('pk_clear')}</button></div>`;
    } else {
      const cur = st.tab === 'end' ? st.end : st.start; const ch = cur ? +cur.split(':')[0] : -1, cm = cur ? +cur.split(':')[1] : -1;
      const range = kind === 'timerange'; const dur = st.start && st.end ? hm2m(st.end) - hm2m(st.start) : 0;
      el.innerHTML = `${range ? `<div class="pk-tabs"><button class="${st.tab === 'start' ? 'on' : ''}" data-tab="start"><small>${t('f_start')}</small><b class="ltr">${st.start || '--:--'}</b></button><span class="pk-arrow">${ic('send', 'sm')}</span><button class="${st.tab === 'end' ? 'on' : ''}" data-tab="end"><small>${t('f_end')}</small><b class="ltr">${st.end || '--:--'}</b></button></div>
        ${dur > 0 ? `<div class="pk-dur">${ic('timer', 'sm')} ${durLabel(dur)}</div>` : ''}` : `<div class="pk-big ltr">${cur || '--:--'}</div>`}
        <div class="pk-label">${t('pk_hour')}</div><div class="pk-hours ltr">${Array.from({ length: 24 }, (_, h) => `<button class="${h === ch ? 'on' : ''} ${h < 6 ? 'night' : ''}" data-h="${h}">${String(h).padStart(2, '0')}</button>`).join('')}</div>
        <div class="pk-label">${t('pk_minute')}</div><div class="pk-mins ltr">${Array.from({ length: 12 }, (_, i) => i * 5).map(m => `<button class="${m === cm ? 'on' : ''}" data-m="${m}">${String(m).padStart(2, '0')}</button>`).join('')}</div>
        ${range && st.tab === 'end' && st.start ? `<div class="pk-quick" style="margin-top:10px">${[15, 30, 45, 60, 90, 120, 180].map(d => `<button class="pk-chip" data-dur="${d}"><b>+${durLabel(d)}</b></button>`).join('')}</div>` :
          `<div class="pk-quick" style="margin-top:10px">${[['🌅', '08:00'], ['☀️', '10:00'], ['🍽', '13:00'], ['🌤', '16:00'], ['🌆', '19:00'], ['🌙', '22:00']].map(([e, v]) => `<button class="pk-chip" data-q="${v}"><b>${e} <span class="ltr">${v}</span></b></button>`).join('')}</div>`}
        <div class="pk-foot"><button class="btn ghost sm" data-clear>${t('pk_clear')}</button><button class="btn primary sm" data-ok>${t('pk_done')}</button></div>`;
    }
    place();
  };
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; e.preventDefault();
    if (kind === 'date') {
      if (b.dataset.nav) { st.ref = +b.dataset.nav < 0 ? addDays(monthStart(st.ref), -1) : addDays(monthDays(st.ref).slice(-1)[0], 1); draw(); return; }
      if (b.dataset.v !== undefined) done([b.dataset.v]); return;
    }
    const key = st.tab === 'end' ? 'end' : 'start';
    const setV = v => { st[key] = v; if (kind === 'timerange' && key === 'start' && (!st.end || hm2m(st.end) <= hm2m(v))) st.end = m2hm(hm2m(v) + 60); };
    if (b.dataset.tab) st.tab = b.dataset.tab;
    else if (b.dataset.h) { const m = st[key] ? +st[key].split(':')[1] : 0; setV(String(b.dataset.h).padStart(2, '0') + ':' + String(m).padStart(2, '0')); }
    else if (b.dataset.m) { const h = st[key] ? +st[key].split(':')[0] : 9; setV(String(h).padStart(2, '0') + ':' + String(b.dataset.m).padStart(2, '0')); if (kind === 'timerange' && key === 'start') st.tab = 'end'; else if (kind === 'time') { done([st.start]); return; } }
    else if (b.dataset.q) { setV(b.dataset.q); if (kind === 'time') { done([st.start]); return; } if (key === 'start') st.tab = 'end'; }
    else if (b.dataset.dur) { st.end = m2hm(hm2m(st.start) + +b.dataset.dur); done([st.start, st.end]); return; }
    else if (b.hasAttribute('data-clear')) { done(['', '']); return; }
    else if (b.hasAttribute('data-ok')) { done(kind === 'time' ? [st.start] : [st.start, st.end]); return; }
    draw();
  });
  draw();
}
ACT.pick = el => {
  const wrap = el.closest('.pick-wrap'); const ins = wrap.querySelectorAll('input[type=hidden]'); const kind = el.dataset.kind;
  openPicker(el, kind, [...ins].map(i => i.value), v => { ins.forEach((inp, i) => { inp.value = v[i] ?? ''; inp.dispatchEvent(new Event('change', { bubbles: true })); }); el.innerHTML = pickLabel(kind, ins[0].value, ins[1]?.value); });
};
/* direct pickers that edit a task in place (reschedule list) */
ACT.pickTask = el => {
  const x = S.tasks.find(y => y.id === el.dataset.id); if (!x) return; const kind = el.dataset.kind;
  openPicker(el, kind, kind === 'date' ? [x.due || ''] : [x.time || '', x.endTime || ''], v => {
    if (kind === 'date') { x.due = v[0]; delete x.inbox; } else { x.time = v[0]; x.endTime = v[1] || ''; }
    save(); if ($('#rsModal')) openReschedule(); else render();
  });
};

/* =================== MISSED (NOT DONE) WITH REASON =================== */
const REASONS = [['no_time', '⏳'], ['low_energy', '🔋'], ['forgot', '🫥'], ['procrastination', '🐢'], ['blocked', '🧱'], ['unexpected', '⚡'], ['priority_changed', '🔀'], ['too_big', '🏔'], ['other', '💬']];
function openMissed(id, after) {
  const x = S.tasks.find(y => y.id === id); if (!x) return;
  const st = { reason: '', next: 'tomorrow', date: addDays(today(), 1) };
  const o = openModal(`<div class="modal-h"><h2>🙅 ${t('missed_title')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div>
    <div class="miss-task"><b>${esc(x.title)}</b>${(x.missed || []).length ? `<span class="chip red">${tf('missed_times', { n: x.missed.length })}</span>` : ''}</div>
    <div class="field"><label>${t('missed_why')}</label><div class="reason-grid">${REASONS.map(([k, e]) => `<button type="button" class="reason" data-r="${k}"><span>${e}</span>${t('rs_' + k)}</button>`).join('')}</div></div>
    <div class="field"><label>${t('missed_note')}</label><input class="input" id="msNote" placeholder="${esc(t('missed_note_ph'))}"></div>
    <div class="field"><label>${t('missed_next')}</label><div class="reason-grid next">
      <button type="button" class="reason on" data-n="tomorrow">📅 ${t('tomorrow')}</button><button type="button" class="reason" data-n="pick">🗓 ${t('pick_date')}</button>
      <button type="button" class="reason" data-n="keep">⏸ ${t('missed_keep')}</button><button type="button" class="reason" data-n="cancel">🗑 ${t('missed_cancel')}</button></div><div id="msPick"></div></div>
    <div class="modal-f"><span class="sp"></span><button class="btn" data-close>${t('cancel')}</button><button class="btn primary" id="msSave">${t('save')}</button></div>`);
  const back = () => { closeModal(); after ? after() : render(); };
  o.querySelectorAll('[data-close]').forEach(b => b.onclick = back);
  o.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { st.reason = b.dataset.r; o.querySelectorAll('[data-r]').forEach(y => y.classList.toggle('on', y === b)); });
  o.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { st.next = b.dataset.n; o.querySelectorAll('[data-n]').forEach(y => y.classList.toggle('on', y === b));
    if (st.next === 'pick') { $('#msPick').innerHTML = `<div style="margin-top:8px">${pickField('date', 'msDate', st.date)}</div>`; $('#msPick input').addEventListener('change', e => st.date = e.target.value); } else $('#msPick').innerHTML = ''; });
  o.querySelector('#msSave').onclick = () => {
    if (!st.reason) { o.querySelector('.reason-grid').classList.add('shake'); setTimeout(() => o.querySelector('.reason-grid')?.classList.remove('shake'), 500); toast(t('missed_pick_reason'), 'err'); return; }
    (x.missed = x.missed || []).push({ date: x.due || today(), at: today(), reason: st.reason, note: $('#msNote').value.trim() });
    if (st.next === 'tomorrow') x.due = addDays(today(), 1);
    else if (st.next === 'pick') x.due = st.date || x.due;
    else if (st.next === 'cancel') { x.status = 'cancelled'; x.doneAt = Date.now(); }
    delete x.inbox; save(); toast(t('missed_saved')); back();
  };
}
ACT.missed = el => openMissed(el.dataset.id, $('#rsModal') ? openReschedule : null);

/* =================== OVERDUE PROMPT + FOLLOW-UP =================== */
const overdueTasks = () => S.tasks.filter(x => isOpen(x) && x.due && x.due < today());
let RS_IDS = [];
function promptOverdue(followUp) {
  const list = followUp ? RS_IDS.map(id => S.tasks.find(x => x.id === id)).filter(x => x && isOpen(x) && x.due && x.due <= today()) : overdueTasks();
  if (!list.length) return;
  const allY = list.every(x => x.due === addDays(today(), -1));
  const o = openModal(`<div class="od-hero">${followUp ? '⏰' : '🌅'}</div>
    <h2 class="od-title">${followUp ? tf('fu_title', { n: list.length }) : tf(allY ? 'od_title_y' : 'od_title', { n: list.length })}</h2>
    <p class="od-sub">${followUp ? t('fu_sub') : t('od_sub')}</p>
    <div class="od-list">${list.slice(0, 5).map(x => `<div><span class="prio p${x.priority || 3}"></span><span>${esc(x.title)}</span><small>${relDay(x.due)}</small></div>`).join('')}${list.length > 5 ? `<div class="muted small">+${list.length - 5}</div>` : ''}</div>
    <div class="od-acts"><button class="btn primary" id="odPlan">${ic('calendar', 'sm')}${followUp ? t('fu_plan') : t('od_plan')}</button>
    ${followUp ? `<button class="btn" id="odTmr">📅 ${t('sd_all_tomorrow')}</button>` : ''}
    <button class="btn ghost" id="odSelf">${followUp ? t('fu_later') : t('od_self')}</button></div>`, 'od-modal');
  RS_IDS = list.map(x => x.id);
  o.querySelector('#odPlan').onclick = () => openReschedule();
  o.querySelector('#odTmr')?.addEventListener('click', () => { list.forEach(x => x.due = addDays(today(), 1)); closeModal(); commit(t('saved')); });
  o.querySelector('#odSelf').onclick = () => {
    const d = S.daily[today()] = S.daily[today()] || {};
    if (!followUp) { d.odFollow = RS_IDS.slice(); d.odFollowDone = 0; save();
      const m = openModal(`<div class="od-hero">👌</div><h2 class="od-title">${t('od_ok_title')}</h2><p class="od-sub">${tf('od_ok_sub', { t: S.settings.followUp || '20:00' })}</p><div class="od-acts"><button class="btn primary" data-close>${t('od_ok_btn')}</button></div>`, 'od-modal');
      m.querySelector('[data-close]').onclick = () => { closeModal(); render(); };
    } else { closeModal(); render(); }
  };
}
function checkOverdueOnOpen() {
  if ($('#overlay') || $('#palette') || route.view === 'mind') return;
  const d = S.daily[today()] = S.daily[today()] || {};
  if (d.odAsked) return;
  if (!overdueTasks().length) return;
  d.odAsked = 1; save(); promptOverdue(false);
}
function checkFollowUp() {
  const d = S.daily[today()]; if (!d || !d.odFollow || d.odFollowDone) return;
  const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes();
  if (nowM < hm2m(S.settings.followUp || '20:00')) return;
  if ($('#overlay') || $('#palette')) return;
  d.odFollowDone = 1; save();
  RS_IDS = d.odFollow;
  const left = RS_IDS.map(id => S.tasks.find(x => x.id === id)).filter(x => x && isOpen(x) && x.due && x.due <= today());
  if (left.length) { notifyUser(tf('fu_title', { n: left.length })); promptOverdue(true); }
  else notifyUser(t('fu_all_done'));
}
setInterval(checkFollowUp, 30000);
function openReschedule() {
  const ids = RS_IDS.length ? RS_IDS : overdueTasks().map(x => x.id); RS_IDS = ids;
  const list = ids.map(id => S.tasks.find(x => x.id === id)).filter(Boolean);
  const keepScroll = $('#overlay .modal')?.scrollTop || 0;
  const o = openModal(`<div class="modal-h"><h2>🗓 ${t('rs_title')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div>
    <p class="small muted" style="margin-top:-8px">${t('rs_sub')}</p>
    <div id="rsModal">${list.map(x => { const ok = x.status === 'done', cx = x.status === 'cancelled', fixed = isOpen(x) && x.due >= today();
      return `<div class="rs-row ${ok || cx ? 'closed' : fixed ? 'fixed' : ''}">
        <div class="rs-top"><span class="prio p${x.priority || 3}"></span><b>${esc(x.title)}</b>${ok ? `<span class="chip teal">✓ ${t('st_done')}</span>` : cx ? `<span class="chip">${t('st_cancelled')}</span>` : fixed ? `<span class="chip teal">✓ ${t('rs_fixed')}</span>` : `<span class="chip red">${relDay(x.due)}</span>`}${(x.missed || []).length ? `<span class="chip gold">${tf('missed_times', { n: x.missed.length })}</span>` : ''}</div>
        ${ok || cx ? '' : `<div class="rs-ctrl"><button class="pick-btn" data-act="pickTask" data-kind="date" data-id="${x.id}">${pickLabel('date', x.due)}</button><button class="pick-btn" data-act="pickTask" data-kind="timerange" data-id="${x.id}">${pickLabel('timerange', x.time, x.endTime)}</button>
        <div class="rs-quick"><button class="btn sm" data-act="rsSet" data-id="${x.id}" data-d="0">${t('today')}</button><button class="btn sm" data-act="rsSet" data-id="${x.id}" data-d="1">${t('tomorrow')}</button><button class="btn sm" data-act="rsSet" data-id="${x.id}" data-d="7">${t('pk_nextweek')}</button>
        <button class="btn sm" data-act="rsDone" data-id="${x.id}" title="${t('st_done')}">${ic('check', 'sm')}</button><button class="btn sm danger" data-act="missed" data-id="${x.id}">🙅 ${t('missed_btn')}</button></div></div>`}</div>`; }).join('') || emptyBox(t('all_good'))}</div>
    <div class="modal-f" style="margin-top:14px"><button class="btn" data-act="rsAllTmr">📅 ${t('sd_all_tomorrow')}</button><span class="sp"></span><button class="btn primary" data-close>${t('pk_done')}</button></div>`, 'wide');
  o.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { closeModal(); render(); });
  o.querySelector('.modal').scrollTop = keepScroll;
}
ACT.rsSet = el => { const x = S.tasks.find(y => y.id === el.dataset.id); if (x) { x.due = addDays(today(), +el.dataset.d); delete x.inbox; save(); openReschedule(); } };
ACT.rsDone = el => { const x = S.tasks.find(y => y.id === el.dataset.id); if (x) { toggleTask(x.id); openReschedule(); } };
ACT.rsAllTmr = () => { RS_IDS.forEach(id => { const x = S.tasks.find(y => y.id === id); if (x && isOpen(x)) x.due = addDays(today(), 1); }); save(); openReschedule(); };
ACT.reschedule = () => { RS_IDS = []; openReschedule(); };

/* missed-reasons analytics (used by insights) */
function missedSection() {
  const since = addDays(today(), -60); const all = [];
  S.tasks.forEach(x => (x.missed || []).forEach(m => { if ((m.at || m.date) >= since) all.push({ ...m, x }); }));
  const by = {}; all.forEach(m => by[m.reason] = (by[m.reason] || 0) + 1);
  const rs = REASONS.filter(([k]) => by[k]).sort((a, b) => by[b[0]] - by[a[0]]); const mx = Math.max(1, ...Object.values(by));
  const byArea = {}; all.forEach(m => areasOf(m.x).forEach(a => byArea[a] = (byArea[a] || 0) + 1));
  const topA = Object.entries(byArea).sort((a, b) => b[1] - a[1])[0];
  const repeat = S.tasks.filter(x => isOpen(x) && (x.missed || []).length >= 2);
  return `<div class="bento" style="margin-top:16px"><section class="card s7"><div class="card-h"><h3>🙅 ${t('missed_analysis')}</h3><span class="chip" style="margin-inline-start:auto">${tf('missed_count', { n: all.length })}</span></div>
    ${rs.length ? rs.map(([k, e]) => `<div class="catbar"><span class="small">${e} ${t('rs_' + k)}</span><div class="progress"><i style="width:${by[k] / mx * 100}%;background:var(--red)"></i></div><span class="small num muted">${by[k]}</span></div>`).join('') : emptyBox(t('missed_none'))}</section>
    <section class="card s5"><div class="card-h"><h3>${ic('bulb')}${t('missed_lessons')}</h3></div>
    ${rs.length ? `<div class="insight">${ic('bolt', 'sm')}<span>${tf('missed_top', { r: t('rs_' + rs[0][0]) })} ${t('missed_tip_' + rs[0][0]) || ''}</span></div>` : ''}
    ${topA ? `<div class="insight">${ic('bolt', 'sm')}<span>${tf('missed_area', { a: esc(areaName(area(topA[0]))) })}</span></div>` : ''}
    ${repeat.length ? `<div class="insight">${ic('bolt', 'sm')}<span>${tf('missed_repeat', { n: repeat.length })}<br>${repeat.slice(0, 3).map(x => `<b>${esc(x.title)}</b>`).join('، ')}</span></div>` : ''}
    ${!all.length ? emptyBox(t('missed_none')) : ''}</section></div>`;
}

/* =================== FOCUS FOREST =================== */
const SPECIES = { pine: 0, oak: 120, cherry: 200, cactus: 150, palm: 250, bamboo: 300, maple: 400, lavender: 500 };
const DEF_TAGS = () => [['work', '#e9c78f'], ['study', '#8ec5ff'], ['content', '#f3a6c8'], ['coding', '#5eead4'], ['reading', '#b9a2ff'], ['other', '#74e3a9']].map(([k, c]) => ({ id: k, name: t('ftag_' + k), color: c }));
const ftags = () => S.forest.tags || DEF_TAGS();
function treeSVG(sp, p, dead, size = 120) {
  p = clamp(p, 0, 1);
  const leaf = dead ? '#8b7a55' : null, trunk = dead ? '#5b4630' : '#7a5232';
  const island = `<ellipse cx="60" cy="122" rx="44" ry="11" fill="${dead ? '#6b5a3e' : '#3f7d4e'}"/><ellipse cx="60" cy="119" rx="44" ry="10" fill="${dead ? '#857150' : '#5fae5c'}"/><path d="M16 120 Q60 150 104 120 L104 124 Q60 156 16 124Z" fill="${dead ? '#4d3d28' : '#6b4a2e'}"/>`;
  let body = '';
  if (p < 0.12) {
    const s = 0.4 + p * 5;
    body = `<g transform="translate(60 118) scale(${s})"><path d="M0 0 V-14" stroke="${dead ? trunk : '#4c8a3b'}" stroke-width="2.4" stroke-linecap="round"/><path d="M0 -10 C-10 -16 -14 -8 -12 -6 C-6 -5 -2 -7 0 -10Z" fill="${leaf || '#7ed36b'}"/><path d="M0 -13 C10 -20 14 -11 12 -9 C6 -8 2 -10 0 -13Z" fill="${leaf || '#9be283'}"/></g>`;
  } else {
    const s = 0.35 + 0.65 * Math.min(1, (p - 0.12) / 0.88);
    const g = inner => `<g transform="translate(60 119) scale(${s}) translate(-60 -119)">${inner}</g>`;
    const T = (h, w = 7) => `<path d="M${60 - w / 2} 119 L${60 - w / 2 + 1.5} ${119 - h} L${60 + w / 2 - 1.5} ${119 - h} L${60 + w / 2} 119Z" fill="${trunk}"/>`;
    const C = (cx, cy, r, c) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${leaf || c}"/>`;
    const shine = (cx, cy, r) => dead ? '' : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" opacity=".18"/>`;
    switch (sp) {
      case 'oak': body = g(T(42, 9) + C(60, 62, 30, '#4fa84a') + C(40, 74, 20, '#5cb853') + C(80, 74, 20, '#5cb853') + C(60, 48, 20, '#6cc95f') + shine(52, 50, 8)); break;
      case 'cherry': body = g(T(40, 7) + C(60, 64, 28, '#f39abb') + C(42, 76, 18, '#f7b2cb') + C(78, 76, 18, '#f7b2cb') + C(60, 50, 18, '#fbc6d8') + (dead ? '' : [[48, 58], [70, 66], [58, 78], [66, 48], [44, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#fff"/>`).join(''))); break;
      case 'cactus': { const c = leaf || '#4fb36b'; body = g(`<rect x="52" y="50" width="16" height="69" rx="8" fill="${c}"/><path d="M52 86 H40 V66" stroke="${c}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M68 78 H80 V60" stroke="${c}" stroke-width="10" stroke-linecap="round" fill="none"/>` + (dead ? '' : `<circle cx="60" cy="49" r="5" fill="#ff7aa8"/><path d="M57 60 V110 M63 60 V110" stroke="#fff" stroke-opacity=".15"/>`)); break; }
      case 'palm': { const c = leaf || '#45b062'; body = g(`<path d="M58 119 C54 95 62 75 64 52" stroke="${trunk}" stroke-width="8" fill="none" stroke-linecap="round"/>` + [-150, -110, -70, -30, 10].map(a => `<path d="M64 52 q${Math.cos(a * Math.PI / 180) * 18} ${Math.sin(a * Math.PI / 180) * 18 - 6} ${Math.cos(a * Math.PI / 180) * 34} ${Math.sin(a * Math.PI / 180) * 30 + 10}" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>`).join('') + (dead ? '' : `<circle cx="61" cy="57" r="3.4" fill="#8a5a2b"/><circle cx="67" cy="58" r="3.4" fill="#8a5a2b"/>`)); break; }
      case 'bamboo': { const c = leaf || '#7cc46a'; body = g([46, 60, 74].map((x, i) => { const h = 70 + i % 2 * 14; return `<rect x="${x - 3.5}" y="${119 - h}" width="7" height="${h}" rx="3" fill="${leaf || '#8fd16f'}"/>` + [1, 2, 3].map(k => `<rect x="${x - 4.5}" y="${119 - h * k / 4}" width="9" height="2.5" fill="${dead ? '#5b4630' : '#5e9e48'}"/>`).join('') + `<path d="M${x} ${119 - h + 6} q10 -8 16 -4 q-8 2 -16 4" fill="${c}"/>`; }).join('')); break; }
      case 'maple': body = g(T(40, 8) + C(60, 62, 28, '#f08a3c') + C(42, 74, 19, '#f5a04f') + C(78, 74, 19, '#e8742d') + C(60, 47, 18, '#ffb35c') + shine(52, 50, 7)); break;
      case 'lavender': { const c = leaf || '#a98bf0'; body = g([-22, -11, 0, 11, 22].map((dx, i) => `<path d="M${60 + dx * .4} 119 Q${60 + dx * .7} 100 ${60 + dx} ${70 + Math.abs(dx)}" stroke="${dead ? trunk : '#5f9a52'}" stroke-width="2.5" fill="none"/>` + [0, 1, 2, 3, 4].map(k => `<ellipse cx="${60 + dx}" cy="${70 + Math.abs(dx) - k * 5}" rx="3.6" ry="4.4" fill="${c}"/>`).join('')).join('')); break; }
      default: body = g(T(30, 7) + `<path d="M60 22 L88 62 H74 L94 88 H26 L46 62 H32Z" fill="${leaf || '#3fae6a'}"/><path d="M60 22 L74 42 L60 46Z" fill="#fff" opacity="${dead ? 0 : .14}"/><path d="M26 88 H94 L86 96 H34Z" fill="${leaf || '#2f8e56'}"/>`);
    }
  }
  return `<svg viewBox="0 0 120 140" width="${size}" height="${size * 140 / 120}" class="tree-svg">${island}${body}</svg>`;
}
/* 7-segment digital clock */
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcfgd' };
const SEGP = { a: 'M6 2h28l-5 5H11z', b: 'M35 3l3 4v24l-4 3-4-3V8z', c: 'M35 37l3 3v24l-3 4-5-5V40z', d: 'M6 68l5-5h18l5 5z', e: 'M5 37l5 3v23l-5 5-3-4V40z', f: 'M5 3l5 5v23l-4 3-4-3V7z', g: 'M7 35l4-3h18l4 3-4 3H11z' };
function digital(str, cls = '') {
  let x = 0, out = '';
  for (const ch of str) {
    if (ch === ':') { out += `<g transform="translate(${x} 0)" class="seg-colon"><circle cx="7" cy="22" r="3.6"/><circle cx="7" cy="48" r="3.6"/></g>`; x += 16; continue; }
    const on = SEG[ch] || '';
    out += `<g transform="translate(${x} 0)">${Object.entries(SEGP).map(([k, d]) => `<path d="${d}" class="${on.includes(k) ? 'on' : 'off'}"/>`).join('')}</g>`; x += 46;
  }
  return `<svg class="digital ${cls}" viewBox="-2 0 ${x + 2} 70" preserveAspectRatio="xMidYMid meet" dir="ltr">${out}</svg>`;
}
/* ambient sound (generated, no files) */
const AMB = { ctx: null, src: null, gain: null };
function ambStart(kind) {
  ambStop(); if (!kind || kind === 'none') return;
  try {
    const ctx = AMB.ctx = AMB.ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx.resume();
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (kind === 'rain') d[i] = w * .5 + (Math.random() < .0009 ? (Math.random() - .5) * 2 : 0); else { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = kind === 'rain' ? 'bandpass' : 'lowpass'; f.frequency.value = kind === 'rain' ? 1800 : kind === 'wind' ? 500 : 900; f.Q.value = kind === 'rain' ? .4 : .7;
    const g = ctx.createGain(); g.gain.value = kind === 'rain' ? .18 : .5;
    if (kind === 'wind') { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .08; lg.gain.value = .25; lfo.connect(lg); lg.connect(g.gain); lfo.start(); }
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(); AMB.src = src; AMB.gain = g;
  } catch (e) { }
}
function ambStop() { try { AMB.src && AMB.src.stop(); } catch (e) { } AMB.src = null; }

/* timer engine (extends F from core) */
F.dead = false; F.startedAt = 0;
function plantStart() {
  if (F.running) return; F.mode = F.mode === 'break' ? 'break' : 'focus'; F.dead = false;
  if (F.left <= 0 || F.left > F.total) F.left = F.total;
  F.startedAt = F.startedAt || Date.now(); focusStart(); ambStart(S.forest.sound);
}
function plantGiveUp() {
  confirmBox(t('fr_giveup_q'), () => {
    const mins = Math.floor((F.total - F.left) / 60);
    clearInterval(F.iv); F.running = false; ambStop();
    if (F.mode === 'focus') S.focus.push({ id: uid(), date: today(), minutes: mins, taskId: F.taskId, tag: F.tag || '', species: S.forest.species, dead: true, at: Date.now() });
    F.left = F.total; F.startedAt = 0; commit(t('fr_dead'));
  });
}
const _focusTick = focusTick;
focusTick = function () {
  const was = F.running; F.left = Math.max(0, Math.round((F.end - Date.now()) / 1000));
  if (F.left <= 0 && was) {
    clearInterval(F.iv); F.running = false; ambStop();
    if (F.mode === 'focus') { const mins = Math.round(F.total / 60); S.focus.push({ id: uid(), date: today(), minutes: mins, taskId: F.taskId, tag: F.tag || '', species: S.forest.species, dead: false, at: Date.now() }); S.forest.coins = (S.forest.coins || 0) + mins; }
    F.left = F.total; F.startedAt = 0; save(); sparkle(); setTimeout(sparkle, 260);
    notifyUser(F.mode === 'focus' ? t('fr_grown') : t('fr_break_done'));
    if (F.mode === 'focus') { F.mode = 'break'; F.total = F.left = 5 * 60; } else { F.mode = 'focus'; F.total = F.left = (S.forest.lastMin || 25) * 60; }
    render(); return;
  }
  updateFocusUI();
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { F.hiddenAt = Date.now(); return; }
  if (F.running && F.mode === 'focus' && S.forest.strict && F.hiddenAt && Date.now() - F.hiddenAt > 10000 && F.left > 0) {
    const mins = Math.floor((F.total - F.left) / 60); clearInterval(F.iv); F.running = false; ambStop();
    S.focus.push({ id: uid(), date: today(), minutes: mins, taskId: F.taskId, tag: F.tag || '', species: S.forest.species, dead: true, at: Date.now() });
    F.left = F.total; F.startedAt = 0; save(); render();
    const o = openModal(`<div class="od-hero">${treeSVG(S.forest.species, .8, true, 90)}</div><h2 class="od-title">${t('fr_withered')}</h2><p class="od-sub">${t('fr_withered_sub')}</p><div class="od-acts"><button class="btn primary" data-close>${t('od_ok_btn')}</button></div>`, 'od-modal');
    o.querySelector('[data-close]').onclick = closeModal;
  }
  F.hiddenAt = 0;
});
const _updateFocusUI = updateFocusUI;
let lastTreeP = -1;
updateFocusUI = function () {
  _updateFocusUI();
  const p = 1 - F.left / F.total;
  $$('.f-digits').forEach(el => { el.innerHTML = digital(mmss(F.left)); el.classList.toggle('running', F.running); });
  if (Math.abs(p - lastTreeP) > .004 || !F.running) { lastTreeP = p; $$('.f-tree').forEach(el => el.innerHTML = F.mode === 'break' ? `<div class="break-cup">☕</div>` : treeSVG(S.forest.species, F.running || F.left < F.total ? p : 1, false, +el.dataset.size || 160)); }
  $$('.f-btn').forEach(b => b.innerHTML = F.running ? `🏳️ ${t('fr_giveup')}` : (F.left < F.total ? `${ic('play')} ${t('fr_resume')}` : `🌱 ${F.mode === 'break' ? t('fr_break_start') : t('fr_plant')}`));
  $$('.f-btn').forEach(b => b.classList.toggle('danger', F.running && F.mode === 'focus'));
  $$('.f-lock').forEach(el => el.classList.toggle('hide', F.running));
};
ACT.plant = () => { if (F.running) { if (F.mode === 'break') { clearInterval(F.iv); F.running = false; F.mode = 'focus'; F.total = F.left = (S.forest.lastMin || 25) * 60; render(); } else plantGiveUp(); } else plantStart(); };
ACT.fMin = el => { if (F.running) return; F.mode = 'focus'; const m = clamp(+el.dataset.m, 5, 180); S.forest.lastMin = m; F.total = F.left = m * 60; save(); render(); };
ACT.fSpecies = el => { if (F.running) return; S.forest.species = el.dataset.v; save(); render(); };
ACT.fBuy = el => { const k = el.dataset.v, price = SPECIES[k]; if ((S.forest.coins || 0) < price) { toast(t('fr_nocoins'), 'err'); return; }
  S.forest.coins -= price; S.forest.unlocked = [...new Set([...(S.forest.unlocked || ['pine']), k])]; S.forest.species = k; sparkle(); commit(tf('fr_unlocked', { s: t('sp_' + k) })); };
ACT.fTag = el => { F.tag = el.dataset.v === F.tag ? '' : el.dataset.v; render(); };
ACT.fPeriod = el => { UI.fPeriod = el.dataset.v; render(); };
CH.fRange = el => { if (F.running) return; const m = +el.value; S.forest.lastMin = m; F.mode = 'focus'; F.total = F.left = m * 60; save(); updateFocusUI(); const lab = $('#fMinLab'); if (lab) lab.textContent = m; };
IN.fRange = el => { if (F.running) return; const m = +el.value; F.mode = 'focus'; F.total = F.left = m * 60; updateFocusUI(); const lab = $('#fMinLab'); if (lab) lab.textContent = m; };
CH.fStrict = el => { S.forest.strict = el.checked; save(); };
CH.fSound = el => { S.forest.sound = el.value; save(); if (F.running) ambStart(el.value); };
CH.fTaskSel = el => { F.taskId = el.value; };
ACT.fAddTag = () => prompt0();
function prompt0() {
  const o = openModal(`<div class="modal-h"><h2>${t('fr_new_tag')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div><div class="field"><input class="input" id="ntName" placeholder="${t('f_name')}"></div><div class="modal-f"><span class="sp"></span><button class="btn primary" id="ntOk">${t('save')}</button></div>`);
  o.querySelector('[data-close]').onclick = closeModal;
  o.querySelector('#ntOk').onclick = () => { const v = $('#ntName').value.trim(); if (!v) return; S.forest.tags = [...ftags(), { id: uid(), name: v, color: COLORS[ftags().length % 8] }]; closeModal(); commit(); };
}
function focusCardHTML(compact) {
  const today_ = S.focus.filter(f => f.date === today());
  const alive = today_.filter(f => !f.dead).length, mins = today_.filter(f => !f.dead).reduce((a, f) => a + f.minutes, 0);
  const unlocked = S.forest.unlocked || ['pine'];
  const minNow = Math.round(F.total / 60);
  return `<div class="forest-plant ${compact ? 'compact' : ''}">
    <div class="f-stage"><div class="f-glow"></div><div class="f-tree" data-size="${compact ? 120 : 190}">${F.mode === 'break' ? '<div class="break-cup">☕</div>' : treeSVG(S.forest.species, F.running || F.left < F.total ? 1 - F.left / F.total : 1, false, compact ? 120 : 190)}</div></div>
    <div class="f-side">
      <div class="f-mode">${F.mode === 'break' ? '☕ ' + t('focus_break') : (F.running ? '🌱 ' + t('fr_growing') : '🌳 ' + t('fr_ready'))}</div>
      <div class="f-digits ${F.running ? 'running' : ''}">${digital(mmss(F.left))}</div>
      <div class="f-lock ${F.running ? 'hide' : ''}">
        <div class="f-range"><input type="range" min="5" max="120" step="5" value="${minNow}" data-ch="fRange" data-in="fRange"><span><b id="fMinLab" class="num">${minNow}</b> ${t('min')}</span></div>
        ${compact ? '' : `<div class="f-tags">${ftags().map(g => `<button class="ftag ${F.tag === g.id ? 'on' : ''}" style="--c:${g.color}" data-act="fTag" data-v="${g.id}">${esc(g.name)}</button>`).join('')}<button class="ftag add" data-act="fAddTag">+</button></div>
        <div class="f-species">${Object.keys(SPECIES).filter(k => unlocked.includes(k)).map(k => `<button class="${S.forest.species === k ? 'on' : ''}" data-act="fSpecies" data-v="${k}" title="${t('sp_' + k)}">${treeSVG(k, 1, false, 34)}</button>`).join('')}</div>`}
      </div>
      <button class="btn primary f-btn" data-act="plant">🌱 ${t('fr_plant')}</button>
      <div class="f-stats small muted"><span>🌳 <b class="num">${alive}</b></span><span>⏱ <b class="num">${mins}</b> ${t('min')}</span><span>🪙 <b class="num">${S.forest.coins || 0}</b></span>${compact ? `<a href="#/focus" class="btn ghost sm" style="margin-inline-start:auto">${t('fr_open')}</a>` : ''}</div>
    </div></div>`;
}
VIEWS.focus = () => {
  const per = UI.fPeriod || 'day'; const d = today();
  const from = per === 'day' ? d : per === 'week' ? weekStart(d) : per === 'month' ? monthStart(d) : addDays(d, -364);
  const ses = S.focus.filter(f => f.date >= from && f.date <= d && f.minutes > 0);
  const alive = ses.filter(f => !f.dead), dead = ses.filter(f => f.dead);
  const mins = alive.reduce((a, f) => a + f.minutes, 0);
  const byTag = {}; alive.forEach(f => byTag[f.tag || 'other'] = (byTag[f.tag || 'other'] || 0) + f.minutes); const mt = Math.max(1, ...Object.values(byTag));
  // isometric forest
  const trees = ses.slice(-144); const n = Math.max(trees.length, 9); const cols = Math.ceil(Math.sqrt(n)); const W = 460, tile = W / (cols + 1);
  const land = `<svg viewBox="0 0 ${W} ${W * .58}" class="land"><polygon points="${W / 2},8 ${W - 8},${W * .29} ${W / 2},${W * .58 - 8} 8,${W * .29}" fill="#4d9a52"/><polygon points="${W / 2},${W * .58 - 8} ${W - 8},${W * .29} ${W - 8},${W * .29 + 14} ${W / 2},${W * .58 + 6}" fill="#6b4a2e"/><polygon points="8,${W * .29} ${W / 2},${W * .58 - 8} ${W / 2},${W * .58 + 6} 8,${W * .29 + 14}" fill="#56391f"/>
    ${Array.from({ length: cols * cols }, (_, i) => { const r = Math.floor(i / cols), c = i % cols; const x = W / 2 + (c - r) * tile / 2, y = 8 + (c + r + 1) * tile * .29; return `<polygon points="${x},${y - tile * .29} ${x + tile / 2},${y} ${x},${y + tile * .29} ${x - tile / 2},${y}" fill="${(r + c) % 2 ? '#56a85a' : '#4f9f54'}"/>`; }).join('')}</svg>`;
  const placed = trees.map((f, i) => { const r = Math.floor(i / cols), c = i % cols; const x = W / 2 + (c - r) * tile / 2, y = 8 + (c + r + 1) * tile * .29;
    return `<div class="ftree" style="left:${x / W * 100}%;top:${y / (W * .58) * 100}%;width:${tile * .95 / W * 100}%;z-index:${r + c}" title="${f.minutes} ${t('min')}${f.dead ? ' · 🥀' : ''}">${treeSVG(f.species || 'pine', 1, f.dead, 60)}</div>`; }).join('');
  const shop = Object.entries(SPECIES).map(([k, price]) => { const own = (S.forest.unlocked || ['pine']).includes(k);
    return `<div class="card shop-item ${S.forest.species === k ? 'sel' : ''}">${treeSVG(k, 1, false, 70)}<b>${t('sp_' + k)}</b>${own ? `<button class="btn sm ${S.forest.species === k ? 'primary' : ''}" data-act="fSpecies" data-v="${k}">${S.forest.species === k ? '✓ ' + t('fr_selected') : t('fr_select')}</button>` : `<button class="btn sm" data-act="fBuy" data-v="${k}">🪙 <span class="num">${price}</span></button>`}</div>`; }).join('');
  return pageH(t('nav_focus'), t('focus_desc'), `<span class="chip gold" style="font-size:14px;padding:4px 14px">🪙 <b class="num">${S.forest.coins || 0}</b></span>`) +
    `<div class="bento"><section class="card glow s5" id="focusCard">${focusCardHTML(false)}
      <div class="f-opts"><label class="toggle"><input type="checkbox" data-ch="fStrict" ${S.forest.strict ? 'checked' : ''}><span></span>${t('fr_strict')}</label>
      <select class="select" data-ch="fSound">${['none', 'rain', 'wind', 'brown'].map(k => opt(k, t('snd_' + k), S.forest.sound)).join('')}</select>
      <select class="select" data-ch="fTaskSel">${opt('', '🔗 ' + t('fr_link_task'), F.taskId)}${S.tasks.filter(isOpen).slice(0, 60).map(x => opt(x.id, x.title, F.taskId)).join('')}</select></div>
      <p class="small muted" style="margin:10px 0 0">${S.forest.strict ? t('fr_strict_desc') : t('fr_free_desc')}</p></section>
    <section class="card s7"><div class="card-h"><h3>🌳 ${t('fr_my_forest')}</h3><div class="tabs" style="margin-inline-start:auto">${['day', 'week', 'month', 'year'].map(p => `<button class="tab ${per === p ? 'on' : ''}" data-act="fPeriod" data-v="${p}">${t('per_' + p)}</button>`).join('')}</div></div>
      <div class="forest-land">${land}${placed}</div>
      <div class="stat3" style="margin:14px 0 0"><div class="kpi"><small>⏱ ${t('fr_total')}</small><b class="num">${durLabel(mins) || 0}</b></div><div class="kpi"><small>🌳 ${t('fr_alive')}</small><b class="num pos">${alive.length}</b></div><div class="kpi"><small>🥀 ${t('fr_dead_n')}</small><b class="num neg">${dead.length}</b></div><div class="kpi"><small>🎯 ${t('fr_success')}</small><b class="num">${ses.length ? Math.round(alive.length / ses.length * 100) : 0}%</b></div></div>
      ${Object.keys(byTag).length ? `<div class="card-h" style="margin-top:16px"><h3>${ic('chart')}${t('fr_by_tag')}</h3></div>${Object.entries(byTag).sort((a, b) => b[1] - a[1]).map(([k, v]) => { const g = ftags().find(x => x.id === k) || { name: t('ftag_other'), color: '#74e3a9' }; return `<div class="catbar"><span class="small">${esc(g.name)}</span><div class="progress"><i style="width:${v / mt * 100}%;background:${g.color}"></i></div><span class="small num muted">${durLabel(v)}</span></div>`; }).join('')}` : ''}</section>
    <section class="s12"><div class="card-h"><h3>🛒 ${t('fr_shop')}</h3><span class="small muted" style="margin-inline-start:8px">${t('fr_shop_desc')}</span></div><div class="shop">${shop}</div></section></div>`;
};

/* =================== PROJECTS: hierarchy =================== */
function projCard(p) {
  const st = projStats(p); const dl = p.deadline ? diffDays(p.deadline, today()) : null; const kids = S.projects.filter(q => q.parentId === p.id);
  return `<div class="card pcard" data-act="go" data-v="projects" data-arg="${p.id}" style="--c:${p.color || '#5eead4'}"><div class="pcard-bar"></div>
    <div class="row"><span class="orb sm" style="--c:${p.color || '#5eead4'}"></span><h4 style="flex:1">${esc(p.title)}</h4><span class="chip">${t('st_' + p.status)}</span></div>
    ${p.desc ? `<div class="small muted clamp2">${esc(p.desc)}</div>` : ''}
    <div class="meta">${areaChips(p)}${p.deadline ? `<span class="chip ${dl < 0 ? 'red' : dl < 7 ? 'gold' : ''}">${ic('flag', 'sm')}${fmtDate(p.deadline)}</span>` : ''}</div>
    ${kids.length ? `<div class="subproj">${kids.map(q => `<span class="sp-pill" data-act="go" data-v="projects" data-arg="${q.id}" style="--c:${q.color || '#b9a2ff'}"><i></i>${esc(q.title)} <b class="num">${projStats(q).pct}%</b></span>`).join('')}</div>` : ''}
    <div><div class="row small" style="justify-content:space-between;margin-bottom:4px"><span class="muted">${t('progress')}${kids.length ? ' · ' + tf('incl_sub', { n: kids.length }) : ''}</span><span class="num">${st.done}/${st.total} · ${st.pct}%</span></div><div class="progress"><i style="width:${st.pct}%;background:${p.color || ''}"></i></div></div></div>`;
}
VIEWS.projects = () => {
  if (route.arg) { const p = project(route.arg); if (p) return projectDetail2(p); }
  const tab = UI.projTab || 'active', mode = UI.projMode || 'cards';
  const match = p => tab === 'all' || p.status === tab;
  const roots = S.projects.filter(p => match(p) && (!p.parentId || !project(p.parentId) || !match(project(p.parentId))));
  const body = mode === 'tree' ? `<div class="card">${projTree().filter(([p]) => match(p)).map(([p, d]) => { const st = projStats(p);
      return `<div class="ptree-row" style="--d:${d}" data-act="go" data-v="projects" data-arg="${p.id}">${d ? '<span class="pt-l"></span>' : ''}<span class="orb sm" style="--c:${p.color || '#5eead4'};width:14px;height:14px"></span><b>${esc(p.title)}</b><span class="chip">${t('st_' + p.status)}</span>${areaChips(p)}<span class="pt-prog"><span class="progress"><i style="width:${st.pct}%"></i></span><span class="num small">${st.pct}%</span></span></div>`; }).join('') || emptyBox()}</div>`
    : `<div class="cards">${roots.map(projCard).join('') || `<div class="card">${emptyBox()}</div>`}</div>`;
  return pageH(t('nav_projects'), t('projects_desc'), newBtn('projects', 'new_project', { status: 'active', color: COLORS[Math.floor(Math.random() * 8)] })) +
    `<div class="toolbar"><div class="tabs">${['active', 'paused', 'completed', 'archived', 'all'].map(x => `<button class="tab ${tab === x ? 'on' : ''}" data-act="ui" data-k="projTab" data-v="${x}">${x === 'all' ? t('t_all') : t('st_' + x)} <span class="num muted">${x === 'all' ? S.projects.length : S.projects.filter(p => p.status === x).length}</span></button>`).join('')}</div>
    <div class="tabs" style="margin-inline-start:auto"><button class="tab ${mode === 'cards' ? 'on' : ''}" data-act="ui" data-k="projMode" data-v="cards">${ic('grid', 'sm')}</button><button class="tab ${mode === 'tree' ? 'on' : ''}" data-act="ui" data-k="projMode" data-v="tree">${ic('list', 'sm')}</button></div></div>` + body;
};
function projectDetail2(p) {
  const st = projStats(p); const kids = S.projects.filter(q => q.parentId === p.id); const inc = UI.projInc;
  const ids = inc ? projIds(p.id) : [p.id];
  const ts = S.tasks.filter(x => ids.includes(x.projectId)).sort(PRI_SORT); const ns = S.notes.filter(x => ids.includes(x.projectId));
  const crumbs = []; let q = p.parentId ? project(p.parentId) : null, g = 0; while (q && g++ < 10) { crumbs.unshift(q); q = q.parentId ? project(q.parentId) : null; }
  return `<div class="crumbs"><a href="#/projects">${t('nav_projects')}</a>${crumbs.map(c => `<span>›</span><a href="#/projects/${c.id}">${esc(c.title)}</a>`).join('')}<span>›</span><b>${esc(p.title)}</b></div>
    <div class="page-h"><button class="icon-btn" data-act="go" data-v="projects" ${p.parentId ? `data-arg="${p.parentId}"` : ''}>${ic('chevR', 'flip')}</button><span class="orb" style="--c:${p.color || '#5eead4'}"></span><div><h1>${esc(p.title)}</h1><p>${esc(p.desc || '')}</p></div>
    <div class="acts"><button class="btn" data-act="new" data-coll="projects" data-def='${esc(JSON.stringify({ parentId: p.id, areaIds: areasOf(p), areaId: areasOf(p)[0] || '', status: 'active', color: p.color }))}'>${ic('plus', 'sm')}${t('new_subproject')}</button><button class="btn" data-act="edit" data-coll="projects" data-id="${p.id}">${ic('edit', 'sm')}${t('edit')}</button></div></div>
    <div class="stat3"><div class="card stat"><small>${t('f_status')}</small><b style="font-size:18px">${t('st_' + p.status)}</b></div><div class="card stat"><small>${t('f_areas')}</small><div class="meta" style="margin-top:6px">${areaChips(p) || '—'}</div></div>
    <div class="card stat"><small>${t('f_deadline')}</small><b style="font-size:18px">${p.deadline ? fmtDate(p.deadline) : '—'}</b></div><div class="card stat"><small>${t('progress')}${kids.length ? ' · ' + tf('incl_sub', { n: kids.length }) : ''}</small><b class="num">${st.pct}%</b><div class="progress"><i style="width:${st.pct}%"></i></div></div></div>
    ${kids.length ? `<div class="card-h" style="margin:4px 0 10px"><h3>${ic('folder')}${t('subprojects')}</h3></div><div class="cards" style="margin-bottom:16px">${kids.map(projCard).join('')}</div>` : ''}
    <div class="bento"><section class="card s7"><div class="card-h"><h3>${ic('tasks')}${t('tasks_of_project')}</h3>${kids.length ? `<label class="toggle small" style="margin-inline-start:auto"><input type="checkbox" data-ch="projInc" ${inc ? 'checked' : ''}><span></span>${t('show_sub_tasks')}</label>` : ''}</div>${addInline('projAdd', { projectId: p.id, areaId: areasOf(p)[0] || '' })}<div class="list" style="margin-top:6px">${ts.map(x => taskRow(x, { noProj: x.projectId === p.id, noArea: true })).join('') || emptyBox()}</div></section>
    <section class="card s5"><div class="card-h"><h3>${ic('note')}${t('notes_of_project')}</h3><div class="acts"><button class="icon-btn sm" data-act="new" data-coll="notes" data-def='${esc(JSON.stringify({ projectId: p.id, areaId: areasOf(p)[0] || '', type: 'note' }))}'>${ic('plus', 'sm')}</button></div></div>
    ${ns.map(n => `<div class="task" data-act="viewNote" data-id="${n.id}" style="cursor:pointer">${ic(n.type === 'idea' ? 'bulb' : 'note')}<div class="t-main"><div class="t-title">${esc(n.title)}</div></div></div>`).join('') || emptyBox()}</section></div>`;
}
CH.projInc = el => { UI.projInc = el.checked; render(); };

/* =================== SCRATCHPAD =================== */
const scrMark = () => { const s = $('#scrState'); if (s) { s.textContent = '✓ ' + t('saved') + ' · ' + new Date().toLocaleTimeString(L === 'fa' ? 'fa-IR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }); s.classList.add('flash'); setTimeout(() => s.classList.remove('flash'), 700); } };
ACT.scrSave = () => { const v = $('#scratch')?.value ?? S.scratch; S.scratch = v; save(); scrMark(); toast(t('saved')); };
ACT.scrNote = () => { const v = ($('#scratch')?.value || '').trim(); if (!v) return; const [first, ...rest] = v.split('\n'); S.notes.push({ id: uid(), createdAt: Date.now(), title: first.slice(0, 80), body: rest.join('\n') || (first.length > 80 ? first : ''), type: 'note', tags: [], inbox: true }); S.scratch = ''; commit(t('captured')); };
ACT.scrTask = () => { const v = ($('#scratch')?.value || '').trim(); if (!v) return; v.split('\n').map(x => x.replace(/^[-*•\d.)\s]+/, '').trim()).filter(Boolean).forEach(line => S.tasks.push({ id: uid(), createdAt: Date.now(), title: line, status: 'todo', priority: 3, due: today(), recur: 'none', tags: [] })); S.scratch = ''; commit(t('captured')); };
ACT.scrClear = () => { if (!S.scratch) return; const old = S.scratch; S.scratch = ''; save(); render(); toast(t('deleted'), '', { label: t('undo'), fn: () => { S.scratch = old; commit(); } }); };
const _inScr = IN.scratch; IN.scratch = el => { _inScr(el); clearTimeout(IN._st); IN._st = setTimeout(scrMark, 600); };

/* time blocks now open the task form */
ACT.newEventAt = el => { const h = +el.dataset.h; openForm('tasks', null, { due: el.dataset.d, time: String(h).padStart(2, '0') + ':00', endTime: String(Math.min(23, h + 1)).padStart(2, '0') + ':00', priority: 3, recur: 'none' }); };

/* insights: add not-done analysis */
const _insights = VIEWS.insights; VIEWS.insights = () => _insights() + missedSection();

ACT.focusTask = el => { F.taskId = el.dataset.id; go('focus'); };
const _settings = VIEWS.settings;
ACT.dlPreV3 = () => { let r = null; try { r = localStorage.getItem(KEY + '.pre-v3'); } catch (e) { } if (!r) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([r], { type: 'application/json' })); a.download = 'second-brain-before-v3.json'; a.click(); };
const hasPreV3 = () => { try { return !!localStorage.getItem(KEY + '.pre-v3'); } catch (e) { return false; } };
VIEWS.settings = () => _settings().replace(`<button class="btn danger" data-act="resetAll">`, `${hasPreV3() ? `<button class="btn" data-act="dlPreV3">${ic('archive', 'sm')}${t('dl_pre')}</button>` : ''}<button class="btn danger" data-act="resetAll">`).replace(`<div class="field"><label>${t('notify')}</label>`, `<div class="field"><label>${t('set_followup')}</label>${pickField('time', 'followUp', S.settings.followUp || '20:00')}</div><div class="field"><label>${t('notify')}</label>`);
document.addEventListener('change', e => { if (e.target.name === 'followUp' && e.target.type === 'hidden') { S.settings.followUp = e.target.value || '20:00'; save(); } });
