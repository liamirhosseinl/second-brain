/* Second Brain — events & boot */
'use strict';
const day = el => el.dataset.d || today();
const ACT = {
  go: el => go(el.dataset.v, el.dataset.arg),
  drawer: () => { $('#side').classList.toggle('open'); $('#drawerBg').classList.toggle('open'); },
  palette: openPalette, toggleLang, toggleTheme,
  newTask: () => openForm('tasks', null, { due: route.view === 'dashboard' || UI.taskTab === 'today' ? today() : '', priority: 3, recur: 'none' }),
  quickCapture: quickCaptureModal,
  goFocus: () => { go('dashboard'); setTimeout(() => $('#focusCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60); },
  capType: el => { UI.capType = el.dataset.t; $$('.cap-type').forEach(b => b.classList.toggle('on', b === el)); $('#capIn')?.focus(); },
  capSend: () => { const i = $('#capIn'); if (i && doCapture(i.value, UI.capType)) { const n = $('#capIn'); if (n) { n.value = ''; n.focus(); } } },
  toggleTask: el => toggleTask(el.dataset.id),
  edit: el => { const it = S[el.dataset.coll].find(x => x.id === el.dataset.id); if (it) openForm(el.dataset.coll, it); },
  del: el => removeItem(el.dataset.coll, el.dataset.id),
  new: el => { let def = {}; try { def = JSON.parse(el.dataset.def || '{}'); } catch (e) { } if (el.dataset.coll === 'tasks') def = Object.assign({ priority: 3, recur: 'none' }, def); openForm(el.dataset.coll, null, def); },
  ui: el => { UI[el.dataset.k] = el.dataset.v; render(); },
  hlDone: () => { const d = S.daily[today()] = S.daily[today()] || {}; d.hlDone = !d.hlDone; if (d.hlDone) sparkle(); commit(); },
  habit: el => { const h = S.habits.find(x => x.id === el.dataset.id); if (!h) return; h.log = h.log || {}; const d = day(el); if (h.log[d]) delete h.log[d]; else { h.log[d] = 1; sparkle(); } commit(); },
  areaScore: el => { const a = area(el.dataset.id); if (a) { a.score = +el.dataset.n; commit(); } },
  goalStep: el => { const g = S.goals.find(x => x.id === el.dataset.id); if (g) { g.current = Math.max(0, (Number(g.current) || 0) + Number(el.dataset.n)); if (g.current >= g.target) sparkle(); commit(); } },
  pin: (el, e) => { e.stopPropagation(); const n = S.notes.find(x => x.id === el.dataset.id); if (n) { n.pinned = !n.pinned; commit(); } },
  rate: (el, e) => { e.stopPropagation(); const x = S.library.find(y => y.id === el.dataset.id); if (x) { x.rating = +el.dataset.n; commit(); } },
  focusTask: el => { F.taskId = el.dataset.id; if (!F.running) focusStart(); ACT.goFocus(); },
  focusToggle: () => F.running ? focusPause() : focusStart(),
  focusReset, focusPreset: el => { F.mode = el.dataset.m === '5' ? 'break' : 'focus'; F.running = false; clearInterval(F.iv); F.total = F.left = +el.dataset.m * 60; render(); },
  toTask: el => { const i = S.notes.findIndex(x => x.id === el.dataset.id); if (i < 0) return; const n = S.notes[i]; S.notes.splice(i, 1);
    S.tasks.push({ id: uid(), createdAt: Date.now(), title: n.title, notes: n.body, status: 'todo', priority: 3, due: '', areaId: n.areaId, projectId: n.projectId, tags: n.tags, inbox: !n.areaId }); commit(t('saved')); },
  toToday: el => { const x = S.tasks.find(y => y.id === el.dataset.id); if (x) { x.due = today(); delete x.inbox; commit(t('saved')); } },
  calDay: el => { UI.calDay = el.dataset.d; render(); }, calToday: () => { UI.calDay = today(); render(); },
  calShift: el => { UI.calDay = addDays(UI.calDay || today(), +el.dataset.n); render(); },
  newEventAt: el => { const h = String(el.dataset.h).padStart(2, '0'); openForm('events', null, { date: el.dataset.d, start: h + ':00', end: String(Math.min(23, +el.dataset.h + 1)).padStart(2, '0') + ':00', color: COLORS[0] }); },
  finShift: el => { const ref = UI.finMonth || today(); UI.finMonth = +el.dataset.n < 0 ? addDays(monthStart(ref), -1) : addDays(monthDays(ref).slice(-1)[0], 1); render(); },
  setBudget: el => {
    const c = el.dataset.c;
    const o = openModal(`<div class="modal-h"><h2>${t('set_budget')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div>
      <div class="field"><label>${t('f_category')}</label><select class="select" id="bgC">${EXP_CATS.map(k => opt(k, t('cat_' + k), c)).join('')}</select></div>
      <div class="field"><label>${t('budget')} (${esc(S.settings.currency)})</label><input class="input" type="number" id="bgV" value="${S.budgets[c] || ''}"></div>
      <div class="modal-f"><span class="sp"></span><button class="btn" data-close>${t('cancel')}</button><button class="btn primary" id="bgS">${t('save')}</button></div>`);
    o.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
    o.querySelector('#bgS').onclick = () => { S.budgets[$('#bgC').value] = Number($('#bgV').value) || 0; closeModal(); commit(t('saved')); };
  },
  water: el => { const d = UI.healthDay || today(); const h = S.health[d] = S.health[d] || {}; const n = +el.dataset.n; h.water = h.water === n ? n - 1 : n; commit(); },
  hStep: el => { const d = UI.healthDay || today(); const h = S.health[d] = S.health[d] || {}; const k = el.dataset.k; const last = Object.keys(S.health).sort().reverse().map(x => S.health[x][k]).find(v => v);
    h[k] = Math.max(0, Math.round(((Number(h[k]) || (k === 'weight' ? last || 70 : 0)) + Number(el.dataset.n)) * 10) / 10); commit(); },
  hShift: el => { UI.healthDay = addDays(UI.healthDay || today(), +el.dataset.n); if (UI.healthDay > today()) UI.healthDay = today(); render(); },
  mood: el => { const d = day(el); const j = S.journal[d] = S.journal[d] || {}; j.mood = +el.dataset.n; commit(); },
  energy: el => { const d = day(el); const j = S.journal[d] = S.journal[d] || {}; j.energy = +el.dataset.n; commit(); },
  jShift: el => { UI.jDate = addDays(UI.jDate || today(), +el.dataset.n); if (UI.jDate > today()) UI.jDate = today(); render(); },
  jGo: el => { UI.jDate = el.dataset.d; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
  rvCheck: el => { const ws = weekStart(today()); const r = S.reviews[ws] = S.reviews[ws] || { checks: {}, text: '' }; r.checks[el.dataset.i] = !r.checks[el.dataset.i]; commit(); },
  export: exportData, clearDemo: () => confirmBox(t('clear_demo') + '؟', clearDemo),
  resetAll: () => confirmBox(t('reset_confirm'), () => { const keep = S.settings; S = blank(); S.settings = keep; commit(t('deleted')); }),
  setLang: el => { L = el.dataset.v; S.settings.lang = L; commit(); }, setTheme: el => { S.settings.theme = el.dataset.v; commit(); },
  kmove: el => { const it = S[el.dataset.coll].find(x => x.id === el.dataset.id); if (!it) return; moveCard(el.dataset.coll, it, el.dataset.field, el.dataset.to); },
  viewNote: el => { const n = S.notes.find(x => x.id === el.dataset.id); if (n) openNote(n); },
  openNoteT: el => { const tt = el.dataset.t.trim(); const n = S.notes.find(x => x.title.trim().toLowerCase() === tt.toLowerCase());
    if (n) openNote(n); else { const nn = { id: uid(), createdAt: Date.now(), title: tt, body: '', type: 'note', tags: [] }; S.notes.push(nn); save(); openForm('notes', nn); } },
  mdToggle: (el, e) => { e.stopPropagation(); const n = S.notes.find(x => x.id === el.dataset.id); if (!n) return; const ls = n.body.split('\n'); const i = +el.dataset.line;
    ls[i] = ls[i].replace(/\[( |x|X)\]/, m => m === '[ ]' ? '[x]' : '[ ]'); n.body = ls.join('\n'); save(); render(); openNote(n); },
  toTaskFromNote: el => { const n = S.notes.find(x => x.id === el.dataset.id); if (!n) return; closeModal(); openForm('tasks', null, { title: n.title, notes: plain(n.body).slice(0, 500), areaId: n.areaId, projectId: n.projectId, priority: 3, recur: 'none', due: today() }); },
  contacted: el => { const p = S.people.find(x => x.id === el.dataset.id); if (p) { p.lastContact = today(); sparkle(); commit(t('saved')); } },
  liT: el => { const l = S.lists.find(x => x.id === el.dataset.l); const i = l?.items.find(x => x.id === el.dataset.i); if (i) { i.d = i.d ? 0 : 1; commit(); } },
  liD: el => { const l = S.lists.find(x => x.id === el.dataset.l); if (l) { l.items = l.items.filter(x => x.id !== el.dataset.i); commit(); } },
  liClear: el => { const l = S.lists.find(x => x.id === el.dataset.l); if (l) { l.items = l.items.filter(x => !x.d); commit(); } },
  calPick: el => { UI.calDay = el.dataset.d; UI.calMode = 'week'; render(); },
  calShiftM: el => { const ref = UI.calDay || today(); UI.calDay = +el.dataset.n < 0 ? addDays(monthStart(ref), -1) : addDays(monthDays(ref).slice(-1)[0], 1); render(); },
  subPaid: el => { const sb = S.subs.find(x => x.id === el.dataset.id); if (!sb) return;
    S.tx.push({ id: uid(), createdAt: Date.now(), type: 'out', amount: sb.amount, cat: sb.cat || 'other', date: today(), note: sb.title });
    const d = new Date((sb.next || today()) + 'T00:00:00'); if (sb.cycle === 'yearly') d.setFullYear(d.getFullYear() + 1); else d.setMonth(d.getMonth() + 1); sb.next = iso(d); commit(t('saved')); },
  planDay: () => planDay('morning'), shutdown: () => planDay('evening'),
  pdToday: el => { const x = S.tasks.find(y => y.id === el.dataset.id); if (x) { x.due = today(); delete x.inbox; commit(); } },
  pdTomorrow: el => { const x = S.tasks.find(y => y.id === el.dataset.id); if (x) { x.due = addDays(today(), 1); delete x.inbox; commit(); } },
  pdAllTomorrow: () => { S.tasks.filter(x => isOpen(x) && x.due && x.due <= today()).forEach(x => x.due = addDays(today(), 1)); commit(t('saved')); },
  voice: el => voiceInput(el, el.dataset.target || '#capIn'),
  syncIn: () => syncAuth('in'), syncUp: () => syncAuth('up'), syncOut: syncLogout, syncNow: () => fullSync(), syncBackups: () => listBackups(),
  setAccent: el => { S.settings.accent = el.dataset.v; commit(); },
  notify: () => { try { Notification.requestPermission().then(p => toast(p)); } catch (e) { toast('—', 'err'); } },
};
document.addEventListener('click', e => {
  if (e.target.closest('[data-stop]')) return;
  const el = e.target.closest('[data-act]'); if (!el) return;
  const inPlan = !!el.closest('#planModal');
  const f = ACT[el.dataset.act]; if (f) { if (el.tagName === 'A' && el.getAttribute('href') === null) e.preventDefault(); f(el, e); if (inPlan) setTimeout(() => planDay(), 30); }
});
const CH = {
  ui: el => { UI[el.dataset.k] = el.value; render(); },
  focusTask: el => { F.taskId = el.value; render(); },
  inboxArea: el => { const it = S[el.dataset.coll].find(x => x.id === el.dataset.id); if (it && el.value) { it.areaId = el.value; delete it.inbox; commit(t('saved')); } },
  health: el => { const d = UI.healthDay || today(); const h = S.health[d] = S.health[d] || {}; h[el.dataset.k] = el.value === '' ? undefined : Number(el.value); commit(); },
  import: el => { if (el.files[0]) importData(el.files[0]); },
  noteTpl: el => { const k = el.value; if (!k) return; const [type, title, body] = TPL[L][k]; el.value = ''; openForm('notes', null, { type, title: title.endsWith(' ') ? title : title, body }); },
};
document.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); if (el && CH[el.dataset.ch]) CH[el.dataset.ch](el); });
let inT;
const IN = {
  highlight: el => { const d = S.daily[today()] = S.daily[today()] || {}; d.highlight = el.value; save(); },
  scratch: el => { S.scratch = el.value; save(); },
  taskQ: el => { UI.taskQ = el.value; clearTimeout(inT); inT = setTimeout(render, 180); },
  noteQ: el => { UI.noteQ = el.value; clearTimeout(inT); inT = setTimeout(render, 180); },
  journal: el => { const j = S.journal[el.dataset.d] = S.journal[el.dataset.d] || {}; j[el.dataset.k] = el.value; save(); },
  review: el => { const r = S.reviews[el.dataset.w] = S.reviews[el.dataset.w] || { checks: {}, text: '' }; r.text = el.value; save(); },
  setting: el => { S.settings[el.dataset.k] = el.value; save(); },
  tmrHL: el => { const k = addDays(today(), 1); const d = S.daily[k] = S.daily[k] || {}; d.highlight = el.value; save(); },
};
document.addEventListener('input', e => { const el = e.target.closest('[data-in]'); if (el && IN[el.dataset.in]) IN[el.dataset.in](el); });
document.addEventListener('keydown', e => {
  const tg = e.target;
  if (tg.id === 'capIn' && e.key === 'Enter') { e.preventDefault(); ACT.capSend(); return; }
  if (tg.dataset && tg.dataset.add !== undefined && e.key === 'Enter' && tg.value.trim()) {
    e.preventDefault(); let def = {}; try { def = JSON.parse(tg.dataset.add); } catch (er) { }
    const p = parseCapture(tg.value); const id = tg.id;
    S.tasks.push({ id: uid(), createdAt: Date.now(), title: p.text, status: 'todo', priority: p.priority || 3, due: p.due || def.due || '', areaId: p.areaId || def.areaId || '', projectId: p.projectId || def.projectId || '', tags: p.tags || [], recur: 'none' });
    commit(); const n = document.getElementById(id); if (n) { n.value = ''; n.focus(); } return;
  }
  if (tg.dataset && tg.dataset.listadd && e.key === 'Enter' && tg.value.trim()) {
    e.preventDefault(); const l = S.lists.find(x => x.id === tg.dataset.listadd); if (!l) return; (l.items = l.items || []).push({ id: uid(), t: tg.value.trim(), d: 0 });
    const id = tg.id; commit(); const n = document.getElementById(id); if (n) { n.value = ''; n.focus(); } return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
  if (e.key === 'Escape') { if ($('#picker')) { closePicker(); return; } closeModal(); closeDrawer(); return; }
  if (e.altKey && e.code === 'KeyN') { e.preventDefault(); quickCaptureModal(); return; }
  if (e.altKey && e.code === 'KeyT') { e.preventDefault(); ACT.newTask(); return; }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && route.view === 'dashboard' && !$('#overlay') && !document.activeElement?.matches('input,textarea')) render(); });

/* drag & drop for kanban */
function moveCard(coll, it, field, val) {
  if (it[field] === val) return; it[field] = val;
  if (coll === 'tasks') { if (val === 'done') { it.doneAt = Date.now(); sparkle(); } else delete it.doneAt; }
  if (coll === 'content' && val === 'published') { if (!it.publishDate) it.publishDate = today(); sparkle(); }
  commit();
}
let DRAG = null;
document.addEventListener('dragstart', e => { const c = e.target.closest?.('[data-drag]'); if (!c) return; DRAG = { id: c.dataset.drag, coll: c.dataset.dragColl }; c.classList.add('dragging'); try { e.dataTransfer.setData('text/plain', DRAG.id); e.dataTransfer.effectAllowed = 'move'; } catch (er) { } });
document.addEventListener('dragend', e => { $$('.dragging').forEach(x => x.classList.remove('dragging')); $$('.kcol.over').forEach(x => x.classList.remove('over')); });
document.addEventListener('dragover', e => { const col = e.target.closest?.('.kcol'); if (!col || !DRAG) return; e.preventDefault(); $$('.kcol.over').forEach(x => x !== col && x.classList.remove('over')); col.classList.add('over'); });
document.addEventListener('drop', e => { const col = e.target.closest?.('.kcol'); if (!col || !DRAG) return; e.preventDefault();
  const it = S[col.dataset.dropColl]?.find(x => x.id === DRAG.id); if (it) moveCard(col.dataset.dropColl, it, col.dataset.dropField, col.dataset.dropVal); DRAG = null; });



