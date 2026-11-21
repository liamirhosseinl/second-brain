/* Second Brain — cloud sync (Supabase) with per-item merge, tombstones, realtime & daily backups */
'use strict';
const SB_URL = 'https://zybsomlemngoonklmqor.supabase.co';
const SB_KEY = 'sb_publishable_OBGmw4wDaFk8qv5hUsRGtA_T8Bzv970';
const ARR = ['areas', 'tasks', 'projects', 'notes', 'habits', 'goals', 'events', 'tx', 'library', 'focus', 'content', 'people', 'lists', 'subs', 'boards'];
const MAPS = ['journal', 'health', 'daily', 'reviews'];
const META = ['settings', 'budgets', 'scratch', 'forest'];
const DEVICE = (() => { try { let d = localStorage.getItem('sb.device'); if (!d) { d = uid(); localStorage.setItem('sb.device', d); } return d; } catch (e) { return uid(); } })();

/* ---------- change stamping ---------- */
let SNAP = null;
const strip = o => { if (o && typeof o === 'object' && !Array.isArray(o)) { const { u, ...r } = o; return JSON.stringify(r); } return JSON.stringify(o); };
function walk(fn) {
  ARR.forEach(c => (S[c] || []).forEach(it => it && it.id && fn(c + '|' + it.id, it)));
  MAPS.forEach(m => Object.keys(S[m] || {}).forEach(k => { const v = S[m][k]; if (v && typeof v === 'object') fn(m + '|' + k, v); }));
}
function stamp(initial) {
  const now = Date.now(), next = {};
  S.deleted = S.deleted || {}; S.metaU = S.metaU || {};
  walk((k, obj) => { const s = strip(obj); next[k] = s;
    if (!initial && SNAP && SNAP[k] !== s) obj.u = now;
    if (S.deleted[k] && (obj.u || 0) >= S.deleted[k]) delete S.deleted[k]; });
  META.forEach(m => { const k = '$' + m, s = JSON.stringify(S[m]); next[k] = s; if (!initial && SNAP && SNAP[k] !== s) S.metaU[m] = now; });
  if (!initial && SNAP) for (const k in SNAP) if (!(k in next) && k[0] !== '$') S.deleted[k] = now;
  const cut = now - 90 * 864e5; for (const k in S.deleted) if (S.deleted[k] < cut) delete S.deleted[k];
  SNAP = next;
}

/* ---------- merge ---------- */
function mergeState(A, B) {
  if (!B || typeof B !== 'object') return A;
  const out = JSON.parse(JSON.stringify(A));
  const del = Object.assign({}, A.deleted || {});
  for (const k in (B.deleted || {})) del[k] = Math.max(del[k] || 0, B.deleted[k]);
  const alive = (k, it) => !(del[k] && del[k] >= (it.u || 0));
  ARR.forEach(c => {
    const a = A[c] || [], b = B[c] || []; const map = new Map(); const order = [];
    a.forEach(it => { if (it && it.id) { map.set(it.id, it); order.push(it.id); } });
    b.forEach(it => { if (!it || !it.id) return; const cur = map.get(it.id); if (!cur) { map.set(it.id, it); order.push(it.id); } else if ((it.u || 0) > (cur.u || 0)) map.set(it.id, it); });
    out[c] = order.map(id => map.get(id)).filter(it => alive(c + '|' + it.id, it)).map(x => JSON.parse(JSON.stringify(x)));
  });
  MAPS.forEach(m => {
    const a = A[m] || {}, b = B[m] || {}; const r = {};
    new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => {
      const x = a[k], y = b[k]; let v = x === undefined ? y : y === undefined ? x : ((y.u || 0) > (x.u || 0) ? y : x);
      if (v && alive(m + '|' + k, v)) r[k] = JSON.parse(JSON.stringify(v));
    });
    out[m] = r;
  });
  out.metaU = Object.assign({}, A.metaU || {});
  META.forEach(m => { if ((B.metaU?.[m] || 0) > (A.metaU?.[m] || 0)) { out[m] = JSON.parse(JSON.stringify(B[m])); out.metaU[m] = B.metaU[m]; } });
  out.deleted = del;
  out.demo = A.demo && B.demo !== false ? A.demo : false;
  return out;
}

/* ---------- engine ---------- */
const SYNC = { client: null, user: null, state: 'off', msg: '', last: 0, timer: null, busy: false, again: false, chan: null };
function setSync(state, msg = '') { SYNC.state = state; SYNC.msg = msg; if (state === 'ok') SYNC.last = Date.now(); const b = $('#syncBadge'); if (b) b.outerHTML = syncBadgeHTML(); if (route.view === 'settings' && !document.activeElement?.matches('input')) { const c = $('#syncCard'); if (c) c.outerHTML = syncCardHTML(); } }
function syncBadgeHTML() {
  const st = SYNC.user ? SYNC.state : 'off';
  const col = { ok: 'var(--green)', syncing: 'var(--accent)', error: 'var(--red)', offline: 'var(--gold)', off: 'var(--muted)' }[st] || 'var(--muted)';
  return `<button class="icon-btn sync-badge ${st}" id="syncBadge" data-act="go" data-v="settings" title="${esc(t('sync_' + st))}${SYNC.msg ? ' — ' + esc(SYNC.msg) : ''}" style="color:${col}">${ic('cloud')}<i style="background:${col}"></i></button>`;
}
function initSync() {
  if (!window.supabase || !window.supabase.createClient) { // lazy-load the client library after first paint
    if (initSync.loading) return; initSync.loading = true;
    const sc = document.createElement('script'); sc.src = 'vendor/supabase.js'; sc.async = true; sc.onload = () => { initSync.loading = false; initSync(); if (route.view === 'settings') render(); }; sc.onerror = () => { SYNC.state = 'off'; }; document.head.appendChild(sc); return;
  }
  try {
    SYNC.client = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'secondbrain.auth' } });
    SYNC.client.auth.onAuthStateChange((ev, session) => {
      const was = SYNC.user?.id; SYNC.user = session?.user || null;
      if (SYNC.user && SYNC.user.id !== was) { fullSync(); subscribe(); }
      if (!SYNC.user) { unsubscribe(); setSync('off'); }
      if (route.view === 'settings') render(); else setSync(SYNC.state);
    });
  } catch (e) { console.error(e); }
  window.addEventListener('online', () => SYNC.user && fullSync());
  window.addEventListener('offline', () => SYNC.user && setSync('offline'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && SYNC.user && Date.now() - SYNC.last > 20000) fullSync(); });
}
function schedulePush() { if (!SYNC.user) return; clearTimeout(SYNC.timer); SYNC.timer = setTimeout(fullSync, 1500); }
async function fullSync() {
  if (!SYNC.user || !SYNC.client) return;
  if (!navigator.onLine) { setSync('offline'); return; }
  if (SYNC.busy) { SYNC.again = true; return; }
  SYNC.busy = true; setSync('syncing');
  try {
    const { data, error } = await SYNC.client.from('brain_state').select('data').eq('user_id', SYNC.user.id).maybeSingle();
    if (error) throw error;
    if (data && data.data) applyRemote(data.data, true);
    const payload = JSON.parse(JSON.stringify(S));
    const { error: e2 } = await SYNC.client.from('brain_state').upsert({ user_id: SYNC.user.id, data: payload, device: DEVICE, updated_at: new Date().toISOString() });
    if (e2) throw e2;
    dailyBackup(payload);
    setSync('ok');
  } catch (e) { console.warn('sync', e); setSync('error', e.message || String(e)); }
  SYNC.busy = false;
  if (SYNC.again) { SYNC.again = false; schedulePush(); }
}
function applyRemote(remote, quiet) {
  const before = JSON.stringify(S);
  const merged = mergeState(S, remote);
  if (JSON.stringify(merged) === before) return false;
  S = merged; L = S.settings.lang || L; stamp(true);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
  safeRender();
  return true;
}
let pendingRender = false;
function safeRender() {
  const busy = $('#overlay') || $('#palette') || (document.activeElement && document.activeElement.matches('input,textarea,select') && $('#page').contains(document.activeElement));
  if (busy) { pendingRender = true; return; }
  pendingRender = false; render();
}
setInterval(() => { if (pendingRender) safeRender(); }, 2500);
function subscribe() {
  unsubscribe();
  try {
    SYNC.chan = SYNC.client.channel('brain-' + SYNC.user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brain_state', filter: 'user_id=eq.' + SYNC.user.id }, p => {
        if (!p.new || p.new.device === DEVICE || !p.new.data) return;
        if (applyRemote(p.new.data)) { toast(t('sync_pulled')); SYNC.last = Date.now(); }
      }).subscribe();
  } catch (e) { }
}
function unsubscribe() { try { if (SYNC.chan) SYNC.client.removeChannel(SYNC.chan); } catch (e) { } SYNC.chan = null; }
async function dailyBackup(payload) {
  const k = 'sb.backup.' + SYNC.user.id; let last = ''; try { last = localStorage.getItem(k) || ''; } catch (e) { }
  if (last === today()) return;
  const { error } = await SYNC.client.from('brain_backups').insert({ user_id: SYNC.user.id, data: payload, device: DEVICE });
  if (!error) try { localStorage.setItem(k, today()); } catch (e) { }
}
async function listBackups() {
  const { data, error } = await SYNC.client.from('brain_backups').select('id,created_at,device').eq('user_id', SYNC.user.id).order('created_at', { ascending: false }).limit(30);
  if (error) { toast(error.message, 'err'); return; }
  openModal(`<div class="modal-h"><h2>${ic('archive')} ${t('sync_backups')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div>
    <p class="small muted">${t('sync_backups_desc')}</p>
    ${(data || []).map(b => `<div class="task"><div class="t-main"><div class="t-title">${fmtDate(iso(new Date(b.created_at)), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div><div class="small muted ltr">${new Date(b.created_at).toLocaleTimeString('en-GB')}</div></div><button class="btn sm" data-restore="${b.id}">${ic('rotate', 'sm')}${t('sync_restore')}</button></div>`).join('') || `<div class="empty">${t('empty')}</div>`}`);
  $('#overlay [data-close]').onclick = closeModal;
  $$('#overlay [data-restore]').forEach(btn => btn.onclick = () => confirmBox(t('sync_restore_confirm'), async () => {
    const { data: row, error: e } = await SYNC.client.from('brain_backups').select('data').eq('id', btn.dataset.restore).single();
    if (e || !row) { toast(t('import_fail'), 'err'); return; }
    const keepSettings = S.settings; S = migrate(row.data); S.settings = keepSettings;
    // restored state must win over cloud: restamp everything as new
    SNAP = {}; stamp(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (er) { }
    render(); toast(t('imported')); fullSync();
  }));
}
async function syncAuth(kind) {
  const email = $('#syEmail')?.value.trim(), pass = $('#syPass')?.value;
  if (!SYNC.client) { toast(t('sync_nolib'), 'err'); return; }
  if (!email || !pass || pass.length < 6) { toast(t('sync_need'), 'err'); return; }
  setSync('syncing');
  try {
    const fn = kind === 'up' ? SYNC.client.auth.signUp({ email, password: pass }) : SYNC.client.auth.signInWithPassword({ email, password: pass });
    const { data, error } = await fn;
    if (error) throw error;
    if (kind === 'up' && !data.session) { toast(t('sync_confirm_email')); setSync('off'); return; }
    toast(t('sync_welcome'));
  } catch (e) { setSync('error', e.message); toast(e.message, 'err'); }
}
async function syncLogout() { try { await SYNC.client.auth.signOut(); } catch (e) { } SYNC.user = null; render(); }
function syncCardHTML() {
  const u = SYNC.user;
  return `<section class="card s12 glow" id="syncCard"><div class="card-h"><h3>${ic('cloud')}${t('sync_title')}</h3><span class="chip ${u ? (SYNC.state === 'ok' ? 'teal' : SYNC.state === 'error' ? 'red' : 'gold') : ''}" style="margin-inline-start:auto">${t('sync_' + (u ? SYNC.state : 'off'))}</span></div>
  ${!SYNC.client ? `<p class="small muted">${t('sync_nolib')}</p>` : u ? `
    <div class="row" style="flex-wrap:wrap;gap:14px"><span class="orb sm" style="--c:var(--accent)">☁️</span><div style="flex:1;min-width:200px"><b class="ltr">${esc(u.email)}</b><div class="small muted">${SYNC.last ? t('sync_last') + ' ' + new Date(SYNC.last).toLocaleTimeString(L === 'fa' ? 'fa-IR' : 'en-GB') : ''} ${SYNC.msg ? '· <span class="neg">' + esc(SYNC.msg) + '</span>' : ''}</div></div>
    <button class="btn primary" data-act="syncNow">${ic('rotate', 'sm')}${t('sync_now')}</button><button class="btn" data-act="syncBackups">${ic('archive', 'sm')}${t('sync_backups')}</button><button class="btn ghost" data-act="syncOut">${t('sync_logout')}</button></div>
    <p class="small muted" style="margin-bottom:0">${t('sync_on_desc')}</p>` : `
    <p class="small muted" style="margin-top:0">${t('sync_desc')}</p>
    <div class="grid2"><div class="field"><label>${t('sync_email')}</label><input class="input ltr" id="syEmail" type="email" autocomplete="username"></div><div class="field"><label>${t('sync_pass')}</label><input class="input ltr" id="syPass" type="password" autocomplete="current-password"></div></div>
    <div class="row" style="flex-wrap:wrap"><button class="btn primary" data-act="syncIn">${t('sync_login')}</button><button class="btn" data-act="syncUp">${t('sync_signup')}</button></div>`}</section>`;
}
