/* Second Brain — views */
'use strict';
const VIEWS = {};
const pageH = (title, desc, acts = '') => `<div class="page-h"><div><h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}</div><div class="acts">${acts}</div></div>`;
const newBtn = (coll, label, def) => `<button class="btn primary" data-act="new" data-coll="${coll}" ${def ? `data-def='${esc(JSON.stringify(def))}'` : ''}>${ic('plus', 'sm')}${t(label)}</button>`;
const doneOn = (x, d) => x.doneAt && iso(new Date(x.doneAt)) === d;
const PRI_SORT = (a, b) => (a.status === 'done') - (b.status === 'done') || (a.priority || 3) - (b.priority || 3) || (a.time || '99').localeCompare(b.time || '99');

/* Persian/Gregorian month helpers */
function pmonth(s) {
  if (L !== 'fa') return s.slice(0, 7);
  try { const p = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric' }).formatToParts(new Date(s + 'T12:00:00'));
    return p.find(x => x.type === 'year').value + '-' + p.find(x => x.type === 'month').value; } catch (e) { return s.slice(0, 7); }
}
function monthStart(s) { const k = pmonth(s); let d = s; for (let i = 0; i < 32; i++) { const p = addDays(d, -1); if (pmonth(p) !== k) break; d = p; } return d; }
function monthDays(s) { const st = monthStart(s), k = pmonth(st), out = []; let d = st; while (pmonth(d) === k && out.length < 32) { out.push(d); d = addDays(d, 1); } return out; }
const monthLabel = s => fmtDate(s, { month: 'long', year: 'numeric' });
function weekStart(s) { const d = new Date(s + 'T00:00:00'); const wd = d.getDay(); const startDay = L === 'fa' ? 6 : 1; return addDays(s, -((wd - startDay + 7) % 7)); }
const weekDays = s => Array.from({ length: 7 }, (_, i) => addDays(weekStart(s), i));

/* ---------- shared rows ---------- */
function taskRow(x, o = {}) {
  const done = x.status === 'done';
  return `<div class="task ${done ? 'done' : ''}">
    <span class="prio p${x.priority || 3}"></span>
    <button class="check round ${done ? 'on' : ''}" data-act="toggleTask" data-id="${x.id}" aria-label="done">${ic('check', 'sm')}</button>
    <div class="t-main" data-act="edit" data-coll="tasks" data-id="${x.id}">
      <div class="t-title">${esc(x.title)}</div>
      <div class="t-meta">${x.time ? `<span class="chip ltr">${ic('clock', 'sm')}${esc(x.time)}</span>` : ''}${o.noDue ? '' : dueChip(x.due, done)}${o.noArea ? '' : areaChip(x.areaId)}${o.noProj ? '' : projChip(x.projectId)}
      ${(x.sub || []).length ? `<span class="chip ${x.sub.every(z => z.d) ? 'teal' : ''}">${ic('list', 'sm')}<span class="num">${x.sub.filter(z => z.d).length}/${x.sub.length}</span></span>` : ''}${x.notes ? `<span class="chip">${ic('note', 'sm')}</span>` : ''}${x.recur && x.recur !== 'none' ? `<span class="chip">${ic('repeat', 'sm')}${t('recur_' + x.recur)}</span>` : ''}${(x.tags || []).map(g => `<span class="chip">#${esc(g)}</span>`).join('')}</div>
    </div>
    <div class="t-acts"><button class="icon-btn sm" data-act="focusTask" data-id="${x.id}" title="${t('c_focus')}">${ic('timer', 'sm')}</button>
    <button class="icon-btn sm" data-act="del" data-coll="tasks" data-id="${x.id}">${ic('trash', 'sm')}</button></div>
  </div>`;
}
const addInline = (id, defs = {}) => `<div class="add-inline">${ic('plus', 'sm')}<input id="${id}" data-add='${esc(JSON.stringify(defs))}' placeholder="${esc(t('add_task_here'))}  (#${L === 'fa' ? 'حوزه' : 'area'} !1 @${L === 'fa' ? 'فردا' : 'tomorrow'})"></div>`;
const emptyBox = (msg = t('empty')) => `<div class="empty">${msg}</div>`;

/* ---------- mini charts ---------- */
function barChart(vals, labels, color = 'var(--accent)', fmt = v => fmtNum(v)) {
  const max = Math.max(1, ...vals);
  return `<div class="bars" style="--c:${color}">${vals.map((v, i) => `<div class="b ${v ? '' : 'zero'}" style="height:${Math.max(3, v / max * 100)}%" data-tip="${esc((labels[i] || '') + ': ' + fmt(v))}"></div>`).join('')}</div>`;
}
function radar(areas, size = 260) {
  const n = areas.length, c = size / 2, R = size / 2 - 38;
  if (n < 3) return '';
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n * (L === 'fa' ? -1 : 1); return [c + Math.cos(a) * r, c + Math.sin(a) * r]; };
  let g = '';
  for (let k = 1; k <= 5; k++) g += `<polygon points="${areas.map((_, i) => pt(i, R * k / 5).join(',')).join(' ')}" fill="none" stroke="var(--line2)" stroke-width="1"/>`;
  areas.forEach((a, i) => { const [x, y] = pt(i, R); g += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="var(--line)"/>`; });
  const poly = areas.map((a, i) => pt(i, R * (a.score || 0) / 10).join(',')).join(' ');
  g += `<polygon points="${poly}" fill="rgba(94,234,212,.18)" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;
  areas.forEach((a, i) => { const [x, y] = pt(i, R * (a.score || 0) / 10); g += `<circle cx="${x}" cy="${y}" r="4.5" fill="${a.color}" stroke="var(--bg2)" stroke-width="2"/>`;
    const [lx, ly] = pt(i, R + 20); g += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="16">${a.icon}</text>`; });
  return `<svg viewBox="0 0 ${size} ${size}" style="width:100%;max-width:${size}px;display:block;margin:auto">${g}</svg>`;
}

/* =================== DASHBOARD =================== */
VIEWS.dashboard = () => {
  const d = today(), h = new Date().getHours();
  const gk = h < 5 ? 'g_night' : h < 12 ? 'g_morning' : h < 17 ? 'g_noon' : h < 21 ? 'g_evening' : 'g_night';
  const todays = S.tasks.filter(x => (x.due && x.due <= d && x.status !== 'done') || (x.status === 'done' && doneOn(x, d) && x.due && x.due <= d)).sort(PRI_SORT);
  const doneT = todays.filter(x => x.status === 'done').length;
  const hDone = S.habits.filter(x => x.log?.[d]).length;
  const mk = pmonth(d); const mtx = S.tx.filter(x => pmonth(x.date) === mk);
  const bal = mtx.reduce((a, x) => a + (x.type === 'in' ? x.amount : -x.amount), 0);
  const daily = S.daily[d] || {};
  const types = ['task', 'idea', 'note', 'report', 'expense'];
  const prompts = t('prompts'); const prompt = prompts[(new Date().getDate()) % prompts.length];
  const events = S.events.filter(e => e.date === d).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const timed = S.tasks.filter(x => x.due === d && x.time && x.status !== 'done');
  const sched = [...events.map(e => ({ s: e.start, e: e.end, title: e.title, c: e.color || area(e.areaId)?.color || 'var(--accent)', coll: 'events', id: e.id })),
    ...timed.map(x => ({ s: x.time, title: x.title, c: area(x.areaId)?.color || 'var(--violet)', coll: 'tasks', id: x.id }))].sort((a, b) => a.s.localeCompare(b.s));
  const j = S.journal[d] || {};
  const now = S.library.filter(x => x.status === 'progress').slice(0, 3);
  const goals = S.goals.slice(0, 4);
  return `<div class="bento">
  <section class="card glow hero s12"><div class="hero-orb"></div>
    <div class="hero-top"><div style="flex:1;min-width:240px;position:relative">
      <h2>${t(gk)}${S.settings.name ? (L === 'fa' ? '، ' : ', ') + esc(S.settings.name) : ''} ${h < 12 ? '☀️' : h < 19 ? '🌤️' : '🌙'}</h2>
      <div class="date"><b>${fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b><span class="chip">${fmtDateAlt(d)}</span>${(() => { const yp = yearProgress(); return `<span class="chip gold" title="${esc(tf('days_left', { n: yp.left }))}">${ic('clock', 'sm')}${tf('year_pct', { p: yp.pct, y: yp.y })}</span>`; })()}</div>
    </div><div class="hero-acts"><button class="btn" data-act="planDay">☀️ ${t('plan_day')}</button><button class="btn" data-act="shutdown">🌙 ${t('shutdown')}</button></div></div>
    <div class="capture"><input id="capIn" placeholder="${esc(t('capture_ph'))}" autocomplete="off"><button class="send mic" data-act="voice" data-target="#capIn" aria-label="voice" title="${t('voice')}">${ic('mic')}</button><button class="send" data-act="capSend" aria-label="send">${ic('send')}</button></div>
    <div class="cap-types">${types.map(x => `<button class="cap-type ${UI.capType === x ? 'on' : ''}" data-act="capType" data-t="${x}">${t('type_' + x)}</button>`).join('')}<span class="small muted" style="margin-inline-start:auto">${t('capture_hint')}</span></div>
    <div class="highlight">${ic('star')}<input id="hlIn" data-in="highlight" value="${esc(daily.highlight || '')}" placeholder="${esc(t('highlight_ph'))}">${daily.highlight ? `<button class="check ${daily.hlDone ? 'on' : ''}" data-act="hlDone">${ic('check', 'sm')}</button>` : ''}</div>
    <div class="kpis">
      <div class="kpi"><small>${ic('tasks', 'sm')}${t('kpi_tasks_today')}</small><b class="num">${doneT}<em>${t('of')} ${todays.length}</em></b><div class="progress" style="margin-top:6px"><i style="width:${todays.length ? doneT / todays.length * 100 : 0}%"></i></div></div>
      <div class="kpi"><small>${ic('timer', 'sm')}${t('kpi_focus')}</small><b class="num">${focusToday()}<em>${t('min')}</em></b></div>
      <div class="kpi"><small>${ic('repeat', 'sm')}${t('kpi_habits')}</small><b class="num">${hDone}<em>${t('of')} ${S.habits.length}</em></b></div>
      <div class="kpi"><small>${ic('wallet', 'sm')}${t('kpi_balance')}</small><b class="num ${bal >= 0 ? 'pos' : 'neg'}" style="font-size:18px">${bal >= 0 ? '+' : '−'}${fmtNum(Math.abs(bal))}<em>${esc(S.settings.currency)}</em></b></div>
      <div class="kpi" data-act="go" data-v="inbox" style="cursor:pointer"><small>${ic('inbox', 'sm')}${t('kpi_inbox')}</small><b class="num">${inboxCount()}</b></div>
    </div>
  </section>

  <section class="card s7"><div class="card-h"><h3>${ic('tasks')}${t('c_today')}</h3><div class="acts"><a class="btn ghost sm" href="#/tasks">${t('open_all')}</a></div></div>
    <div class="list">${todays.length ? todays.map(x => taskRow(x, { noDue: x.due === d })).join('') : emptyBox(t('empty_tasks'))}</div>${addInline('dashAdd', { due: d })}</section>

  <section class="card s5" id="focusCard"><div class="card-h"><h3>${ic('timer')}${t('c_focus')}</h3><span class="chip teal" style="margin-inline-start:auto">${S.focus.filter(f => f.date === d).length} ${t('sessions')}</span></div>
    <div class="focus-wrap"><div class="focus-ring" id="focusRing" style="--p:${100 - F.left / F.total * 100}"><div><div><b id="focusT">${mmss(F.left)}</b><small>${F.taskId && S.tasks.find(x => x.id === F.taskId) ? esc(S.tasks.find(x => x.id === F.taskId).title).slice(0, 26) : t('focus_on')}</small></div></div></div>
    <div class="focus-ctrl">
      <select class="select" data-ch="focusTask">${opt('', t('focus_on'), F.taskId)}${S.tasks.filter(x => x.status !== 'done').slice(0, 40).map(x => opt(x.id, x.title, F.taskId)).join('')}</select>
      <div class="presets">${[15, 25, 50, 90].map(m => `<button class="btn sm ${F.total === m * 60 ? 'primary' : ''}" data-act="focusPreset" data-m="${m}"><span class="num">${m}</span>′</button>`).join('')}<button class="btn sm" data-act="focusPreset" data-m="5">${t('focus_break')}</button></div>
      <div class="row"><button class="btn primary" id="focusBtn" data-act="focusToggle" style="flex:1">${ic('play')}${t('focus_start')}</button><button class="btn" data-act="focusReset" title="${t('focus_reset')}">${ic('rotate')}</button></div>
    </div></div></section>

  <section class="card s4"><div class="card-h"><h3>${ic('calendar')}${t('c_schedule')}</h3><div class="acts"><button class="icon-btn sm" data-act="new" data-coll="events" data-def='${JSON.stringify({ date: d })}'>${ic('plus', 'sm')}</button></div></div>
    ${sched.length ? sched.map(s => `<div class="sched-item" style="--c:${s.c}" data-act="edit" data-coll="${s.coll}" data-id="${s.id}"><span class="tm">${esc(s.s)}${s.e ? ' – ' + esc(s.e) : ''}</span><span class="bar"></span><span>${esc(s.title)}</span></div>`).join('') : emptyBox()}</section>

  <section class="card s4"><div class="card-h"><h3>${ic('repeat')}${t('c_habits')}</h3><div class="acts"><a class="btn ghost sm" href="#/habits">${t('open_all')}</a></div></div>
    ${S.habits.length ? S.habits.map(x => `<div class="habit-mini" style="--c:${x.color}"><span style="font-size:18px">${esc(x.icon || '•')}</span><span style="flex:1">${esc(x.title)}</span><span class="chip">${ic('bolt', 'sm')}<span class="num">${streak(x)}</span></span><button class="hcell ${x.log?.[d] ? 'on' : ''}" style="margin:0" data-act="habit" data-id="${x.id}" data-d="${d}">${ic('check', 'sm')}</button></div>`).join('') : emptyBox()}</section>

  <section class="card s4"><div class="card-h"><h3>${ic('pen')}${t('c_mood')}</h3><div class="acts"><a class="btn ghost sm" href="#/journal">${t('nav_journal')}</a></div></div>
    <div class="mood-pick">${['😞', '😕', '😐', '🙂', '😄'].map((e, i) => `<button class="${j.mood === i + 1 ? 'on' : ''}" data-act="mood" data-n="${i + 1}" data-d="${d}">${e}</button>`).join('')}</div>
    <div class="small muted" style="margin:12px 0 6px">${t('energy')}</div>
    <div class="energy-pick">${[1, 2, 3, 4, 5].map(n => `<button class="${(j.energy || 0) >= n ? 'on' : ''}" data-act="energy" data-n="${n}" data-d="${d}"></button>`).join('')}</div>
    <div class="highlight" style="margin-top:16px;border-color:rgba(185,162,255,.35);background:rgba(185,162,255,.06)">${ic('sparkle')}<span style="color:var(--violet);font-size:13px">${esc(prompt)}</span></div></section>

  <section class="card s8 mini-graph"><div class="card-h"><h3>${ic('graph')}${t('c_constellation')}</h3><div class="acts"><a class="btn ghost sm" href="#/graph">${t('view')}</a></div></div><canvas id="miniGraph"></canvas></section>

  <section class="card s4"><div class="card-h"><h3>${ic('compass')}${t('c_wheel')}</h3><div class="acts"><a class="btn ghost sm" href="#/areas">${t('edit')}</a></div></div>${radar(sortedAreas())}</section>

  <section class="card s4"><div class="card-h"><h3>${ic('target')}${t('c_goals')}</h3><div class="acts"><a class="btn ghost sm" href="#/goals">${t('open_all')}</a></div></div>
    ${goals.length ? goals.map(g => { const p = g.target ? clamp(g.current / g.target * 100, 0, 100) : 0; return `<div style="margin-bottom:12px;cursor:pointer" data-act="edit" data-coll="goals" data-id="${g.id}"><div class="row small" style="justify-content:space-between"><span>${esc(g.title)}</span><span class="num muted">${Math.round(p)}%</span></div><div class="progress"><i style="width:${p}%;background:${g.color || ''}"></i></div></div>`; }).join('') : emptyBox()}</section>

  <section class="card s4"><div class="card-h"><h3>${ic('book')}${t('c_now')}</h3><div class="acts"><a class="btn ghost sm" href="#/library">${t('open_all')}</a></div></div>
    ${now.length ? now.map(x => `<div class="row" style="margin-bottom:12px;cursor:pointer" data-act="edit" data-coll="library" data-id="${x.id}"><div class="cover" style="--c:${x.color || '#5eead4'};width:38px;height:52px;font-size:16px">${KIND_ICON[x.kind]}</div><div style="flex:1;min-width:0"><div style="font-weight:500">${esc(x.title)}</div><div class="progress" style="margin-top:6px"><i style="width:${x.progress || 0}%"></i></div></div></div>`).join('') : emptyBox()}</section>

  <section class="card s4"><div class="card-h"><h3>${ic('edit')}${t('c_scratch')}</h3></div><textarea class="textarea" id="scratch" data-in="scratch" rows="6" placeholder="${esc(t('scratch_ph'))}">${esc(S.scratch)}</textarea></section>
  ${dashExtra()}
  </div>`;
};
function streak(h) { let n = 0, d = today(); if (!h.log?.[d]) d = addDays(d, -1); while (h.log?.[d]) { n++; d = addDays(d, -1); } return n; }
const KIND_ICON = { book: '📖', movie: '🎬', series: '📺', course: '🎓', podcast: '🎧' };
afterRenderHook('dashboard', () => drawGraph($('#miniGraph'), { mini: true }));
function afterRenderHook(view, fn) { (VIEWS['_after_' + view] = VIEWS['_after_' + view] || []).push(fn); }

/* =================== INBOX =================== */
VIEWS.inbox = () => {
  const items = [...S.tasks.filter(x => x.inbox && x.status !== 'done').map(x => ({ x, coll: 'tasks' })), ...S.notes.filter(x => x.inbox).map(x => ({ x, coll: 'notes' }))]
    .sort((a, b) => b.x.createdAt - a.x.createdAt);
  const tIcon = { task: 'tasks', idea: 'bulb', note: 'note', report: 'pen', resource: 'link', quote: 'quote' };
  return pageH(t('nav_inbox'), t('inbox_desc'), `<button class="btn primary" data-act="quickCapture">${ic('sparkle', 'sm')}${t('sc_capture')}</button>`) +
    `<div class="card">${items.length ? items.map(({ x, coll }) => `<div class="task">
      <span class="chip ${coll === 'tasks' ? 'teal' : 'gold'}">${ic(tIcon[coll === 'tasks' ? 'task' : x.type] || 'note', 'sm')}${t('type_' + (coll === 'tasks' ? 'task' : x.type))}</span>
      <div class="t-main" data-act="edit" data-coll="${coll}" data-id="${x.id}"><div class="t-title">${esc(x.title)}</div><div class="t-meta"><span class="chip">${relDay(iso(new Date(x.createdAt)))}</span>${(x.tags || []).map(g => `<span class="chip">#${esc(g)}</span>`).join('')}</div></div>
      <select class="select" style="width:auto;padding-block:5px;font-size:12.5px" data-ch="inboxArea" data-coll="${coll}" data-id="${x.id}">${opt('', t('assign_area'), '')}${sortedAreas().map(a => opt(a.id, a.icon + ' ' + areaName(a), '')).join('')}</select>
      ${coll === 'notes' ? `<button class="btn sm" data-act="toTask" data-id="${x.id}">${ic('tasks', 'sm')}${t('to_task')}</button>` : `<button class="btn sm" data-act="toToday" data-id="${x.id}">${ic('calendar', 'sm')}${t('today')}</button>`}
      <button class="icon-btn sm" data-act="del" data-coll="${coll}" data-id="${x.id}">${ic('trash', 'sm')}</button></div>`).join('') : emptyBox(t('empty_inbox'))}</div>`;
};

/* =================== TASKS =================== */
VIEWS.tasks = () => {
  const d = today(); const tab = UI.taskTab;
  let list = S.tasks.filter(x => (!UI.taskArea || x.areaId === UI.taskArea) && (!UI.taskProj || x.projectId === UI.taskProj) && (!UI.taskQ || x.title.toLowerCase().includes(UI.taskQ.toLowerCase())));
  const open = list.filter(x => x.status !== 'done');
  let body = '';
  const group = (title, arr, o) => arr.length ? `<div class="group-h">${title}<span class="chip">${arr.length}</span></div>` + arr.sort(PRI_SORT).map(x => taskRow(x, o)).join('') : '';
  if (tab === 'today') {
    body = group(t('overdue'), open.filter(x => x.due && x.due < d)) + group(t('today'), list.filter(x => x.due === d && (x.status !== 'done' || doneOn(x, d))), { noDue: true });
    body = body || emptyBox(t('empty_tasks'));
  } else if (tab === 'upcoming') {
    for (let i = 1; i <= 14; i++) { const day = addDays(d, i); body += group(`${relDay(day)} · ${fmtDate(day)}`, open.filter(x => x.due === day), { noDue: true }); }
    body += group('…', open.filter(x => x.due && x.due > addDays(d, 14)));
    body = body || emptyBox();
  } else if (tab === 'all') {
    body = group(t('overdue'), open.filter(x => x.due && x.due < d)) + group(t('today'), open.filter(x => x.due === d)) + group(t('t_upcoming'), open.filter(x => x.due > d)) + group(t('t_nodate'), open.filter(x => !x.due));
    body = body || emptyBox();
  } else if (tab === 'done') {
    const dn = list.filter(x => x.status === 'done').sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 80);
    body = dn.length ? dn.map(x => taskRow(x)).join('') : emptyBox();
  }
  if (tab === 'matrix') {
    const urgent = x => x.due && diffDays(x.due, d) <= 2, imp = x => (x.priority || 3) <= 2;
    const Q = [[x => urgent(x) && imp(x), 'q1', 'var(--red)'], [x => !urgent(x) && imp(x), 'q2', 'var(--accent)'], [x => urgent(x) && !imp(x), 'q3', 'var(--gold)'], [x => !urgent(x) && !imp(x), 'q4', 'var(--muted)']];
    body = `<div class="matrix">${Q.map(([f, k, c]) => { const arr = open.filter(f).sort(PRI_SORT); return `<div class="card"><div class="q-h"><i style="background:${c}"></i>${t(k)}<span class="chip" style="margin-inline-start:auto">${arr.length}</span></div><div class="list">${arr.map(x => taskRow(x, { noArea: true })).join('') || emptyBox()}</div></div>`; }).join('')}</div>`;
  }
  const tabs = ['today', 'upcoming', 'all', 'board', 'done', 'matrix'];
  if (tab === 'board') body = kanban('tasks', 'status', [['todo', '#8ec5ff'], ['doing', '#e9c78f'], ['done', '#74e3a9']].map(([k, c]) => ({ k, c, l: t('st_' + k), add: k === 'todo' ? { status: 'todo', priority: 3, recur: 'none' } : null })), list.filter(x => x.status !== 'done' || (x.doneAt && Date.now() - x.doneAt < 7 * 864e5)), x => `<div data-act="edit" data-coll="tasks" data-id="${x.id}" style="cursor:pointer"><div class="row" style="gap:8px"><span class="prio p${x.priority || 3}" style="height:18px"></span><b style="flex:1;line-height:1.6">${esc(x.title)}</b></div><div class="t-meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${dueChip(x.due, x.status === 'done')}${areaChip(x.areaId)}${projChip(x.projectId)}${(x.sub || []).length ? `<span class="chip">${x.sub.filter(z => z.d).length}/${x.sub.length}</span>` : ''}</div></div>`);
  return pageH(t('nav_tasks'), '', newBtn('tasks', 'new_task', { due: tab === 'today' ? d : '' })) +
    `<div class="toolbar"><div class="tabs">${tabs.map(x => `<button class="tab ${tab === x ? 'on' : ''}" data-act="ui" data-k="taskTab" data-v="${x}">${x === 'matrix' ? ic('grid', 'sm') : x === 'board' ? ic('columns', 'sm') : ''}${t('t_' + x)}</button>`).join('')}</div>
    <select class="select" data-ch="ui" data-k="taskArea">${opt('', '🌐 ' + t('f_area'), UI.taskArea)}${sortedAreas().map(a => opt(a.id, a.icon + ' ' + areaName(a), UI.taskArea)).join('')}</select>
    <select class="select" data-ch="ui" data-k="taskProj">${opt('', '📁 ' + t('f_project'), UI.taskProj)}${S.projects.map(p => opt(p.id, p.title, UI.taskProj)).join('')}</select>
    <input class="input" id="taskQ" data-in="taskQ" placeholder="${t('search')}…" value="${esc(UI.taskQ)}" style="flex:1"></div>` +
    (tab === 'matrix' || tab === 'board' ? body : `<div class="card">${tab !== 'done' ? addInline('tasksAdd', { due: tab === 'today' ? d : '', areaId: UI.taskArea, projectId: UI.taskProj }) : ''}<div class="list" style="margin-top:6px">${body}</div></div>`);
};

/* =================== CALENDAR =================== */
VIEWS.calendar = () => {
  if (UI.calMode === 'month') return calMonth();
  const day = UI.calDay || today(); const days = weekDays(day); const d0 = today();
  const evs = S.events.filter(e => e.date === day);
  const tks = S.tasks.filter(x => x.due === day);
  const H0 = 6, H1 = 24, HH = 56;
  const toMin = s => { const [h, m] = (s || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const blocks = [...evs.map(e => ({ ...e, c: e.color || area(e.areaId)?.color || '#5eead4', coll: 'events' })),
    ...tks.filter(x => x.time).map(x => ({ id: x.id, title: x.title, start: x.time, end: '', c: area(x.areaId)?.color || '#b9a2ff', coll: 'tasks' }))]
    .map(b => { const s = toMin(b.start), e = b.end ? Math.max(toMin(b.end), s + 20) : s + 30; return { ...b, top: (s - H0 * 60) / 60 * HH, h: (e - s) / 60 * HH }; })
    .filter(b => b.top + b.h > 0);
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  return pageH(t('nav_calendar'), t('cal_desc'), `<button class="btn" data-act="calShift" data-n="-7">${ic('chevL', 'sm flip')}</button><button class="btn" data-act="calToday">${t('go_today')}</button><button class="btn" data-act="calShift" data-n="7">${ic('chevR', 'sm flip')}</button>` + newBtn('events', 'new_event', { date: day })) +
    `${calModeTabs()}<div class="week-strip">${days.map(x => { const n = S.events.filter(e => e.date === x).length + S.tasks.filter(k => k.due === x && k.status !== 'done').length;
      return `<button class="day-btn ${x === day ? 'on' : ''} ${x === d0 ? 'today' : ''}" data-act="calDay" data-d="${x}"><small>${weekday(x, 'short')}</small><b class="num">${fmtDate(x, { day: 'numeric' })}</b><div class="dots">${'<i></i>'.repeat(Math.min(n, 4))}</div></button>`; }).join('')}</div>
    <div class="bento"><section class="card s8" style="padding:8px 0"><div class="card-h" style="padding:8px 16px"><h3>${ic('clock')}${fmtDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}</h3><span class="chip" style="margin-inline-start:auto">${fmtDateAlt(day)}</span></div>
      <div class="timeline">${Array.from({ length: H1 - H0 }, (_, i) => `<div class="tl-hour" data-act="newEventAt" data-h="${H0 + i}" data-d="${day}"><span>${String(H0 + i).padStart(2, '0')}:00</span></div>`).join('')}
      <div class="tl-blocks">${blocks.map(b => `<div class="tl-block" style="--c:${b.c};top:${b.top}px;height:${Math.max(24, b.h - 2)}px" data-act="edit" data-coll="${b.coll}" data-id="${b.id}"><b>${esc(b.title)}</b><span class="ltr small">${esc(b.start)}${b.end ? ' – ' + esc(b.end) : ''}</span></div>`).join('')}</div>
      ${day === d0 && nowM > H0 * 60 ? `<div class="tl-now" style="top:${(nowM - H0 * 60) / 60 * HH}px"></div>` : ''}</div></section>
    <section class="card s4"><div class="card-h"><h3>${ic('tasks')}${t('nav_tasks')}</h3></div><div class="list">${tks.sort(PRI_SORT).map(x => taskRow(x, { noDue: true })).join('') || emptyBox()}</div>${addInline('calAdd', { due: day })}</section></div>`;
};

/* =================== PROJECTS =================== */
const projStats = p => { const ts = S.tasks.filter(x => x.projectId === p.id); const dn = ts.filter(x => x.status === 'done').length; return { total: ts.length, done: dn, pct: ts.length ? Math.round(dn / ts.length * 100) : (p.status === 'completed' ? 100 : 0) }; };
VIEWS.projects = () => {
  if (route.arg) { const p = project(route.arg); if (p) return projectDetail(p); }
  const tab = UI.projTab || 'active';
  const list = S.projects.filter(p => tab === 'all' || p.status === tab);
  return pageH(t('nav_projects'), t('projects_desc'), newBtn('projects', 'new_project')) +
    `<div class="toolbar"><div class="tabs">${['active', 'paused', 'completed', 'archived', 'all'].map(x => `<button class="tab ${tab === x ? 'on' : ''}" data-act="ui" data-k="projTab" data-v="${x}">${x === 'all' ? t('t_all') : t('st_' + x)} <span class="num muted">${x === 'all' ? S.projects.length : S.projects.filter(p => p.status === x).length}</span></button>`).join('')}</div></div>
    <div class="cards">${list.map(p => { const st = projStats(p); const dl = p.deadline ? diffDays(p.deadline, today()) : null;
      return `<div class="card pcard" data-act="go" data-v="projects" data-arg="${p.id}"><div class="row"><span class="orb sm" style="--c:${p.color || '#5eead4'}"></span><h4 style="flex:1">${esc(p.title)}</h4><span class="chip">${t('st_' + p.status)}</span></div>
        ${p.desc ? `<div class="small muted" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(p.desc)}</div>` : ''}
        <div class="meta">${areaChip(p.areaId)}${p.deadline ? `<span class="chip ${dl < 0 ? 'red' : dl < 7 ? 'gold' : ''}">${ic('flag', 'sm')}${fmtDate(p.deadline)}</span>` : ''}</div>
        <div><div class="row small" style="justify-content:space-between;margin-bottom:4px"><span class="muted">${t('progress')}</span><span class="num">${st.done}/${st.total} · ${st.pct}%</span></div><div class="progress"><i style="width:${st.pct}%"></i></div></div></div>`; }).join('') || `<div class="card">${emptyBox()}</div>`}</div>`;
};
function projectDetail(p) {
  const st = projStats(p); const ts = S.tasks.filter(x => x.projectId === p.id).sort(PRI_SORT); const ns = S.notes.filter(x => x.projectId === p.id);
  return `<div class="page-h"><button class="icon-btn" data-act="go" data-v="projects">${ic('chevR', 'flip')}</button><span class="orb" style="--c:${p.color || '#5eead4'}"></span><div><h1>${esc(p.title)}</h1><p>${esc(p.desc || '')}</p></div>
    <div class="acts"><button class="btn" data-act="edit" data-coll="projects" data-id="${p.id}">${ic('edit', 'sm')}${t('edit')}</button></div></div>
    <div class="stat3"><div class="card stat"><small>${t('f_status')}</small><b style="font-size:18px">${t('st_' + p.status)}</b></div><div class="card stat"><small>${t('f_area')}</small><b style="font-size:16px">${areaChip(p.areaId) || '—'}</b></div>
    <div class="card stat"><small>${t('f_deadline')}</small><b style="font-size:18px">${p.deadline ? fmtDate(p.deadline) : '—'}</b></div><div class="card stat"><small>${t('progress')}</small><b class="num">${st.pct}%</b><div class="progress"><i style="width:${st.pct}%"></i></div></div></div>
    <div class="bento"><section class="card s7"><div class="card-h"><h3>${ic('tasks')}${t('tasks_of_project')}</h3></div>${addInline('projAdd', { projectId: p.id, areaId: p.areaId })}<div class="list" style="margin-top:6px">${ts.map(x => taskRow(x, { noProj: true, noArea: true })).join('') || emptyBox()}</div></section>
    <section class="card s5"><div class="card-h"><h3>${ic('note')}${t('notes_of_project')}</h3><div class="acts"><button class="icon-btn sm" data-act="new" data-coll="notes" data-def='${esc(JSON.stringify({ projectId: p.id, areaId: p.areaId, type: 'note' }))}'>${ic('plus', 'sm')}</button></div></div>
    ${ns.map(n => `<div class="task" data-act="edit" data-coll="notes" data-id="${n.id}" style="cursor:pointer">${ic(n.type === 'idea' ? 'bulb' : 'note')}<div class="t-main"><div class="t-title">${esc(n.title)}</div></div></div>`).join('') || emptyBox()}</section></div>`;
}

/* =================== AREAS =================== */
VIEWS.areas = () => {
  if (route.arg) { const a = area(route.arg); if (a) return areaDetail(a); }
  const as = sortedAreas();
  return pageH(t('nav_areas'), t('areas_desc'), newBtn('areas', 'new_area', { icon: '✨', color: COLORS[3] })) +
    `<div class="bento"><section class="card s4"><div class="card-h"><h3>${ic('compass')}${t('c_wheel')}</h3></div>${radar(as, 300)}</section>
    <div class="s8"><div class="cards">${as.map(a => {
      const np = S.projects.filter(p => p.areaId === a.id && p.status === 'active').length, nt = S.tasks.filter(x => x.areaId === a.id && x.status !== 'done').length, nn = S.notes.filter(x => x.areaId === a.id).length;
      return `<div class="card area-card" style="--c:${a.color}"><div class="area-top"><span class="orb" style="--c:${a.color}">${a.icon}</span><div style="flex:1;cursor:pointer" data-act="go" data-v="areas" data-arg="${a.id}"><h4>${esc(areaName(a))}</h4><div class="small muted"><span class="num">${np}</span> ${t('projects_count')} · <span class="num">${nt}</span> ${t('tasks_count')} · <span class="num">${nn}</span> ${t('notes_count')}</div></div>
        <button class="icon-btn sm" data-act="edit" data-coll="areas" data-id="${a.id}">${ic('edit', 'sm')}</button></div>
        <div><div class="row small" style="justify-content:space-between;margin-bottom:6px"><span class="muted">${t('f_score')}</span><b class="num" style="color:${a.color}">${a.score || 0}/10</b></div>
        <div class="score">${Array.from({ length: 10 }, (_, i) => `<button class="${(a.score || 0) > i ? 'on' : ''}" data-act="areaScore" data-id="${a.id}" data-n="${i + 1}">${i + 1}</button>`).join('')}</div></div></div>`; }).join('')}</div></div></div>`;
};
function areaDetail(a) {
  const ps = S.projects.filter(p => p.areaId === a.id), ts = S.tasks.filter(x => x.areaId === a.id && x.status !== 'done').sort(PRI_SORT), ns = S.notes.filter(x => x.areaId === a.id), hs = S.habits.filter(x => x.areaId === a.id), gs = S.goals.filter(x => x.areaId === a.id);
  return `<div class="page-h"><button class="icon-btn" data-act="go" data-v="areas">${ic('chevR', 'flip')}</button><span class="orb" style="--c:${a.color}">${a.icon}</span><div><h1>${esc(areaName(a))}</h1><p class="num">${a.score || 0}/10</p></div><div class="acts"><button class="btn" data-act="edit" data-coll="areas" data-id="${a.id}">${ic('edit', 'sm')}${t('edit')}</button></div></div>
  <div class="bento"><section class="card s6"><div class="card-h"><h3>${ic('tasks')}${t('nav_tasks')}</h3></div>${addInline('areaAdd', { areaId: a.id })}<div class="list" style="margin-top:6px">${ts.map(x => taskRow(x, { noArea: true })).join('') || emptyBox()}</div></section>
  <section class="card s6"><div class="card-h"><h3>${ic('folder')}${t('nav_projects')}</h3></div>${ps.map(p => `<div class="task" style="cursor:pointer" data-act="go" data-v="projects" data-arg="${p.id}"><span class="orb sm" style="--c:${p.color || a.color};width:18px;height:18px"></span><div class="t-main"><div class="t-title">${esc(p.title)}</div></div><span class="chip num">${projStats(p).pct}%</span></div>`).join('') || emptyBox()}
  <div class="card-h" style="margin-top:16px"><h3>${ic('target')}${t('nav_goals')}</h3></div>${gs.map(g => `<div class="task" data-act="edit" data-coll="goals" data-id="${g.id}" style="cursor:pointer"><div class="t-main"><div class="t-title">${esc(g.title)}</div></div><span class="chip num">${g.current}/${g.target}</span></div>`).join('') || emptyBox()}
  <div class="card-h" style="margin-top:16px"><h3>${ic('repeat')}${t('nav_habits')}</h3></div>${hs.map(h => `<div class="task"><span>${esc(h.icon)}</span><div class="t-main">${esc(h.title)}</div><span class="chip">${ic('bolt', 'sm')}${streak(h)}</span></div>`).join('') || emptyBox()}</section>
  <section class="card s12"><div class="card-h"><h3>${ic('note')}${t('nav_notes')}</h3></div><div class="cards">${ns.map(noteCard).join('') || emptyBox()}</div></section></div>`;
}

/* =================== GOALS =================== */
VIEWS.goals = () => {
  const tab = UI.goalH; const list = S.goals.filter(g => !tab || g.horizon === tab);
  return pageH(t('nav_goals'), t('goals_desc'), newBtn('goals', 'new_goal', { horizon: 'year', current: 0, target: 100, color: COLORS[1] })) +
    `<div class="toolbar"><div class="tabs">${['', 'life', 'year', 'quarter', 'month'].map(x => `<button class="tab ${tab === x ? 'on' : ''}" data-act="ui" data-k="goalH" data-v="${x}">${x ? t('h_' + x) : t('t_all')}</button>`).join('')}</div></div>
    <div class="cards">${list.map(g => { const p = g.target ? clamp(Math.round(g.current / g.target * 100), 0, 100) : 0;
      return `<div class="card goal-card"><div class="goal-top"><div class="ring" style="--p:${p};--c:${g.color || 'var(--accent)'}"><span class="num">${p}%</span></div><div style="flex:1;min-width:0;cursor:pointer" data-act="edit" data-coll="goals" data-id="${g.id}"><h4 style="margin:0;font-size:15px">${esc(g.title)}</h4><div class="meta row" style="flex-wrap:wrap;gap:6px;margin-top:6px"><span class="chip gold">${t('h_' + (g.horizon || 'year'))}</span>${areaChip(g.areaId)}${g.due ? `<span class="chip">${ic('flag', 'sm')}${fmtDate(g.due)}</span>` : ''}</div></div></div>
      ${g.why ? `<div class="small muted">${esc(g.why)}</div>` : ''}
      <div class="row"><button class="icon-btn sm" data-act="goalStep" data-id="${g.id}" data-n="-1" style="border:1px solid var(--line2)">${ic('minus', 'sm')}</button><div style="flex:1;text-align:center"><b class="num" style="font-size:18px">${fmtNum(g.current, 2)}</b> <span class="muted">/ <span class="num">${fmtNum(g.target, 2)}</span> ${esc(g.unit || '')}</span></div><button class="icon-btn sm" data-act="goalStep" data-id="${g.id}" data-n="1" style="border:1px solid var(--line2)">${ic('plus', 'sm')}</button></div></div>`; }).join('') || `<div class="card">${emptyBox()}</div>`}</div>`;
};

/* =================== NOTES =================== */
const NOTE_IC = { idea: 'bulb', note: 'note', report: 'pen', resource: 'link', quote: 'quote' };
const NOTE_C = { idea: 'gold', note: 'teal', report: 'violet', resource: '', quote: '' };
function noteCard(n) {
  return `<div class="card note-card" data-act="viewNote" data-id="${n.id}"><div class="row"><span class="chip ${NOTE_C[n.type] || ''}">${ic(NOTE_IC[n.type] || 'note', 'sm')}${t('type_' + n.type)}</span>${areaChip(n.areaId)}
    <button class="icon-btn sm" style="margin-inline-start:auto;${n.pinned ? 'color:var(--gold)' : ''}" data-act="pin" data-id="${n.id}">${ic('pin', 'sm')}</button></div>
    <b style="font-size:15px;line-height:1.6">${esc(n.title)}</b>${n.body ? `<div class="body">${esc(plain(n.body))}</div>` : ''}
    <div class="row small muted" style="flex-wrap:wrap;gap:6px">${(n.tags || []).map(g => `<span class="chip">#${esc(g)}</span>`).join('')}<span style="margin-inline-start:auto">${fmtDate(iso(new Date(n.createdAt)))}</span></div></div>`;
}
VIEWS.notes = () => {
  const q = UI.noteQ.toLowerCase();
  const list = S.notes.filter(n => (!UI.noteType || n.type === UI.noteType) && (!q || (n.title + ' ' + n.body + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q)))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
  return pageH(t('nav_notes'), t('notes_desc'), newBtn('notes', 'new_note', { type: UI.noteType || 'idea' })) +
    `<div class="toolbar"><div class="tabs">${['', 'idea', 'note', 'report', 'resource', 'quote'].map(x => `<button class="tab ${UI.noteType === x ? 'on' : ''}" data-act="ui" data-k="noteType" data-v="${x}">${x ? ic(NOTE_IC[x], 'sm') + t('type_' + x) : t('all_types')}</button>`).join('')}</div>
    <input class="input" id="noteQ" data-in="noteQ" placeholder="${t('search')}…" value="${esc(UI.noteQ)}" style="flex:1">
    <select class="select" data-ch="noteTpl">${opt('', '📄 ' + t('from_template'), '')}${Object.keys(TPL.fa).map(k => opt(k, t('tpl_' + k), '')).join('')}</select></div>
    <div class="masonry">${list.map(noteCard).join('') || `<div class="card">${emptyBox()}</div>`}</div>`;
};

/* =================== HABITS =================== */
VIEWS.habits = () => {
  const d = today(); const days = Array.from({ length: 7 }, (_, i) => addDays(d, i - 6));
  const rate = h => { let c = 0; for (let i = 0; i < 30; i++) if (h.log?.[addDays(d, -i)]) c++; return Math.round(c / 30 * 100); };
  return pageH(t('nav_habits'), t('habits_desc'), newBtn('habits', 'new_habit', { icon: '✨', color: COLORS[0] })) +
    `<div class="card" style="overflow-x:auto"><div class="habit-row head"><span></span>${days.map(x => `<span>${weekday(x, 'narrow')}<br><span class="num">${fmtDate(x, { day: 'numeric' })}</span></span>`).join('')}<span>${t('streak')}</span><span class="hide-m">${t('rate')}</span></div>
    ${S.habits.map(h => `<div class="habit-row" style="--c:${h.color}"><div class="row" style="cursor:pointer;min-width:0" data-act="edit" data-coll="habits" data-id="${h.id}"><span style="font-size:20px">${esc(h.icon || '•')}</span><div style="min-width:0"><div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(h.title)}</div>${h.areaId ? `<div class="small muted">${esc(areaName(area(h.areaId)))}</div>` : ''}</div></div>
      ${days.map(x => `<button class="hcell ${h.log?.[x] ? 'on' : ''} ${x === d ? 'today' : ''}" data-act="habit" data-id="${h.id}" data-d="${x}">${ic('check', 'sm')}</button>`).join('')}
      <span class="chip" style="justify-self:center">${ic('bolt', 'sm')}<span class="num">${streak(h)}</span></span><span class="num hide-m" style="text-align:center">${rate(h)}%</span></div>`).join('') || emptyBox()}</div>
    <div class="cards" style="margin-top:16px">${S.habits.map(h => { const cells = []; const st = addDays(weekStart(d), -77); for (let i = 0; i < 84; i++) { const x = addDays(st, i); cells.push(`<i class="${h.log?.[x] ? 'on' : ''}" title="${x}" style="${x > d ? 'opacity:.25' : ''}"></i>`); }
      return `<div class="card" style="--c:${h.color}"><div class="card-h"><h3><span>${esc(h.icon)}</span>${esc(h.title)}</h3><span class="chip" style="margin-inline-start:auto">${rate(h)}%</span></div><div class="heat">${cells.join('')}</div>${h.why ? `<div class="small muted" style="margin-top:10px">${esc(h.why)}</div>` : ''}</div>`; }).join('')}</div>`;
};

/* =================== FINANCE =================== */
VIEWS.finance = () => {
  const ref = UI.finMonth || today(); const mk = pmonth(ref); const days = monthDays(ref);
  const mtx = S.tx.filter(x => pmonth(x.date) === mk).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const inc = mtx.filter(x => x.type === 'in').reduce((a, x) => a + x.amount, 0), exp = mtx.filter(x => x.type === 'out').reduce((a, x) => a + x.amount, 0);
  const byCat = {}; mtx.filter(x => x.type === 'out').forEach(x => byCat[x.cat] = (byCat[x.cat] || 0) + x.amount);
  const cats = [...new Set([...Object.keys(byCat), ...Object.keys(S.budgets).filter(k => S.budgets[k])])].sort((a, b) => (byCat[b] || 0) - (byCat[a] || 0));
  const dailyExp = days.map(x => mtx.filter(y => y.date === x && y.type === 'out').reduce((a, y) => a + y.amount, 0));
  const sr = inc ? Math.round((inc - exp) / inc * 100) : 0;
  return pageH(t('nav_finance'), t('fin_desc'), `<button class="btn" data-act="finShift" data-n="-1">${ic('chevL', 'sm flip')}</button><button class="btn" style="min-width:140px">${monthLabel(ref)}</button><button class="btn" data-act="finShift" data-n="1">${ic('chevR', 'sm flip')}</button>` + newBtn('tx', 'new_tx', { type: 'out', date: today(), cat: 'food' })) +
    `<div class="stat3"><div class="card stat"><small>${ic('arrowDown', 'sm')}${t('income')}</small><b class="num pos">${fmtNum(inc)}</b><span class="small muted">${esc(S.settings.currency)}</span></div>
    <div class="card stat"><small>${ic('arrowUp', 'sm')}${t('expense')}</small><b class="num neg">${fmtNum(exp)}</b><span class="small muted">${esc(S.settings.currency)}</span></div>
    <div class="card stat glow"><small>${ic('wallet', 'sm')}${t('balance')}</small><b class="num ${inc - exp >= 0 ? 'pos' : 'neg'}">${fmtNum(inc - exp)}</b><span class="small muted">${esc(S.settings.currency)}</span></div>
    <div class="card stat"><small>${ic('trend', 'sm')}${t('savings_rate')}</small><b class="num">${sr}%</b><div class="progress"><i style="width:${clamp(sr, 0, 100)}%"></i></div></div></div>
    <div class="bento"><section class="card s7"><div class="card-h"><h3>${ic('activity')}${t('expense')} · ${monthLabel(ref)}</h3></div>${barChart(dailyExp, days.map(x => fmtDate(x)), 'var(--pink)')}
      <div class="bar-labels">${days.map((x, i) => `<span>${i % 5 === 0 ? fmtDate(x, { day: 'numeric' }) : ''}</span>`).join('')}</div>
      <div class="card-h" style="margin-top:22px"><h3>${ic('grid')}${t('by_category')}</h3></div>
      ${cats.map(c => { const v = byCat[c] || 0, b = S.budgets[c] || 0, p = b ? v / b * 100 : (exp ? v / exp * 100 : 0);
        return `<div class="catbar"><span class="small">${t('cat_' + c)}</span><div class="progress ${b && v > b ? 'over' : ''}"><i style="width:${clamp(p, 0, 100)}%"></i></div><button class="btn ghost sm num" data-act="setBudget" data-c="${c}" title="${t('set_budget')}">${fmtNum(v)}${b ? ` / ${fmtNum(b)}` : ''}</button></div>`; }).join('') || emptyBox()}
      <button class="btn sm" style="margin-top:10px" data-act="setBudget" data-c="">${ic('plus', 'sm')}${t('set_budget')}</button></section>
    <section class="card s5"><div class="card-h"><h3>${ic('list')}${t('transactions')}</h3></div>
      ${mtx.map(x => `<div class="tx" data-act="edit" data-coll="tx" data-id="${x.id}" style="cursor:pointer"><div class="ic ${x.type}">${ic(x.type === 'in' ? 'arrowDown' : 'arrowUp', 'sm')}</div><div style="flex:1;min-width:0"><div style="font-weight:500">${esc(x.note || t('cat_' + x.cat))}</div><div class="small muted">${t('cat_' + x.cat)} · ${relDay(x.date)}</div></div><b class="num ${x.type === 'in' ? 'pos' : 'neg'}">${x.type === 'in' ? '+' : '−'}${fmtNum(x.amount)}</b></div>`).join('') || emptyBox()}</section></div>` + finExtra();
};

/* =================== HEALTH =================== */
VIEWS.health = () => {
  const d = UI.healthDay || today(); const h = S.health[d] || {};
  const last = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
  const series = k => last.map(x => Number(S.health[x]?.[k] || 0));
  const lbls = last.map(x => fmtDate(x));
  const M = (k, icon, c, unit, body) => `<section class="card s4 metric" style="--c:${c}"><div class="metric-top"><div class="ic">${ic(icon)}</div><div><div class="small muted">${t(k)}</div><b class="num">${fmtNum(h[k] || 0, 1)}</b> <span class="small muted">${unit}</span></div></div>${body}${barChart(series(k), lbls, c, v => fmtNum(v, 1))}</section>`;
  const stepper = (k, step) => `<div class="stepper"><button class="icon-btn" style="border:1px solid var(--line2)" data-act="hStep" data-k="${k}" data-n="${-step}">${ic('minus', 'sm')}</button><input class="input num" type="number" step="any" value="${h[k] ?? ''}" data-ch="health" data-k="${k}"><button class="icon-btn" style="border:1px solid var(--line2)" data-act="hStep" data-k="${k}" data-n="${step}">${ic('plus', 'sm')}</button></div>`;
  return pageH(t('nav_health'), t('health_desc'), `<button class="btn" data-act="hShift" data-n="-1">${ic('chevL', 'sm flip')}</button><button class="btn">${relDay(d)} · ${fmtDate(d)}</button><button class="btn" data-act="hShift" data-n="1">${ic('chevR', 'sm flip')}</button>`) +
    `<div class="bento">${M('water', 'droplet', '#8ec5ff', t('glasses'), `<div class="water-glasses">${Array.from({ length: 10 }, (_, i) => `<button class="${(h.water || 0) > i ? 'on' : ''}" data-act="water" data-n="${i + 1}"></button>`).join('')}</div>`)}
    ${M('sleep', 'moon', '#b9a2ff', t('hours'), stepper('sleep', .5))}${M('steps', 'activity', '#74e3a9', '', stepper('steps', 500))}
    ${M('workout', 'dumbbell', '#f3a6c8', t('min'), stepper('workout', 10))}${M('weight', 'scale', '#e9c78f', t('kg'), stepper('weight', .1))}
    <section class="card s4"><div class="card-h"><h3>${ic('heart')}${t('c_habits')}</h3></div>${S.habits.filter(x => x.areaId === 'a_health').map(x => `<div class="habit-mini" style="--c:${x.color}"><span>${esc(x.icon)}</span><span style="flex:1">${esc(x.title)}</span><button class="hcell ${x.log?.[d] ? 'on' : ''}" style="margin:0" data-act="habit" data-id="${x.id}" data-d="${d}">${ic('check', 'sm')}</button></div>`).join('') || emptyBox()}</section></div>`;
};

/* =================== LIBRARY =================== */
VIEWS.library = () => {
  const k = UI.libKind; const list = S.library.filter(x => !k || x.kind === k);
  const col = st => { const arr = list.filter(x => x.status === st); return `<section class="card s4"><div class="card-h"><h3>${t('st_' + st)}</h3><span class="chip" style="margin-inline-start:auto">${arr.length}</span></div>
    ${arr.map(x => `<div class="lib-card" style="margin-bottom:14px" data-act="edit" data-coll="library" data-id="${x.id}"><div class="cover" style="--c:${x.color || '#5eead4'}">${KIND_ICON[x.kind]}</div><div style="flex:1;min-width:0"><div style="font-weight:600;line-height:1.5">${esc(x.title)}</div><div class="small muted">${esc(x.creator || '')}</div>
    ${st === 'progress' ? `<div class="progress" style="margin:8px 0 2px"><i style="width:${x.progress || 0}%"></i></div><span class="small num muted">${x.progress || 0}%</span>` : ''}
    ${st === 'finished' ? `<div class="stars">${[1, 2, 3, 4, 5].map(n => `<button data-act="rate" data-id="${x.id}" data-n="${n}">${ic('star', (x.rating || 0) >= n ? '' : 'off')}</button>`).join('')}</div>` : ''}</div></div>`).join('') || emptyBox()}</section>`; };
  return pageH(t('nav_library'), t('library_desc'), newBtn('library', 'new_item', { kind: k || 'book', status: 'want', progress: 0, rating: 0, color: COLORS[Math.floor(Math.random() * COLORS.length)] })) +
    `<div class="toolbar"><div class="tabs">${['', 'book', 'movie', 'series', 'course', 'podcast'].map(x => `<button class="tab ${k === x ? 'on' : ''}" data-act="ui" data-k="libKind" data-v="${x}">${x ? KIND_ICON[x] + ' ' + t('k_' + x) : t('k_all')}</button>`).join('')}</div></div>
    <div class="bento">${col('progress')}${col('want')}${col('finished')}</div>`;
};

/* =================== JOURNAL =================== */
VIEWS.journal = () => {
  const d = UI.jDate || today(); const j = S.journal[d] || {};
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(today(), i - 29));
  const hist = Object.keys(S.journal).filter(k => k !== d && (S.journal[k].text || S.journal[k].wins || S.journal[k].mood)).sort().reverse().slice(0, 12);
  const MO = ['😞', '😕', '😐', '🙂', '😄'];
  const F = (k, ph) => `<div class="field"><label>${t(ph)}</label><textarea class="textarea" rows="${k === 'text' ? 6 : 2}" id="j_${k}" data-in="journal" data-k="${k}" data-d="${d}">${esc(j[k] || '')}</textarea></div>`;
  return pageH(t('nav_journal'), t('journal_desc'), `<button class="btn" data-act="jShift" data-n="-1">${ic('chevL', 'sm flip')}</button><button class="btn">${relDay(d)} · ${fmtDate(d)}</button><button class="btn" data-act="jShift" data-n="1">${ic('chevR', 'sm flip')}</button>`) +
    `<div class="bento"><section class="card s8"><div class="grid2"><div class="field"><label>${t('mood')}</label><div class="mood-pick">${MO.map((e, i) => `<button class="${j.mood === i + 1 ? 'on' : ''}" data-act="mood" data-n="${i + 1}" data-d="${d}">${e}</button>`).join('')}</div></div>
      <div class="field"><label>${t('energy')}</label><div class="energy-pick" style="margin-top:14px">${[1, 2, 3, 4, 5].map(n => `<button class="${(j.energy || 0) >= n ? 'on' : ''}" data-act="energy" data-n="${n}" data-d="${d}"></button>`).join('')}</div></div></div>
      <div class="grid2">${F('wins', 'j_wins')}${F('lessons', 'j_lessons')}</div><div class="grid2">${F('grat', 'j_grat')}${F('tomorrow', 'j_tomorrow')}</div>${F('text', 'j_text')}</section>
    <div class="s4" style="display:flex;flex-direction:column;gap:16px"><section class="card"><div class="card-h"><h3>${ic('trend')}${t('mood_30')}</h3></div>${barChart(last30.map(x => S.journal[x]?.mood || 0), last30.map(x => fmtDate(x) + ' ' + (MO[(S.journal[x]?.mood || 0) - 1] || '')), 'var(--violet)', v => v ? MO[v - 1] : '—')}</section>
    <section class="card"><div class="card-h"><h3>${ic('book')}${t('history')}</h3></div>${hist.map(k => `<div class="task" style="cursor:pointer" data-act="jGo" data-d="${k}"><span style="font-size:18px">${MO[(S.journal[k].mood || 3) - 1]}</span><div class="t-main"><div class="t-title">${esc(S.journal[k].wins || S.journal[k].text || '…')}</div><div class="small muted">${fmtDate(k, { weekday: 'long', day: 'numeric', month: 'long' })}</div></div></div>`).join('') || emptyBox()}</section></div></div>`;
};

/* =================== REVIEW =================== */
VIEWS.review = () => {
  const ws = weekStart(today()); const wd = weekDays(today()); const r = S.reviews[ws] = S.reviews[ws] || { checks: {}, text: '' };
  const inWeek = ts => { const x = iso(new Date(ts)); return x >= ws && x <= wd[6]; };
  const done = S.tasks.filter(x => x.status === 'done' && x.doneAt && inWeek(x.doneAt)).length;
  const focus = S.focus.filter(f => f.date >= ws && f.date <= wd[6]).reduce((a, f) => a + f.minutes, 0);
  const passed = wd.filter(x => x <= today()); const possible = S.habits.length * passed.length;
  const hits = S.habits.reduce((a, h) => a + passed.filter(x => h.log?.[x]).length, 0);
  const spent = S.tx.filter(x => x.type === 'out' && x.date >= ws && x.date <= wd[6]).reduce((a, x) => a + x.amount, 0);
  const n = Object.values(r.checks).filter(Boolean).length;
  return pageH(t('nav_review'), t('review_desc'), `<span class="chip gold">${fmtDate(ws)} – ${fmtDate(wd[6])}</span>`) +
    `<div class="stat3"><div class="card stat"><small>${ic('tasks', 'sm')}${t('rv_tasks_done')}</small><b class="num">${done}</b></div><div class="card stat"><small>${ic('timer', 'sm')}${t('rv_focus')}</small><b class="num">${focus}</b></div>
    <div class="card stat"><small>${ic('repeat', 'sm')}${t('rv_habit_rate')}</small><b class="num">${possible ? Math.round(hits / possible * 100) : 0}%</b></div><div class="card stat"><small>${ic('wallet', 'sm')}${t('rv_spent')}</small><b class="num" style="font-size:20px">${fmtNum(spent)}</b></div></div>
    <div class="bento"><section class="card s6"><div class="card-h"><h3>${ic('review')}${t('nav_review')}</h3><span class="chip teal" style="margin-inline-start:auto"><span class="num">${n}/8</span></span></div><div class="progress" style="margin-bottom:10px"><i style="width:${n / 8 * 100}%"></i></div>
      ${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `<div class="rv-item ${r.checks[i] ? 'on' : ''}" data-act="rvCheck" data-i="${i}"><span class="check ${r.checks[i] ? 'on' : ''}">${ic('check', 'sm')}</span><span>${t('rv_' + i)}</span>
      ${i === 1 ? `<a class="chip" href="#/inbox" data-stop>${inboxCount()}</a>` : i === 5 ? `<a class="chip" href="#/projects" data-stop>${ic('arrowUp', 'sm')}</a>` : i === 7 ? `<a class="chip" href="#/areas" data-stop>${ic('arrowUp', 'sm')}</a>` : ''}</div>`).join('')}</section>
    <section class="card s6"><div class="card-h"><h3>${ic('pen')}${t('rv_reflect')}</h3></div><textarea class="textarea" rows="12" id="rvText" data-in="review" data-w="${ws}" placeholder="${esc(t('rv_reflect_ph'))}">${esc(r.text)}</textarea></section></div>`;
};

/* =================== GRAPH =================== */
VIEWS.graph = () => pageH(t('nav_graph'), t('graph_desc')) +
  `<div class="card graph-wrap"><canvas id="bigGraph"></canvas><div class="graph-tip" id="gTip"></div>
  <div class="graph-legend"><span><i style="background:var(--gold)"></i>${t('me')}</span><span><i style="background:var(--pink)"></i>${t('nav_areas')}</span><span><i style="background:var(--violet)"></i>${t('nav_projects')}</span><span><i style="background:var(--accent)"></i>${t('nav_goals')}</span><span><i style="background:var(--green)"></i>${t('nav_tasks')}</span></div></div>`;
afterRenderHook('graph', () => drawGraph($('#bigGraph'), { tip: $('#gTip') }));

/* =================== SETTINGS =================== */
VIEWS.settings = () => pageH(t('nav_settings'), '') +
  `<div class="bento">${syncCardHTML()}<section class="card s6"><div class="card-h"><h3>${ic('settings')}${t('set_profile')}</h3></div>
    <div class="field"><label>${t('set_name')}</label><input class="input" id="setName" data-in="setting" data-k="name" value="${esc(S.settings.name)}"></div>
    <div class="field"><label>${t('set_currency')}</label><input class="input" id="setCur" data-in="setting" data-k="currency" value="${esc(S.settings.currency)}"></div>
    <div class="field"><label>${t('set_lang')}</label><div class="tabs"><button class="tab ${L === 'fa' ? 'on' : ''}" data-act="setLang" data-v="fa">فارسی</button><button class="tab ${L === 'en' ? 'on' : ''}" data-act="setLang" data-v="en">English</button></div></div>
    <div class="field"><label>${t('set_theme')}</label><div class="tabs"><button class="tab ${S.settings.theme !== 'light' ? 'on' : ''}" data-act="setTheme" data-v="dark">${ic('moon', 'sm')}${t('dark')}</button><button class="tab ${S.settings.theme === 'light' ? 'on' : ''}" data-act="setTheme" data-v="light">${ic('sun', 'sm')}${t('light')}</button></div></div>
    <div class="field"><label>${t('accent')}</label><div class="row">${Object.keys(ACCENTS).map(k => `<button class="orb sm" style="--c:${ACCENTS[k][0]};border:0;cursor:pointer;${S.settings.accent === k ? 'outline:2px solid var(--text);outline-offset:3px' : ''}" data-act="setAccent" data-v="${k}" title="${k}"></button>`).join('')}</div></div>
    <div class="field"><label>${t('notify')}</label><div><button class="btn" data-act="notify">${ic('bolt', 'sm')}${t('notify_enable')}</button></div></div></section>
  <section class="card s6"><div class="card-h"><h3>${ic('archive')}${t('set_data')}</h3></div><p class="small muted" style="margin-top:0">${t('data_local')}</p>
    <div class="row" style="flex-wrap:wrap"><button class="btn primary" data-act="export">${ic('download', 'sm')}${t('export')}</button><label class="btn">${ic('upload', 'sm')}${t('import')}<input type="file" accept=".json,application/json" data-ch="import" hidden></label></div>
    <div class="row" style="flex-wrap:wrap;margin-top:12px">${S.demo ? `<button class="btn" data-act="clearDemo">${ic('sparkle', 'sm')}${t('clear_demo')}</button>` : ''}<button class="btn danger" data-act="resetAll">${ic('trash', 'sm')}${t('reset_all')}</button></div>
    <div class="card-h" style="margin-top:24px"><h3>${ic('bolt')}${t('shortcuts')}</h3></div>
    ${[['Ctrl / ⌘ + K', 'sc_palette'], ['Alt + N', 'sc_capture'], ['Alt + T', 'sc_new'], ['Esc', 'sc_esc']].map(([k, l]) => `<div class="row" style="justify-content:space-between;padding:6px 0"><span>${t(l)}</span><span class="kbd" style="margin:0">${k}</span></div>`).join('')}</section></div>`;
