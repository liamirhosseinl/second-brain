/* Second Brain — v2 modules: content studio, people, lists, insights, kanban, markdown notes, plan-my-day, reminders, voice */
'use strict';
const tf = (k, v = {}) => String(t(k)).replace(/\{(\w+)\}/g, (m, x) => v[x] ?? m);

/* ---------- generic kanban ---------- */
function kanban(coll, field, cols, items, cardFn) {
  return `<div class="kanban">${cols.map((c, ci) => { const arr = items.filter(x => (x[field] || cols[0].k) === c.k);
    return `<div class="kcol" data-drop-coll="${coll}" data-drop-field="${field}" data-drop-val="${c.k}">
      <div class="kcol-h"><i style="background:${c.c}"></i><b>${c.l}</b><span class="chip">${arr.length}</span>${c.add ? `<button class="icon-btn sm" style="margin-inline-start:auto" data-act="new" data-coll="${coll}" data-def='${esc(JSON.stringify(c.add))}'>${ic('plus', 'sm')}</button>` : ''}</div>
      <div class="kcol-b">${arr.map(x => `<div class="kcard" draggable="true" data-drag="${x.id}" data-drag-coll="${coll}">${cardFn(x)}
        <div class="kmove">${ci > 0 ? `<button class="icon-btn sm" data-act="kmove" data-coll="${coll}" data-field="${field}" data-id="${x.id}" data-to="${cols[ci - 1].k}">${ic('chevL', 'sm flip')}</button>` : '<span></span>'}${ci < cols.length - 1 ? `<button class="icon-btn sm" data-act="kmove" data-coll="${coll}" data-field="${field}" data-id="${x.id}" data-to="${cols[ci + 1].k}">${ic('chevR', 'sm flip')}</button>` : ''}</div></div>`).join('') || `<div class="kempty">—</div>`}</div></div>`; }).join('')}</div>`;
}

/* ---------- markdown ---------- */
function md(src, noteId) {
  const lines = String(src || '').split('\n'); let html = '', list = null;
  const inline = s => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>')
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    .replace(/\[\[([^\]]+)\]\]/g, (m, x) => { const ex = S.notes.some(n => n.title.trim().toLowerCase() === x.trim().toLowerCase()); return `<a class="wl ${ex ? '' : 'missing'}" data-act="openNoteT" data-t="${x}">${x}</a>`; })
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|\s)#([\p{L}\p{N}_]+)/gu, '$1<span class="chip">#$2</span>');
  const close = () => { if (list) { html += `</${list}>`; list = null; } };
  lines.forEach((ln, i) => {
    let m;
    if ((m = ln.match(/^\s*[-*] \[( |x|X)\] ?(.*)$/))) { if (list !== 'ul') { close(); html += '<ul class="md-check">'; list = 'ul'; }
      const on = m[1] !== ' '; html += `<li class="${on ? 'done' : ''}"><button class="check ${on ? 'on' : ''}" ${noteId ? `data-act="mdToggle" data-id="${noteId}" data-line="${i}"` : ''}>${ic('check', 'sm')}</button><span>${inline(m[2])}</span></li>`; return; }
    if ((m = ln.match(/^\s*[-*] (.*)$/))) { if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; } html += `<li>${inline(m[1])}</li>`; return; }
    if ((m = ln.match(/^\s*\d+[.)] (.*)$/))) { if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; return; }
    close();
    if ((m = ln.match(/^(#{1,3}) (.*)$/))) html += `<h${m[1].length + 2}>${inline(m[2])}</h${m[1].length + 2}>`;
    else if ((m = ln.match(/^> ?(.*)$/))) html += `<blockquote>${inline(m[1])}</blockquote>`;
    else if (/^---+$/.test(ln.trim())) html += '<hr>';
    else if (ln.trim()) html += `<p>${inline(ln)}</p>`;
  });
  close(); return `<div class="md">${html}</div>`;
}
const plain = s => String(s || '').replace(/[#>*=`]|\[\[|\]\]|- \[.\]/g, '').trim();
function openNote(n) {
  const back = S.notes.filter(x => x.id !== n.id && (x.body || '').toLowerCase().includes('[[' + n.title.trim().toLowerCase() + ']]'));
  const o = openModal(`<div class="modal-h"><span class="chip ${NOTE_C[n.type] || ''}">${ic(NOTE_IC[n.type] || 'note', 'sm')}${t('type_' + n.type)}</span>${areaChip(n.areaId)}${projChip(n.projectId)}<button class="icon-btn" data-close>${ic('x')}</button></div>
    <h2 class="note-title">${esc(n.title)}</h2>${md(n.body, n.id)}
    ${(n.tags || []).length ? `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:14px">${n.tags.map(g => `<span class="chip">#${esc(g)}</span>`).join('')}</div>` : ''}
    ${back.length ? `<div class="backlinks"><div class="small muted">${ic('link', 'sm')} ${t('backlinks')}</div>${back.map(b => `<a class="wl" data-act="viewNote" data-id="${b.id}">${esc(b.title)}</a>`).join('')}</div>` : ''}
    <div class="modal-f" style="margin-top:20px"><span class="small muted">${fmtDate(iso(new Date(n.createdAt)), { day: 'numeric', month: 'long', year: 'numeric' })}</span><span class="sp"></span>
    <button class="btn" data-act="toTaskFromNote" data-id="${n.id}">${ic('tasks', 'sm')}${t('to_task')}</button><button class="btn primary" data-act="edit" data-coll="notes" data-id="${n.id}">${ic('edit', 'sm')}${t('edit')}</button></div>`, 'wide');
  o.querySelector('[data-close]').onclick = closeModal;
}
const TPL = {
  fa: {
    meeting: ['note', 'جلسه: ', '## 📅 جلسه\n**تاریخ:** \n**حاضرین:** \n\n## نکات کلیدی\n- \n\n## تصمیم‌ها\n- \n\n## اقدامات بعدی\n- [ ] '],
    video: ['idea', 'ایده ویدیو: ', '## 🎬 ایده ویدیو\n**هوک (۳ ثانیه اول):** \n**پلتفرم:** \n\n## ساختار\n1. هوک\n2. بدنه\n3. CTA\n\n## شات‌لیست\n- [ ] \n\n## کپشن\n'],
    report: ['report', 'گزارش: ', '## 📊 گزارش\n**دوره:** \n\n## چه کردم\n- \n\n## نتایج و اعداد\n- \n\n## مشکلات\n- \n\n## قدم بعدی\n- [ ] '],
    book: ['resource', 'خلاصه کتاب: ', '## 📖 خلاصه کتاب\n**نویسنده:** \n\n## ایده اصلی در یک جمله\n\n## ۳ درس مهم\n1. \n2. \n3. \n\n## نقل‌قول‌های طلایی\n> \n\n## چطور به کار ببرم؟\n- [ ] '],
    weekly: ['note', 'برنامه هفته', '## 🗓 برنامه هفته\n## ۳ هدف اصلی\n1. \n2. \n3. \n\n## باید انجام بشه\n- [ ] \n\n## یادم باشه\n- '],
  },
  en: {
    meeting: ['note', 'Meeting: ', '## 📅 Meeting\n**Date:** \n**Attendees:** \n\n## Key points\n- \n\n## Decisions\n- \n\n## Next actions\n- [ ] '],
    video: ['idea', 'Video idea: ', '## 🎬 Video idea\n**Hook (first 3s):** \n**Platform:** \n\n## Structure\n1. Hook\n2. Body\n3. CTA\n\n## Shot list\n- [ ] \n\n## Caption\n'],
    report: ['report', 'Report: ', '## 📊 Report\n**Period:** \n\n## What I did\n- \n\n## Results & numbers\n- \n\n## Problems\n- \n\n## Next step\n- [ ] '],
    book: ['resource', 'Book notes: ', '## 📖 Book notes\n**Author:** \n\n## Big idea in one sentence\n\n## 3 key lessons\n1. \n2. \n3. \n\n## Golden quotes\n> \n\n## How will I apply it?\n- [ ] '],
    weekly: ['note', 'Weekly plan', '## 🗓 Weekly plan\n## 3 main goals\n1. \n2. \n3. \n\n## Must do\n- [ ] \n\n## Remember\n- '],
  }
};

/* =================== CONTENT STUDIO =================== */
const STAGES = [['idea', '#e9c78f'], ['script', '#b9a2ff'], ['shoot', '#f3a6c8'], ['edit', '#8ec5ff'], ['published', '#74e3a9']];
const PLATFORMS = { instagram: '📸 Instagram', youtube: '▶️ YouTube', tiktok: '🎵 TikTok', linkedin: '💼 LinkedIn', telegram: '✈️ Telegram', other: '🌐 Other' };
const FORMATS = ['reel', 'video', 'short', 'post', 'carousel', 'story'];
VIEWS.content = () => {
  const items = S.content; const d = today(); const mk = pmonth(d);
  const pub = items.filter(x => x.stage === 'published' && x.publishDate && pmonth(x.publishDate) === mk).length;
  const prod = items.filter(x => ['script', 'shoot', 'edit'].includes(x.stage)).length;
  const next = items.filter(x => x.stage !== 'published' && x.publishDate && x.publishDate >= d).sort((a, b) => a.publishDate.localeCompare(b.publishDate))[0];
  const card = x => `<div data-act="edit" data-coll="content" data-id="${x.id}" style="cursor:pointer"><div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip">${(PLATFORMS[x.platform] || '').split(' ')[0]} ${t('fmt_' + (x.format || 'reel'))}</span>${x.publishDate ? dueChip(x.publishDate, x.stage === 'published') : ''}</div>
    <b style="display:block;margin:8px 0 2px;line-height:1.6">${esc(x.title)}</b>${x.hook ? `<div class="small muted" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">🎣 ${esc(x.hook)}</div>` : ''}</div>`;
  return pageH(t('nav_content'), t('content_desc'), newBtn('content', 'new_content', { stage: 'idea', platform: 'instagram', format: 'reel', color: COLORS[1] })) +
    `<div class="stat3"><div class="card stat"><small>${ic('bulb', 'sm')}${t('st_idea')}</small><b class="num">${items.filter(x => x.stage === 'idea').length}</b></div>
    <div class="card stat"><small>${ic('film', 'sm')}${t('in_production')}</small><b class="num">${prod}</b></div>
    <div class="card stat"><small>${ic('check', 'sm')}${t('published_month')}</small><b class="num pos">${pub}</b></div>
    <div class="card stat glow"><small>${ic('calendar', 'sm')}${t('next_publish')}</small><b style="font-size:15px;line-height:1.6">${next ? esc(next.title) : '—'}</b>${next ? `<span class="small muted">${relDay(next.publishDate)}</span>` : ''}</div></div>` +
    kanban('content', 'stage', STAGES.map(([k, c]) => ({ k, c, l: t('st_' + k), add: k === 'idea' ? { stage: 'idea', platform: 'instagram', format: 'reel' } : null })), items, card);
};

/* =================== PEOPLE =================== */
function nextBday(b) { if (!b) return null; const md_ = b.slice(5); let y = +today().slice(0, 4); let n = y + '-' + md_; if (n < today()) n = (y + 1) + '-' + md_; return n; }
const sinceDays = s => s ? diffDays(today(), s) : null;
const dueContact = p => p.freq && (sinceDays(p.lastContact) === null || sinceDays(p.lastContact) >= p.freq);
function avatar(p, sz = '') { return `<span class="orb ${sz} avatar" style="--c:${p.color || '#5eead4'}">${esc((p.name || '?').trim().charAt(0))}</span>`; }
VIEWS.people = () => {
  const due = S.people.filter(dueContact);
  const bd = S.people.filter(p => p.birthday).map(p => ({ p, n: nextBday(p.birthday) })).filter(x => diffDays(x.n, today()) <= 45).sort((a, b) => a.n.localeCompare(b.n));
  const rel = r => t('rel_' + (r || 'other'));
  return pageH(t('nav_people'), t('people_desc'), newBtn('people', 'new_person', { relation: 'friend', freq: 14, color: COLORS[Math.floor(Math.random() * 8)] })) +
    `<div class="bento"><section class="card s6"><div class="card-h"><h3>${ic('phone')}${t('reach_out')}</h3><span class="chip ${due.length ? 'red' : ''}" style="margin-inline-start:auto">${due.length}</span></div>
      ${due.map(p => `<div class="task">${avatar(p, 'sm')}<div class="t-main" data-act="edit" data-coll="people" data-id="${p.id}"><div class="t-title">${esc(p.name)}</div><div class="small muted">${p.lastContact ? tf('days_ago', { n: sinceDays(p.lastContact) }) : t('never')}</div></div><button class="btn sm" data-act="contacted" data-id="${p.id}">${ic('check', 'sm')}${t('contacted')}</button></div>`).join('') || emptyBox(t('all_good'))}</section>
    <section class="card s6"><div class="card-h"><h3>${ic('gift')}${t('upcoming_bdays')}</h3></div>
      ${bd.map(({ p, n }) => { const dd = diffDays(n, today()); return `<div class="task">${avatar(p, 'sm')}<div class="t-main" data-act="edit" data-coll="people" data-id="${p.id}"><div class="t-title">${esc(p.name)}</div><div class="small muted">${fmtDate(n, { day: 'numeric', month: 'long' })}</div></div><span class="chip ${dd <= 3 ? 'red' : dd <= 10 ? 'gold' : ''}">🎂 ${dd === 0 ? t('today') : tf('in_days', { n: dd })}</span></div>`; }).join('') || emptyBox()}</section></div>
    <div class="cards" style="margin-top:16px">${S.people.map(p => { const sd = sinceDays(p.lastContact); return `<div class="card pcard"><div class="row">${avatar(p)}<div style="flex:1;min-width:0" data-act="edit" data-coll="people" data-id="${p.id}"><h4>${esc(p.name)}</h4><span class="chip">${rel(p.relation)}</span></div></div>
      <div class="meta">${p.birthday ? `<span class="chip">🎂 ${fmtDate(p.birthday, { day: 'numeric', month: 'long' })}</span>` : ''}${p.freq ? `<span class="chip ${dueContact(p) ? 'red' : 'teal'}">${ic('repeat', 'sm')}${tf('every_n', { n: p.freq })}</span>` : ''}</div>
      ${p.notes ? `<div class="small muted">${esc(p.notes)}</div>` : ''}
      <div class="foot"><span>${sd === null ? t('never') : tf('last_contact_n', { n: sd })}</span><span style="margin-inline-start:auto"></span>${p.phone ? `<a class="icon-btn sm" href="tel:${esc(p.phone)}" data-stop>${ic('phone', 'sm')}</a>` : ''}<button class="btn sm" data-act="contacted" data-id="${p.id}">${ic('check', 'sm')}${t('contacted')}</button></div></div>`; }).join('') || `<div class="card">${emptyBox()}</div>`}</div>`;
};

/* =================== LISTS =================== */
VIEWS.lists = () => pageH(t('nav_lists'), t('lists_desc'), newBtn('lists', 'new_list', { icon: '📝' })) +
  `<div class="cards">${S.lists.map(l => { const items = l.items || []; const dn = items.filter(i => i.d).length;
    return `<div class="card list-card"><div class="card-h"><h3><span style="font-size:18px">${esc(l.icon || '📝')}</span>${esc(l.title)}</h3><span class="chip num" style="margin-inline-start:auto">${dn}/${items.length}</span>
      <button class="icon-btn sm" data-act="edit" data-coll="lists" data-id="${l.id}">${ic('edit', 'sm')}</button></div>
      <div class="progress" style="margin-bottom:8px"><i style="width:${items.length ? dn / items.length * 100 : 0}%"></i></div>
      ${items.map(i => `<div class="li-row ${i.d ? 'done' : ''}"><button class="check ${i.d ? 'on' : ''}" data-act="liT" data-l="${l.id}" data-i="${i.id}">${ic('check', 'sm')}</button><span>${esc(i.t)}</span><button class="icon-btn sm" data-act="liD" data-l="${l.id}" data-i="${i.id}">${ic('x', 'sm')}</button></div>`).join('')}
      <div class="add-inline">${ic('plus', 'sm')}<input id="la_${l.id}" data-listadd="${l.id}" placeholder="${t('add_item')}"></div>
      ${dn ? `<button class="btn ghost sm" style="margin-top:8px" data-act="liClear" data-l="${l.id}">${t('clear_done')}</button>` : ''}</div>`; }).join('') || `<div class="card">${emptyBox()}</div>`}</div>`;

/* =================== INSIGHTS =================== */
function yearProgress() {
  const d = today(); let start = d;
  const yk = s => L === 'fa' ? pmonth(s).split('-')[0] : s.slice(0, 4);
  const y = yk(d); for (let i = 0; i < 370; i++) { const p = addDays(start, -1); if (yk(p) !== y) break; start = p; }
  let end = d; for (let i = 0; i < 370; i++) { const p = addDays(end, 1); if (yk(p) !== y) break; end = p; }
  const total = diffDays(end, start) + 1, gone = diffDays(d, start) + 1;
  return { y, pct: Math.round(gone / total * 100), left: total - gone };
}
VIEWS.insights = () => {
  const d = today(); const D = Array.from({ length: 30 }, (_, i) => addDays(d, i - 29)); const lbl = D.map(x => fmtDate(x));
  const doneDay = x => S.tasks.filter(k => k.status === 'done' && k.doneAt && iso(new Date(k.doneAt)) === x).length;
  const done = D.map(doneDay); const focus = D.map(x => S.focus.filter(f => f.date === x).reduce((a, f) => a + f.minutes, 0));
  const moods = D.map(x => S.journal[x]?.mood || 0); const mv = moods.filter(Boolean);
  const hits = S.habits.reduce((a, h) => a + D.filter(x => h.log?.[x]).length, 0); const hr = S.habits.length ? Math.round(hits / (S.habits.length * 30) * 100) : 0;
  const spent = S.tx.filter(x => x.type === 'out' && x.date >= D[0]).reduce((a, x) => a + x.amount, 0);
  const sum = a => a.reduce((x, y) => x + y, 0);
  // weekday
  const wd = Array(7).fill(0); S.tasks.forEach(k => { if (k.status === 'done' && k.doneAt && Date.now() - k.doneAt < 90 * 864e5) wd[new Date(k.doneAt).getDay()]++; });
  const bestW = wd.indexOf(Math.max(...wd)); const bestName = Math.max(...wd) ? new Intl.DateTimeFormat(L === 'fa' ? 'fa-IR' : 'en-US', { weekday: 'long' }).format(new Date(2024, 0, 7 + bestW)) : '—';
  // mood vs productivity
  const hi = D.filter((x, i) => moods[i] >= 4), lo = D.filter((x, i) => moods[i] && moods[i] <= 2);
  const avg = arr => arr.length ? (sum(arr.map(doneDay)) / arr.length).toFixed(1) : null;
  const yp = yearProgress();
  const ins = [];
  if (Math.max(...wd)) ins.push(tf('ins_best_day', { d: bestName }));
  if (avg(hi) && avg(lo)) ins.push(tf('ins_mood', { a: avg(hi), b: avg(lo) }));
  const ov = S.tasks.filter(k => k.status !== 'done' && k.due && k.due < d).length; if (ov) ins.push(tf('ins_overdue', { n: ov }));
  const neglected = sortedAreas().filter(a => (a.score || 0) <= 4); if (neglected.length) ins.push(tf('ins_low_area', { a: neglected.map(areaName).join('، ') }));
  if (inboxCount() > 7) ins.push(tf('ins_inbox', { n: inboxCount() }));
  const dueP = S.people.filter(dueContact).length; if (dueP) ins.push(tf('ins_people', { n: dueP }));
  if (!ins.length) ins.push(t('ins_great'));
  const byArea = sortedAreas().map(a => ({ a, open: S.tasks.filter(k => k.areaId === a.id && k.status !== 'done').length, dn: S.tasks.filter(k => k.areaId === a.id && k.status === 'done' && k.doneAt && Date.now() - k.doneAt < 30 * 864e5).length }));
  const maxA = Math.max(1, ...byArea.map(x => x.open + x.dn));
  return pageH(t('nav_insights'), t('insights_desc')) +
    `<div class="stat3"><div class="card stat"><small>${ic('tasks', 'sm')}${t('ins_done30')}</small><b class="num">${sum(done)}</b></div><div class="card stat"><small>${ic('timer', 'sm')}${t('ins_focus30')}</small><b class="num">${fmtNum(sum(focus) / 60, 1)} <span class="small muted">${t('hours')}</span></b></div>
    <div class="card stat"><small>${ic('repeat', 'sm')}${t('rv_habit_rate')}</small><b class="num">${hr}%</b></div><div class="card stat"><small>${ic('pen', 'sm')}${t('ins_mood_avg')}</small><b>${mv.length ? ['😞', '😕', '😐', '🙂', '😄'][Math.round(sum(mv) / mv.length) - 1] + ' <span class="num small muted">' + (sum(mv) / mv.length).toFixed(1) + '</span>' : '—'}</b></div></div>
    <div class="bento"><section class="card s8"><div class="card-h"><h3>${ic('sparkle')}${t('ins_title')}</h3></div>${ins.map(s => `<div class="insight">${ic('bolt', 'sm')}<span>${s}</span></div>`).join('')}</section>
    <section class="card s4 year-card"><div class="card-h"><h3>${ic('clock')}${tf('year_of', { y: yp.y })}</h3></div><div class="ring" style="--p:${yp.pct};width:130px;height:130px;margin:6px auto"><span style="width:110px;height:110px;font-size:26px" class="num">${yp.pct}%</span></div><p class="small muted" style="text-align:center;margin-bottom:0">${tf('days_left', { n: yp.left })}</p></section>
    <section class="card s6"><div class="card-h"><h3>${ic('tasks')}${t('ins_done_chart')}</h3></div>${barChart(done, lbl, 'var(--accent)')}<div class="bar-labels">${D.map((x, i) => `<span>${i % 6 === 0 ? fmtDate(x, { day: 'numeric' }) : ''}</span>`).join('')}</div></section>
    <section class="card s6"><div class="card-h"><h3>${ic('timer')}${t('ins_focus_chart')}</h3></div>${barChart(focus, lbl, 'var(--gold)', v => v + ' ' + t('min'))}<div class="bar-labels">${D.map((x, i) => `<span>${i % 6 === 0 ? fmtDate(x, { day: 'numeric' }) : ''}</span>`).join('')}</div></section>
    <section class="card s6"><div class="card-h"><h3>${ic('compass')}${t('ins_by_area')}</h3><span class="small muted" style="margin-inline-start:auto"><span class="dotl" style="background:var(--accent)"></span>${t('done_count')} <span class="dotl" style="background:var(--line2)"></span>${t('st_todo')}</span></div>
      ${byArea.map(({ a, open, dn }) => `<div class="catbar"><span class="small">${a.icon} ${esc(areaName(a))}</span><div class="stack"><i style="width:${dn / maxA * 100}%;background:${a.color}"></i><i style="width:${open / maxA * 100}%;background:var(--line2)"></i></div><span class="small num muted">${dn}/${open + dn}</span></div>`).join('')}</section>
    <section class="card s6"><div class="card-h"><h3>${ic('trend')}${t('mood_30')}</h3></div>${barChart(moods, lbl, 'var(--violet)', v => v ? ['😞', '😕', '😐', '🙂', '😄'][v - 1] : '—')}
      <div class="card-h" style="margin-top:20px"><h3>${ic('wallet')}${t('ins_spent30')}</h3><b class="num neg" style="margin-inline-start:auto">${fmtNum(spent)} <span class="small muted">${esc(S.settings.currency)}</span></b></div></section></div>`;
};

/* =================== PLAN MY DAY / SHUTDOWN =================== */
let PD_MODE = 'morning';
function planDay(mode = PD_MODE) {
  PD_MODE = mode; const d = today(), tm = addDays(d, 1);
  const row = (x, btns) => `<div class="task"><span class="prio p${x.priority || 3}"></span><div class="t-main"><div class="t-title">${esc(x.title)}</div><div class="t-meta">${dueChip(x.due)}${areaChip(x.areaId)}</div></div>${btns}</div>`;
  const b = (act, id, label, cls = '') => `<button class="btn sm ${cls}" data-act="${act}" data-id="${id}">${label}</button>`;
  let body = '';
  if (mode === 'morning') {
    const overdue = S.tasks.filter(x => x.status !== 'done' && x.due && x.due < d);
    const inbox = S.tasks.filter(x => x.status !== 'done' && x.inbox);
    const sugg = S.tasks.filter(x => x.status !== 'done' && !x.inbox && x.due !== d && !(x.due && x.due < d) && (((x.priority || 3) <= 2 && !x.due) || (x.due && diffDays(x.due, d) <= 3))).slice(0, 8);
    const todayN = S.tasks.filter(x => x.due === d && x.status !== 'done').length;
    body = `<div class="pd-step"><b>1 · ${t('c_highlight')}</b><div class="highlight" style="margin-top:8px">${ic('star')}<input data-in="highlight" value="${esc(S.daily[d]?.highlight || '')}" placeholder="${esc(t('highlight_ph'))}"></div></div>
      <div class="pd-step"><b>2 · ${t('overdue')}</b> <span class="chip red">${overdue.length}</span>${overdue.map(x => row(x, b('pdToday', x.id, t('today'), 'primary') + b('pdTomorrow', x.id, t('tomorrow')) + b('toggleTask', x.id, ic('check', 'sm')))).join('') || `<div class="small muted">✓</div>`}</div>
      <div class="pd-step"><b>3 · ${t('nav_inbox')}</b> <span class="chip">${inbox.length}</span>${inbox.map(x => row(x, b('pdToday', x.id, t('today'), 'primary') + b('pdTomorrow', x.id, t('tomorrow')) + b('del', x.id, ic('trash', 'sm')).replace('data-act="del"', 'data-act="del" data-coll="tasks"'))).join('') || `<div class="small muted">✓</div>`}</div>
      <div class="pd-step"><b>4 · ${t('pd_suggest')}</b>${sugg.map(x => row(x, b('pdToday', x.id, '+ ' + t('today'), 'primary'))).join('') || `<div class="small muted">—</div>`}</div>
      <div class="pd-sum">${tf('pd_summary', { n: todayN })}${todayN > 7 ? ' ' + t('pd_toomany') : ''}</div>`;
  } else {
    const doneT = S.tasks.filter(x => x.status === 'done' && x.doneAt && iso(new Date(x.doneAt)) === d).length;
    const left = S.tasks.filter(x => x.status !== 'done' && x.due && x.due <= d);
    const j = S.journal[d] || {};
    body = `<div class="pd-hero">🌙 ${tf('sd_done', { n: doneT, m: focusToday() })}</div>
      <div class="pd-step"><b>1 · ${t('sd_left')}</b> <span class="chip">${left.length}</span>${left.length > 1 ? `<button class="btn sm" style="margin-inline-start:8px" data-act="pdAllTomorrow">${t('sd_all_tomorrow')}</button>` : ''}${left.map(x => row(x, b('pdTomorrow', x.id, t('tomorrow')) + b('toggleTask', x.id, ic('check', 'sm')))).join('') || `<div class="small muted">✓ ${t('all_good')}</div>`}</div>
      <div class="pd-step"><b>2 · ${t('mood')}</b><div class="mood-pick" style="margin-top:8px">${['😞', '😕', '😐', '🙂', '😄'].map((e, i) => `<button class="${j.mood === i + 1 ? 'on' : ''}" data-act="mood" data-n="${i + 1}" data-d="${d}">${e}</button>`).join('')}</div></div>
      <div class="pd-step"><b>3 · ${t('j_wins')}</b><textarea class="textarea" rows="2" data-in="journal" data-k="wins" data-d="${d}">${esc(j.wins || '')}</textarea></div>
      <div class="pd-step"><b>4 · ${t('j_tomorrow')}</b><input class="input" data-in="tmrHL" value="${esc(S.daily[tm]?.highlight || '')}"></div>`;
  }
  const o = openModal(`<div class="modal-h"><h2>${mode === 'morning' ? '☀️ ' + t('plan_day') : '🌙 ' + t('shutdown')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div><div id="planModal">${body}</div>
    <div class="modal-f" style="margin-top:16px"><span class="sp"></span><button class="btn primary" data-close>${mode === 'morning' ? t('pd_go') : t('sd_go')}</button></div>`, 'wide');
  o.querySelectorAll('[data-close]').forEach(x => x.onclick = () => { closeModal(); render(); });
}

/* =================== CALENDAR MONTH =================== */
function calModeTabs() { return `<div class="tabs" style="margin-bottom:14px"><button class="tab ${UI.calMode !== 'month' ? 'on' : ''}" data-act="ui" data-k="calMode" data-v="week">${t('week')}</button><button class="tab ${UI.calMode === 'month' ? 'on' : ''}" data-act="ui" data-k="calMode" data-v="month">${t('month')}</button></div>`; }
function calMonth() {
  const ref = UI.calDay || today(); const days = monthDays(ref); const d0 = today();
  const lead = (new Date(days[0] + 'T00:00:00').getDay() - (L === 'fa' ? 6 : 1) + 7) % 7;
  const heads = weekDays(days[0]).map(x => weekday(x, 'short'));
  const cell = x => { const ev = S.events.filter(e => e.date === x), tk = S.tasks.filter(k => k.due === x && k.status !== 'done'), ct = S.content.filter(c => c.publishDate === x), bd = S.people.filter(p => p.birthday && p.birthday.slice(5) === x.slice(5));
    const items = [...bd.map(p => ['🎂 ' + p.name, '#ffb27a']), ...ct.map(c => ['🎬 ' + c.title, '#f3a6c8']), ...ev.map(e => [e.title, e.color || '#5eead4']), ...tk.map(k => [k.title, area(k.areaId)?.color || '#b9a2ff'])];
    return `<button class="mcell ${x === d0 ? 'today' : ''} ${x === UI.calDay ? 'on' : ''}" data-act="calPick" data-d="${x}"><b class="num">${fmtDate(x, { day: 'numeric' })}</b>${items.slice(0, 3).map(([s, c]) => `<span class="mev" style="--c:${c}">${esc(s)}</span>`).join('')}${items.length > 3 ? `<span class="small muted">+${items.length - 3}</span>` : ''}</button>`; };
  return pageH(t('nav_calendar'), t('cal_desc'), `<button class="btn" data-act="calShiftM" data-n="-1">${ic('chevL', 'sm flip')}</button><button class="btn" style="min-width:140px">${monthLabel(ref)}</button><button class="btn" data-act="calShiftM" data-n="1">${ic('chevR', 'sm flip')}</button>` + newBtn('events', 'new_event', { date: ref })) +
    calModeTabs() + `<div class="card" style="padding:12px"><div class="mgrid">${heads.map(h => `<div class="mhead">${h}</div>`).join('')}${'<div></div>'.repeat(lead)}${days.map(cell).join('')}</div></div>`;
}

/* =================== FINANCE EXTRA =================== */
function finExtra() {
  const months = []; let ref = monthStart(UI.finMonth || today());
  for (let i = 0; i < 6; i++) { months.unshift(ref); ref = monthStart(addDays(ref, -1)); }
  const inc = months.map(m => S.tx.filter(x => x.type === 'in' && pmonth(x.date) === pmonth(m)).reduce((a, x) => a + x.amount, 0));
  const exp = months.map(m => S.tx.filter(x => x.type === 'out' && pmonth(x.date) === pmonth(m)).reduce((a, x) => a + x.amount, 0));
  const mx = Math.max(1, ...inc, ...exp);
  const monthly = S.subs.reduce((a, s) => a + (s.cycle === 'yearly' ? s.amount / 12 : s.amount), 0);
  return `<div class="bento" style="margin-top:16px"><section class="card s7"><div class="card-h"><h3>${ic('trend')}${t('trend6')}</h3><span class="small muted" style="margin-inline-start:auto"><span class="dotl" style="background:var(--green)"></span>${t('income')} <span class="dotl" style="background:var(--pink)"></span>${t('expense')}</span></div>
    <div class="gbars">${months.map((m, i) => `<div class="gb"><div class="gb-bars"><i style="height:${inc[i] / mx * 100}%;background:var(--green)" title="${fmtNum(inc[i])}"></i><i style="height:${exp[i] / mx * 100}%;background:var(--pink)" title="${fmtNum(exp[i])}"></i></div><span>${fmtDate(m, { month: 'short' })}</span></div>`).join('')}</div></section>
  <section class="card s5"><div class="card-h"><h3>${ic('repeat')}${t('subs')}</h3><span class="chip gold" style="margin-inline-start:auto">${fmtNum(monthly)} / ${t('month')}</span><button class="icon-btn sm" data-act="new" data-coll="subs" data-def='${JSON.stringify({ cycle: 'monthly', next: today(), cat: 'work' })}'>${ic('plus', 'sm')}</button></div>
    ${S.subs.slice().sort((a, b) => (a.next || '').localeCompare(b.next || '')).map(s => { const dd = s.next ? diffDays(s.next, today()) : 99; return `<div class="tx"><div class="ic out">${ic('repeat', 'sm')}</div><div style="flex:1;min-width:0;cursor:pointer" data-act="edit" data-coll="subs" data-id="${s.id}"><div style="font-weight:500">${esc(s.title)}</div><div class="small muted">${t('cycle_' + s.cycle)} · <span class="${dd <= 3 ? 'neg' : ''}">${s.next ? relDay(s.next) : '—'}</span></div></div><b class="num">${fmtNum(s.amount)}</b><button class="btn sm" data-act="subPaid" data-id="${s.id}">${t('paid')}</button></div>`; }).join('') || emptyBox()}</section></div>`;
}

/* =================== REMINDERS =================== */
function notifyUser(msg) { toast(msg); sparkle(); try { if (Notification.permission === 'granted') new Notification(t('appName'), { body: msg, icon: 'icons/icon-192.png' }); } catch (e) { } }
function checkReminders() {
  const d = today(), now = new Date(), nowM = now.getHours() * 60 + now.getMinutes();
  let fired = {}; try { fired = JSON.parse(localStorage.getItem('sb.fired') || '{}'); } catch (e) { }
  const toM = s => { const [h, m] = (s || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const fire = (k, msg, atM) => { if (fired[k]) return; fired[k] = d; if (atM === undefined || nowM - atM <= 15) notifyUser(msg); };
  S.tasks.forEach(x => { if (x.due === d && x.time && x.status !== 'done' && toM(x.time) <= nowM) fire('t' + x.id + d, '⏰ ' + x.title, toM(x.time)); });
  S.events.forEach(e => { if (e.date === d && e.start && toM(e.start) - 5 <= nowM && toM(e.start) >= nowM - 15) fire('e' + e.id + d, '📅 ' + e.title + ' · ' + e.start, toM(e.start) - 5); });
  S.people.forEach(p => { if (p.birthday && p.birthday.slice(5) === d.slice(5)) fire('b' + p.id + d, '🎂 ' + tf('bday_today', { n: p.name })); });
  S.subs.forEach(s => { if (s.next === d) fire('s' + s.id + d, '💳 ' + tf('sub_today', { n: s.title })); });
  for (const k in fired) if (fired[k] !== d) delete fired[k];
  try { localStorage.setItem('sb.fired', JSON.stringify(fired)); } catch (e) { }
}
setInterval(checkReminders, 30000); setTimeout(checkReminders, 2500);

/* =================== VOICE =================== */
function voiceInput(btn, targetSel) {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) { toast(t('voice_na'), 'err'); return; }
  if (btn.classList.contains('rec')) { try { window._rec && window._rec.stop(); } catch (e) { } return; }
  const r = new R(); window._rec = r; r.lang = L === 'fa' ? 'fa-IR' : 'en-US'; r.interimResults = true; r.continuous = false;
  const inp = $(targetSel); const base = inp ? inp.value.trim() : '';
  btn.classList.add('rec'); toast('🎙 ' + t('voice_listen'));
  r.onresult = e => { let s = ''; for (const res of e.results) s += res[0].transcript; if (inp) inp.value = (base ? base + ' ' : '') + s; };
  r.onend = () => { btn.classList.remove('rec'); inp && inp.focus(); };
  r.onerror = e => { btn.classList.remove('rec'); toast(t('voice_err') + ' (' + e.error + ')', 'err'); };
  try { r.start(); } catch (e) { btn.classList.remove('rec'); }
}

/* dashboard extra cards */
function dashExtra() {
  const due = S.people.filter(dueContact).slice(0, 4);
  const bd = S.people.filter(p => p.birthday).map(p => ({ p, n: nextBday(p.birthday) })).filter(x => diffDays(x.n, today()) <= 14);
  const subs = S.subs.filter(s => s.next && diffDays(s.next, today()) <= 5);
  const cnt = k => S.content.filter(x => x.stage === k).length;
  const nextC = S.content.filter(x => x.stage !== 'published' && x.publishDate && x.publishDate >= today()).sort((a, b) => a.publishDate.localeCompare(b.publishDate)).slice(0, 3);
  return `<section class="card s4"><div class="card-h"><h3>${ic('film')}${t('nav_content')}</h3><div class="acts"><a class="btn ghost sm" href="#/content">${t('open_all')}</a></div></div>
    <div class="pipeline">${STAGES.map(([k, c]) => `<div style="--c:${c}"><b class="num">${cnt(k)}</b><span>${t('st_' + k)}</span></div>`).join('')}</div>
    ${nextC.map(x => `<div class="sched-item" style="--c:${x.color || 'var(--pink)'}" data-act="edit" data-coll="content" data-id="${x.id}"><span class="bar"></span><span style="flex:1">${esc(x.title)}</span>${dueChip(x.publishDate)}</div>`).join('')}</section>
  <section class="card s4"><div class="card-h"><h3>${ic('users')}${t('stay_touch')}</h3><div class="acts"><a class="btn ghost sm" href="#/people">${t('open_all')}</a></div></div>
    ${bd.map(({ p, n }) => `<div class="habit-mini">${avatar(p, 'sm')}<span style="flex:1">${esc(p.name)}</span><span class="chip gold">🎂 ${diffDays(n, today()) === 0 ? t('today') : tf('in_days', { n: diffDays(n, today()) })}</span></div>`).join('')}
    ${due.map(p => `<div class="habit-mini">${avatar(p, 'sm')}<span style="flex:1">${esc(p.name)}<div class="small muted">${p.lastContact ? tf('days_ago', { n: sinceDays(p.lastContact) }) : t('never')}</div></span><button class="btn sm" data-act="contacted" data-id="${p.id}">${ic('check', 'sm')}</button></div>`).join('')}
    ${!bd.length && !due.length ? emptyBox(t('all_good')) : ''}</section>
  <section class="card s4"><div class="card-h"><h3>${ic('wallet')}${t('upcoming_pay')}</h3><div class="acts"><a class="btn ghost sm" href="#/finance">${t('open_all')}</a></div></div>
    ${subs.map(s => `<div class="tx"><div class="ic out">${ic('repeat', 'sm')}</div><div style="flex:1"><div style="font-weight:500">${esc(s.title)}</div><div class="small muted">${relDay(s.next)}</div></div><b class="num">${fmtNum(s.amount)}</b><button class="btn sm" data-act="subPaid" data-id="${s.id}">${t('paid')}</button></div>`).join('') || emptyBox(t('all_good'))}
    ${S.lists.slice(0, 2).map(l => `<a class="habit-mini" href="#/lists" style="text-decoration:none"><span>${esc(l.icon)}</span><span style="flex:1">${esc(l.title)}</span><span class="chip num">${(l.items || []).filter(i => !i.d).length}</span></a>`).join('')}</section>`;
}
