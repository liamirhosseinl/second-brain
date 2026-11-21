/* Second Brain — core: store, helpers, icons, shell, modal, palette, focus */
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function iso(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
const today = () => iso(new Date());
function addDays(s, n) { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); }
function diffDays(a, b) { return Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 864e5); }
const monthKey = s => s.slice(0, 7);

/* ---------- i18n ---------- */
let L = 'fa';
function t(k) { const d = I18N[L]; return (d && d[k] !== undefined) ? d[k] : (I18N.en[k] ?? k); }
function fmtNum(n, max = 0) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: max }); }
function loc() { return L === 'fa' ? 'fa-IR-u-ca-persian-nu-latn' : 'en-US'; }
function fmtDate(s, o = { day: 'numeric', month: 'long' }) { if (!s) return ''; try { return new Intl.DateTimeFormat(loc(), o).format(new Date(s + 'T00:00:00')); } catch (e) { return s; } }
function fmtDateAlt(s, o = { day: 'numeric', month: 'short', year: 'numeric' }) { // the "other" calendar
  try { return new Intl.DateTimeFormat(L === 'fa' ? 'en-US' : 'fa-IR-u-ca-persian-nu-latn', o).format(new Date(s + 'T00:00:00')); } catch (e) { return ''; } }
function weekday(s, f = 'long') { return fmtDate(s, { weekday: f }); }
function relDay(s) {
  if (!s) return '';
  const d = diffDays(s, today());
  if (d === 0) return t('today'); if (d === 1) return t('tomorrow'); if (d === -1) return t('yesterday');
  return fmtDate(s, Math.abs(d) < 7 ? { weekday: 'long' } : { day: 'numeric', month: 'short' });
}
function money(n) { return fmtNum(n) + ' ' + (S.settings.currency || ''); }

/* ---------- store ---------- */
const KEY = 'secondbrain.v1';
const COLORS = ['#5eead4', '#e9c78f', '#f3a6c8', '#b9a2ff', '#74e3a9', '#8ec5ff', '#ffb27a', '#ff7a8a'];
const DEFAULT_AREAS = [
  ['work', '💼', '#e9c78f'], ['finance', '💰', '#74e3a9'], ['health', '🫀', '#f3a6c8'], ['learning', '📚', '#8ec5ff'],
  ['relations', '🤍', '#ffb27a'], ['mind', '🧘', '#b9a2ff'], ['creative', '🎨', '#5eead4'], ['home', '🏡', '#c9d7a5']];
const EXP_CATS = ['food', 'transport', 'home', 'fun', 'shopping', 'health', 'learning', 'work', 'gift', 'other'];
const INC_CATS = ['salary', 'freelance', 'invest', 'gift', 'other'];

function blank() {
  return {
    v: 1, demo: false,
    settings: { lang: 'fa', theme: 'dark', name: '', currency: 'تومان', accent: 'teal' },
    areas: DEFAULT_AREAS.map(([k, icon, color], i) => ({ id: 'a_' + k, key: k, icon, color, score: 6, order: i })),
    tasks: [], projects: [], notes: [], habits: [], goals: [], events: [], tx: [], library: [],
    journal: {}, health: {}, budgets: {}, daily: {}, reviews: {}, focus: [], scratch: '',
    content: [], people: [], lists: [], subs: [], boards: [], deleted: {}, metaU: {},
    forest: { coins: 0, unlocked: ['pine'], species: 'pine', tags: null, strict: true, sound: 'none' }
  };
}
function seed() {
  const s = blank(); s.demo = true; const d = today();
  let dn = 0; const P = (o) => Object.assign({ id: 'demo_' + (++dn), createdAt: Date.now() - dn * 6e4, demo: true }, o);
  const pr1 = P({ title: L === 'fa' ? 'ساخت مغز دوم' : 'Build Second Brain', areaId: 'a_creative', status: 'active', deadline: addDays(d, 20), color: '#5eead4', desc: '' });
  const pr2 = P({ title: L === 'fa' ? 'سایت پورتفولیو' : 'Portfolio website', areaId: 'a_work', status: 'active', deadline: addDays(d, 35), color: '#e9c78f', desc: '' });
  const pr3 = P({ title: 'ONYQ', areaId: 'a_work', areaIds: ['a_work', 'a_finance'], status: 'active', deadline: '', color: '#b9a2ff', desc: L === 'fa' ? 'مجموعه نرم‌افزاری' : 'Software studio' });
  const pr4 = P({ title: 'Childoo', parentId: pr3.id, areaId: 'a_work', status: 'active', deadline: addDays(d, 45), color: '#74e3a9', desc: '' });
  pr1.parentId = pr3.id;
  s.projects = [pr3, pr1, pr4, pr2];
  const fa = L === 'fa';
  s.tasks = [
    P({ title: fa ? 'طراحی ساختار دیتابیس داشبورد' : 'Design dashboard data model', due: d, priority: 1, status: 'todo', areaId: 'a_creative', projectId: pr1.id }),
    P({ title: fa ? 'تدوین ریلز کلاینت' : 'Edit client reel', due: d, priority: 2, status: 'todo', areaId: 'a_work', areaIds: ['a_work', 'a_finance', 'a_learning'], time: '15:00', endTime: '17:00' }),
    P({ title: fa ? 'پیاده‌روی ۳۰ دقیقه' : '30-minute walk', due: d, priority: 3, status: 'done', doneAt: Date.now(), areaId: 'a_health' }),
    P({ title: fa ? 'انتخاب ۱۰ نمونه کار برتر' : 'Pick top 10 portfolio pieces', due: addDays(d, 2), priority: 2, status: 'todo', areaId: 'a_work', projectId: pr2.id }),
    P({ title: fa ? 'پرداخت قبض اینترنت' : 'Pay internet bill', due: addDays(d, -1), priority: 1, status: 'todo', areaId: 'a_finance' }),
  ];
  s.notes = [
    P({ title: fa ? 'ایده: سری ویدیو «یک روز با ادیتور»' : 'Idea: "A day with an editor" series', body: fa ? 'ریلز ۳۰ ثانیه‌ای، پشت صحنه تدوین…' : '30s reels, behind-the-scenes editing…', type: 'idea', areaId: 'a_work', pinned: true }),
    P({ title: fa ? 'خلاصه روش PARA' : 'PARA method summary', body: fa ? 'Projects · Areas · Resources · Archive\nCODE: Capture → Organize → Distill → Express' : 'Projects · Areas · Resources · Archive\nCODE: Capture → Organize → Distill → Express', type: 'resource', areaId: 'a_learning' }),
  ];
  s.habits = [
    P({ title: fa ? 'ورزش' : 'Exercise', icon: '🏃', color: '#f3a6c8', areaId: 'a_health', log: { [addDays(d, -1)]: 1, [addDays(d, -2)]: 1, [addDays(d, -4)]: 1 } }),
    P({ title: fa ? 'مطالعه ۲۰ صفحه' : 'Read 20 pages', icon: '📖', color: '#8ec5ff', areaId: 'a_learning', log: { [d]: 1, [addDays(d, -1)]: 1, [addDays(d, -2)]: 1, [addDays(d, -3)]: 1 } }),
    P({ title: fa ? 'بدون گوشی تا ۱۰ صبح' : 'No phone until 10am', icon: '📵', color: '#b9a2ff', areaId: 'a_mind', log: { [addDays(d, -1)]: 1 } }),
  ];
  s.goals = [P({ title: fa ? 'ساخت ۱۰۰ ویدیوی باکیفیت' : 'Create 100 quality videos', horizon: 'year', areaId: 'a_work', current: 34, target: 100, unit: fa ? 'ویدیو' : 'videos', due: addDays(d, 200), color: '#e9c78f' })];
  s.events = [P({ title: fa ? 'کار عمیق: کدنویسی' : 'Deep work: coding', date: d, start: '09:00', end: '11:30', color: '#5eead4', areaId: 'a_creative' }),
    P({ title: fa ? 'جلسه با کلاینت' : 'Client call', date: d, start: '16:00', end: '17:00', color: '#e9c78f', areaId: 'a_work' })];
  s.tx = [P({ type: 'in', amount: 25000000, cat: 'freelance', date: d, note: fa ? 'پروژه تدوین' : 'Editing project' }),
    P({ type: 'out', amount: 1800000, cat: 'food', date: d, note: fa ? 'خرید هفتگی' : 'Groceries' }),
    P({ type: 'out', amount: 950000, cat: 'transport', date: addDays(d, -2), note: '' })];
  s.budgets = { food: 8000000, transport: 3000000, fun: 2500000 };
  s.library = [P({ kind: 'book', title: fa ? 'ساختن مغز دوم' : 'Building a Second Brain', creator: 'Tiago Forte', status: 'progress', progress: 40, rating: 0, color: '#5eead4' }),
    P({ kind: 'movie', title: 'Interstellar', creator: 'Christopher Nolan', status: 'want', progress: 0, rating: 0, color: '#b9a2ff' })];
  s.health = { [addDays(d, -1)]: { water: 7, sleep: 7, steps: 6400, weight: 78, workout: 30 } };
  s.journal = { [addDays(d, -1)]: { mood: 4, energy: 3, wins: fa ? 'نسخه اول ساختار پروژه آماده شد' : 'First version of the structure done' } };
  s.content = [
    P({ title: fa ? '۵ اشتباه رایج تدوین ریلز' : '5 common reel editing mistakes', stage: 'idea', platform: 'instagram', format: 'reel', hook: fa ? 'این اشتباه ویو ریلزت رو نصف می‌کنه…' : 'This mistake halves your views…', color: '#f3a6c8' }),
    P({ title: fa ? 'پشت صحنه پروژه کلاینت' : 'Client project behind the scenes', stage: 'edit', platform: 'instagram', format: 'reel', publishDate: addDays(d, 2), color: '#e9c78f' }),
    P({ title: fa ? 'آموزش کالر گریدینگ سینمایی' : 'Cinematic color grading tutorial', stage: 'script', platform: 'youtube', format: 'video', publishDate: addDays(d, 9), color: '#8ec5ff' }),
    P({ title: fa ? 'قبل/بعد تدوین' : 'Before/after edit', stage: 'published', platform: 'instagram', format: 'reel', publishDate: addDays(d, -3), color: '#74e3a9' })];
  s.people = [
    P({ name: fa ? 'مامان' : 'Mom', relation: 'family', birthday: addDays(d, 12).replace(/^\d{4}/, '1970'), lastContact: addDays(d, -9), freq: 7, color: '#ffb27a' }),
    P({ name: fa ? 'علی (کلاینت)' : 'Ali (client)', relation: 'work', lastContact: addDays(d, -20), freq: 14, phone: '', color: '#e9c78f' })];
  s.lists = [
    P({ title: fa ? 'خرید خانه' : 'Groceries', icon: '🛒', items: [{ id: 'li1', t: fa ? 'شیر' : 'Milk', d: 0 }, { id: 'li2', t: fa ? 'قهوه' : 'Coffee', d: 1 }, { id: 'li3', t: fa ? 'میوه' : 'Fruit', d: 0 }] }),
    P({ title: fa ? 'لیست آرزوها' : 'Wishlist', icon: '✨', items: [{ id: 'li4', t: fa ? 'لنز ۳۵ میلی‌متری' : '35mm lens', d: 0 }, { id: 'li5', t: fa ? 'سفر به ژاپن' : 'Trip to Japan', d: 0 }] })];
  s.subs = [P({ title: 'Adobe Creative Cloud', amount: 2900000, cycle: 'monthly', next: addDays(d, 4), cat: 'work' }), P({ title: 'Spotify', amount: 350000, cycle: 'monthly', next: addDays(d, 15), cat: 'fun' })];
  return s;
}
function migrate(s) {
  const b = blank();
  (s.tasks || []).forEach(x => { if (x.areaId && !x.areaIds) x.areaIds = [x.areaId]; });
  (s.projects || []).forEach(x => { if (x.areaId && !x.areaIds) x.areaIds = [x.areaId]; });
  for (const k in b) if (s[k] === undefined) s[k] = b[k];
  s.settings = Object.assign(b.settings, s.settings || {});
  (s.focus || []).forEach(f => { if (!f.id) f.id = 'f' + (f.at || Math.random()); });
  if (!s.boards) s.boards = []; if (!s.forest) s.forest = { coins: 0, unlocked: ['pine'], species: 'pine', tags: null, strict: true, sound: 'none' };
  if ((s.events || []).length) { // time blocks are now tasks with a start & end time
    s.events.forEach(e => { if (!s.tasks.some(x => x.id === e.id)) s.tasks.push({ id: e.id, createdAt: e.createdAt || Date.now(), title: e.title, status: 'todo', priority: 3, due: e.date, time: e.start || '', endTime: e.end || '', areaId: e.areaId || '', color: e.color, block: true, recur: 'none', demo: e.demo }); });
    s.deleted = s.deleted || {}; s.events.forEach(e => s.deleted['events|' + e.id] = Date.now());
    s.events = [];
  }
  return s;
}
function loadState() {
  try {
    const r = localStorage.getItem(KEY);
    if (r) {
      const d = JSON.parse(r);
      // safety net: keep an untouched copy of the data from before this upgrade
      if (!d.boards || d.v !== 3) { try { if (!localStorage.getItem(KEY + '.pre-v3')) localStorage.setItem(KEY + '.pre-v3', r); } catch (e) { } }
      const m = migrate(d); m.v = 3; return m;
    }
  } catch (e) { }
  L = 'fa';
  const s = seed(); s.settings.lang = L; if (L === 'en') s.settings.currency = '$'; return migrate(s);
}
let S = loadState();
L = S.settings.lang || 'fa';
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { stamp(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Storage error', 'err'); } if (typeof schedulePush === 'function') schedulePush(); }, 120); }
function commit(msg) { save(); render(); if (msg) toast(msg); }

/* ---------- lookups ---------- */
const area = id => S.areas.find(a => a.id === id);
const areaName = a => a ? (a.name || t('area_' + a.key)) : '';
const project = id => S.projects.find(p => p.id === id);
const sortedAreas = () => [...S.areas].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
function areaChip(id) { const a = area(id); return a ? `<span class="chip"><span class="dot" style="background:${a.color}"></span>${esc(areaName(a))}</span>` : ''; }
function projChip(id) { const p = project(id); return p ? `<span class="chip violet">${ic('folder', 'sm')}${esc(p.title)}</span>` : ''; }
function dueChip(due, done) {
  if (!due) return ''; const d = diffDays(due, today());
  const cls = done ? '' : d < 0 ? 'red' : d === 0 ? 'teal' : d <= 2 ? 'gold' : '';
  return `<span class="chip ${cls}">${ic('calendar', 'sm')}${esc(relDay(due))}</span>`;
}

/* ---------- icons ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  tasks: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 12 3 3 5-6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3v3a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  graph: '<circle cx="12" cy="12" r="3"/><circle cx="4" cy="5" r="2"/><circle cx="20" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="m6 6.5 4 3.5M18 6.5l-4 3.5M7 17.5l3-3.5M17 17.5l-3-3.5"/>',
  review: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>',
  play: '<path d="m7 4 13 8-13 8z"/>', pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>', chevR: '<path d="m9 18 6-6-6-6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4"/>',
  pin: '<path d="M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  droplet: '<path d="M12 2.7s7 7.3 7 12.3a7 7 0 0 1-14 0c0-5 7-12.3 7-12.3z"/>',
  scale: '<circle cx="12" cy="5" r="3"/><path d="M6.5 8h11l3 13h-17z"/>',
  dumbbell: '<path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  send: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>', arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M3 12h18"/>',
  quote: '<path d="M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8"/>',
  cloud: '<path d="M17.5 19H7a5 5 0 1 1 1.2-9.86A6 6 0 0 1 19.5 11 4 4 0 0 1 17.5 19z"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M16 4a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5.6"/>',
  listcheck: '<path d="M11 6h10M11 12h10M11 18h10"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6" rx="1"/><rect x="12" y="8" width="3" height="10" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/>',
  columns: '<rect x="3" y="3" width="5" height="18" rx="1.5"/><rect x="10" y="3" width="5" height="12" rx="1.5"/><rect x="17" y="3" width="4" height="15" rx="1.5"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  tree: '<path d="M12 22v-6"/><path d="M12 2 5 12h4l-3 4h12l-3-4h4z"/>',
  brain: '<path d="M9 3a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 1 5 3 3 0 0 0 4 3 3 3 0 0 0 3-1V4a3 3 0 0 0-3-1z"/><path d="M15 3a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-1 5 3 3 0 0 1-4 3 3 3 0 0 1-3-1"/><path d="M9 8h1M14 8h1M9 13h2M13 16h2"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};
function ic(n, cls = '') { return `<svg class="svg ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`; }

/* ---------- toast ---------- */
function toast(msg, kind = '', action) {
  const root = $('#toast-root'); const el = document.createElement('div');
  el.className = 'toast ' + kind; el.innerHTML = `<span>${esc(msg)}</span>`;
  if (action) { const b = document.createElement('button'); b.textContent = action.label; b.onclick = () => { action.fn(); el.remove(); }; el.appendChild(b); }
  root.appendChild(el); setTimeout(() => el.remove(), action ? 5000 : 2200);
}

/* ---------- router ---------- */
const NAV = [
  ['sec_capture', [['dashboard', 'home'], ['inbox', 'inbox'], ['tasks', 'tasks'], ['calendar', 'calendar'], ['focus', 'tree']]],
  ['sec_mind', [['mind', 'brain']]],
  ['sec_organize', [['projects', 'folder'], ['content', 'film'], ['areas', 'compass'], ['goals', 'target'], ['notes', 'note']]],
  ['sec_life', [['habits', 'repeat'], ['finance', 'wallet'], ['health', 'heart'], ['people', 'users'], ['library', 'book'], ['lists', 'listcheck']]],
  ['sec_reflect', [['journal', 'pen'], ['review', 'review'], ['insights', 'chart'], ['graph', 'graph']]],
];
let route = { view: 'dashboard', arg: null };
function parseHash() { const h = location.hash.replace(/^#\/?/, '').split('/'); route = { view: h[0] || 'dashboard', arg: h[1] ? decodeURIComponent(h[1]) : null }; }
function go(view, arg) { location.hash = '#/' + view + (arg ? '/' + encodeURIComponent(arg) : ''); }
window.addEventListener('hashchange', () => { parseHash(); closeDrawer(); if (typeof closePicker === 'function') closePicker(); render(); window.scrollTo(0, 0); const pg = $('#page'); if (pg) { pg.classList.remove('enter'); void pg.offsetWidth; pg.classList.add('enter'); } });

/* ---------- shell ---------- */
const UI = { capType: 'task', taskTab: 'today', taskArea: '', taskProj: '', taskQ: '', noteType: '', noteQ: '', libKind: '', calDay: null, finMonth: null, jDate: null, goalH: '' };
function inboxCount() { return S.tasks.filter(x => x.inbox && isOpen(x)).length + S.notes.filter(x => x.inbox).length; }
function sideHTML() {
  const counts = { inbox: inboxCount(), tasks: S.tasks.filter(x => isOpen(x) && x.due && x.due <= today()).length };
  return `<div class="brand"><div class="brand-orb"></div><div><b>${t('appName')}</b><small>${t('tagline')}</small></div></div>
  ${NAV.map(([sec, items]) => `<div class="nav-sec">${t(sec)}</div>` + items.map(([v, icn]) =>
    `<a class="nav-item ${route.view === v ? 'on' : ''}" href="#/${v}">${ic(icn)}<span>${t('nav_' + v)}</span>${counts[v] ? `<span class="count">${counts[v]}</span>` : ''}</a>`).join('')).join('')}
  <div class="side-foot">
    <a class="nav-item ${route.view === 'settings' ? 'on' : ''}" href="#/settings" style="flex:1">${ic('settings')}<span>${t('nav_settings')}</span></a>
  </div>`;
}
function topHTML() {
  return `<button class="icon-btn mob-only" data-act="drawer" aria-label="menu">${ic('menu')}</button>
  <div class="searchbox" data-act="palette">${ic('search')}<span class="lbl">${t('search_ph')}</span><span class="kbd">Ctrl K</span></div>
  <div class="top-actions">
    ${typeof syncBadgeHTML === 'function' ? syncBadgeHTML() : ''}
    <div class="focus-pill" id="focusPill" data-act="goFocus"><i></i><span id="focusPillT">25:00</span></div>
    <button class="icon-btn" data-act="toggleLang" title="${t('act_toggle_lang')}">${ic('globe')}</button>
    <button class="icon-btn" data-act="toggleTheme" title="${t('act_toggle_theme')}">${ic(S.settings.theme === 'light' ? 'moon' : 'sun')}</button>
    <button class="btn primary sm" data-act="newTask">${ic('plus', 'sm')}<span>${t('new_task')}</span></button>
  </div>`;
}
function bottomHTML() {
  const items = [['dashboard', 'home'], ['tasks', 'tasks'], ['focus', 'tree'], ['mind', 'brain']];
  return items.map(([v, i]) => `<button class="${route.view === v ? 'on' : ''}" data-act="go" data-v="${v}">${ic(i)}<span>${t(v === 'focus' ? 'nav_focus_short' : v === 'mind' ? 'sec_mind' : 'nav_' + v)}</span></button>`).join('') +
    `<button data-act="drawer">${ic('grid')}<span>${t('more')}</span></button>`;
}
const ACCENTS = { teal: ['#5eead4', '#2dd4bf', '#0f9f8a', '#0d8a78'], violet: ['#b9a2ff', '#9b7bff', '#7356d6', '#5f43c0'], gold: ['#e9c78f', '#d9a85c', '#b98328', '#a06f1c'], pink: ['#f3a6c8', '#e77fb0', '#c84f86', '#b23d73'], blue: ['#8ec5ff', '#5ea8f5', '#2f7fd4', '#1f6cbd'], green: ['#74e3a9', '#4cd08b', '#1f9d61', '#17824f'] };
function applyDoc() {
  const h = document.documentElement; document.body.classList.toggle('mind-mode', route.view === 'mind' && !!route.arg); h.lang = L; h.dir = L === 'fa' ? 'rtl' : 'ltr'; h.dataset.theme = S.settings.theme;
  const ac = ACCENTS[S.settings.accent] || ACCENTS.teal, lt = S.settings.theme === 'light';
  if (S.settings.accent && S.settings.accent !== 'teal') { h.style.setProperty('--accent', lt ? ac[2] : ac[0]); h.style.setProperty('--accent2', lt ? ac[3] : ac[1]); } else { h.style.removeProperty('--accent'); h.style.removeProperty('--accent2'); }
  document.title = t('appName') + ' · ' + t('nav_' + route.view);
  const m = $('meta[name=theme-color]'); if (m) m.content = S.settings.theme === 'light' ? '#eef4f2' : '#081311';
}
function render() {
  applyDoc();
  const app = $('#app');
  if (!app.dataset.ready) {
    app.innerHTML = `<aside class="side" id="side"></aside><div class="drawer-bg" id="drawerBg" data-act="drawer"></div>
    <main class="main"><header class="topbar" id="top"></header><div class="page" id="page"></div></main>
    <nav class="bottom-nav" id="bnav"></nav><button class="fab" data-act="quickCapture" aria-label="capture">${ic('plus', 'lg')}</button>`;
    app.dataset.ready = 1;
  }
  $('#side').innerHTML = sideHTML(); $('#top').innerHTML = topHTML(); $('#bnav').innerHTML = bottomHTML();
  const v = VIEWS[route.view] || VIEWS.dashboard;
  const ae = document.activeElement; const keepId = ae && ae.id && $('#page').contains(ae) ? ae.id : null; const selS = ae && ae.selectionStart;
  $('#page').innerHTML = v();
  if (keepId) { const el = document.getElementById(keepId); if (el) { el.focus(); try { el.setSelectionRange(selS, selS); } catch (e) { } } }
  afterRender.forEach(f => f()); afterRender = [];
  (VIEWS['_after_' + route.view] || []).forEach(f => { try { f(); } catch (e) { console.error(e); } });
  updateFocusUI();
}
let afterRender = [];
function closeDrawer() { $('#side')?.classList.remove('open'); $('#drawerBg')?.classList.remove('open'); }

/* ---------- modal & forms ---------- */
function openModal(html, cls = '') {
  closeModal();
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'overlay';
  o.innerHTML = `<div class="modal ${cls}" role="dialog">${html}</div>`;
  o.addEventListener('mousedown', e => { if (e.target === o) closeModal(); });
  $('#modal-root').appendChild(o);
  const f = o.querySelector('input:not([type=hidden]),textarea,select'); if (f && matchMedia('(hover:hover)').matches) setTimeout(() => f.focus(), 30);
  return o;
}
function closeModal() { $('#overlay')?.remove(); $('#palette')?.remove(); }
function confirmBox(msg, fn) {
  const o = openModal(`<div class="modal-h"><h2>${esc(msg)}</h2></div><div class="modal-f"><span class="sp"></span><button class="btn" data-x>${t('no')}</button><button class="btn danger" data-y>${t('yes')}</button></div>`);
  o.querySelector('[data-x]').onclick = closeModal; o.querySelector('[data-y]').onclick = () => { closeModal(); fn(); };
}
const opt = (v, label, sel) => `<option value="${esc(v)}" ${String(sel ?? '') === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
function areaOpts(sel) { return opt('', t('none'), sel) + sortedAreas().map(a => opt(a.id, a.icon + ' ' + areaName(a), sel)).join(''); }
function projTree(exclude) { // depth-first list [p, depth]
  const out = [], kids = id => S.projects.filter(p => (p.parentId || '') === id && p.id !== exclude);
  const walk = (id, d) => kids(id).forEach(p => { out.push([p, d]); if (d < 6) walk(p.id, d + 1); });
  walk('', 0); S.projects.forEach(p => { if (p.id !== exclude && !out.some(([q]) => q === p) && !(exclude && isDescendant(p.id, exclude))) out.push([p, 0]); });
  return out;
}
function isDescendant(id, ancestor) { let p = project(id), g = 0; while (p && p.parentId && g++ < 20) { if (p.parentId === ancestor) return true; p = project(p.parentId); } return false; }
function projPath(id) { const a = []; let p = project(id), g = 0; while (p && g++ < 20) { a.unshift(p.title); p = p.parentId ? project(p.parentId) : null; } return a.join(' › '); }
function projOpts(sel) { return opt('', t('none'), sel) + projTree().filter(([p]) => p.status !== 'archived' || p.id === sel).map(([p, d]) => opt(p.id, '\u2003'.repeat(d) + (d ? '↳ ' : '') + p.title, sel)).join(''); }
function parentOpts(sel, self) { return opt('', t('no_parent'), sel) + projTree(self).filter(([p]) => !self || (p.id !== self && !isDescendant(p.id, self))).map(([p, d]) => opt(p.id, '\u2003'.repeat(d) + (d ? '↳ ' : '') + p.title, sel)).join(''); }
const areasOf = x => x ? ((x.areaIds && x.areaIds.length) ? x.areaIds : (x.areaId ? [x.areaId] : [])) : [];
const inArea = (x, id) => areasOf(x).includes(id);
function areaChips(x) { return areasOf(x).map(areaChip).join(''); }
function colorOpts(sel) { return `<div class="row" style="flex-wrap:wrap">${COLORS.map(c => `<label style="cursor:pointer"><input type="radio" name="color" value="${c}" ${sel === c ? 'checked' : ''} style="display:none"><span class="orb sm" style="--c:${c};outline:${sel === c ? '2px solid var(--text)' : 'none'};outline-offset:2px" data-pickc></span></label>`).join('')}</div>`; }

/* Schema-driven form. fields: [key,type,label,extra] */
const SCHEMA = {
  tasks: () => [['title', 'text', 'f_title'], ['notes', 'textarea', 'f_notes'], ['_r1', 'row', [['due', 'date', 'f_due'], ['time', 'timerange', 'f_timerange']]],
    ['_r2', 'row', [['priority', 'select', 'f_priority', [1, 2, 3, 4].map(p => [p, t('p' + p)])], ['recur', 'select', 'f_recur', ['none', 'daily', 'weekly', 'monthly'].map(r => [r, t('recur_' + r)])]]],
    ['areaIds', 'areas', 'f_areas'], ['projectId', 'project', 'f_project'], ['sub', 'subs', 'f_subtasks'], ['tags', 'text', 'f_tags']],
  projects: () => [['title', 'text', 'f_title'], ['desc', 'textarea', 'f_desc'], ['parentId', 'parent', 'f_parent'], ['areaIds', 'areas', 'f_areas'],
    ['_r1', 'row', [['status', 'select', 'f_status', ['active', 'paused', 'completed', 'archived'].map(s => [s, t('st_' + s)])], ['deadline', 'date', 'f_deadline']]], ['color', 'color', 'f_color']],
  notes: () => [['title', 'text', 'f_title'], ['type', 'select', 'f_type', ['idea', 'note', 'report', 'resource', 'quote'].map(s => [s, t('type_' + s)])],
    ['body', 'textarea', 'f_body', null, 12], ['areaIds', 'areas', 'f_areas'], ['projectId', 'project', 'f_project'], ['tags', 'text', 'f_tags']],
  habits: () => [['_r1', 'row', [['icon', 'text', 'f_icon'], ['title', 'text', 'f_title']]], ['areaId', 'area', 'f_area'], ['why', 'textarea', 'f_why'], ['color', 'color', 'f_color']],
  goals: () => [['title', 'text', 'f_title'], ['_r1', 'row', [['horizon', 'select', 'f_horizon', ['life', 'year', 'quarter', 'month'].map(s => [s, t('h_' + s)])], ['areaId', 'area', 'f_area']]],
    ['_r2', 'row', [['current', 'number', 'f_current'], ['target', 'number', 'f_target']]], ['_r3', 'row', [['unit', 'text', 'f_unit'], ['due', 'date', 'f_deadline']]], ['why', 'textarea', 'f_why'], ['color', 'color', 'f_color']],
  events: () => [['title', 'text', 'f_title'], ['date', 'date', 'f_date'], ['_r1', 'row', [['start', 'time', 'f_start'], ['end', 'time', 'f_end']]], ['areaId', 'area', 'f_area'], ['color', 'color', 'f_color']],
  tx: () => [['type', 'select', 'f_type', [['out', t('type_expense')], ['in', t('type_income')]]], ['_r1', 'row', [['amount', 'number', 'f_amount'], ['date', 'date', 'f_date']]],
    ['cat', 'select', 'f_category', [...new Set([...EXP_CATS, ...INC_CATS])].map(c => [c, t('cat_' + c)])], ['note', 'text', 'f_notes']],
  library: () => [['_r1', 'row', [['kind', 'select', 'f_kind', ['book', 'movie', 'series', 'course', 'podcast'].map(s => [s, t('k_' + s)])], ['status', 'select', 'f_status', ['want', 'progress', 'finished'].map(s => [s, t('st_' + s)])]]],
    ['title', 'text', 'f_title'], ['creator', 'text', 'f_creator'], ['_r2', 'row', [['progress', 'number', 'f_progress'], ['rating', 'select', 'f_rating', [0, 1, 2, 3, 4, 5].map(n => [n, n ? '★'.repeat(n) : '—'])]]], ['notes', 'textarea', 'f_notes'], ['color', 'color', 'f_color']],
  areas: () => [['_r1', 'row', [['icon', 'text', 'f_icon'], ['name', 'text', 'f_name']]], ['color', 'color', 'f_color']],
  content: () => [['title', 'text', 'f_title'], ['hook', 'textarea', 'f_hook', null, 2], ['_r1', 'row', [['stage', 'select', 'f_stage', STAGES.map(([k]) => [k, t('st_' + k)])], ['publishDate', 'date', 'f_publish']]],
    ['_r2', 'row', [['platform', 'select', 'f_platform', Object.entries(PLATFORMS)], ['format', 'select', 'f_format', FORMATS.map(f => [f, t('fmt_' + f)])]]], ['script', 'textarea', 'f_script', null, 6], ['_r3', 'row', [['link', 'text', 'f_link'], ['projectId', 'project', 'f_project']]], ['color', 'color', 'f_color']],
  people: () => [['_r1', 'row', [['name', 'text', 'f_name'], ['relation', 'select', 'f_relation', ['family', 'friend', 'partner', 'work', 'client', 'mentor', 'other'].map(r => [r, t('rel_' + r)])]]],
    ['_r2', 'row', [['birthday', 'date', 'f_birthday'], ['freq', 'select', 'f_freq', [[0, '—'], [3, tf('every_n', { n: 3 })], [7, tf('every_n', { n: 7 })], [14, tf('every_n', { n: 14 })], [30, tf('every_n', { n: 30 })], [90, tf('every_n', { n: 90 })]]]]],
    ['_r3', 'row', [['phone', 'text', 'f_phone'], ['lastContact', 'date', 'f_last']]], ['notes', 'textarea', 'f_notes'], ['color', 'color', 'f_color']],
  lists: () => [['_r1', 'row', [['icon', 'text', 'f_icon'], ['title', 'text', 'f_title']]]],
  subs: () => [['title', 'text', 'f_title'], ['_r1', 'row', [['amount', 'number', 'f_amount'], ['cycle', 'select', 'f_cycle', [['monthly', t('cycle_monthly')], ['yearly', t('cycle_yearly')]]]]], ['_r2', 'row', [['next', 'date', 'f_next'], ['cat', 'select', 'f_category', EXP_CATS.map(c => [c, t('cat_' + c)])]]]],
};
const TITLES = { tasks: 'new_task', projects: 'new_project', notes: 'new_note', habits: 'new_habit', goals: 'new_goal', events: 'new_event', tx: 'new_tx', library: 'new_item', areas: 'new_area', content: 'new_content', people: 'new_person', lists: 'new_list', subs: 'new_sub' };
function fieldHTML([k, type, label, extra, rows], it) {
  if (type === 'row') return `<div class="grid2">${label.map(f => fieldHTML(f, it)).join('')}</div>`;
  const v = it[k] ?? ''; let inp;
  if (type === 'textarea') inp = `<textarea class="textarea" name="${k}" rows="${rows || 3}">${esc(v)}</textarea>`;
  else if (type === 'select') inp = `<select class="select" name="${k}">${extra.map(([val, l]) => opt(val, l, v)).join('')}</select>`;
  else if (type === 'area') inp = `<select class="select" name="${k}">${areaOpts(v)}</select>`;
  else if (type === 'project') inp = `<select class="select" name="${k}">${projOpts(v)}</select>`;
  else if (type === 'parent') inp = `<select class="select" name="${k}">${parentOpts(v, it.id)}</select>`;
  else if (type === 'areas') { const cur = areasOf(it); inp = `<div class="area-pick">${sortedAreas().map(a => `<label class="apick ${cur.includes(a.id) ? 'on' : ''}" style="--c:${a.color}"><input type="checkbox" name="areaIds" value="${a.id}" ${cur.includes(a.id) ? 'checked' : ''}><span>${a.icon} ${esc(areaName(a))}</span></label>`).join('')}</div>`; }
  else if (type === 'date') inp = pickField('date', k, v);
  else if (type === 'time') inp = pickField('time', k, v);
  else if (type === 'timerange') inp = pickField('timerange', k, v, it.endTime || '');
  else if (type === 'color') inp = colorOpts(v || COLORS[0]);
  else if (type === 'subs') inp = `<div class="subs" id="subsBox">${(v || []).map(subRow).join('')}</div><div class="add-inline" style="margin-top:4px">${ic('plus', 'sm')}<input id="subAdd" placeholder="${esc(t('add_subtask'))}"></div>`;
  else inp = `<input class="input" type="${type}" name="${k}" value="${esc(Array.isArray(v) ? v.join(', ') : v)}" ${type === 'number' ? 'step="any"' : ''}>`;
  return `<div class="field"><label>${t(label)}</label>${inp}</div>`;
}
const subRow = z => `<div class="sub-row ${z.d ? 'done' : ''}" data-sid="${esc(z.id)}"><button type="button" class="check ${z.d ? 'on' : ''}" data-subt>${ic('check', 'sm')}</button><input class="sub-in" value="${esc(z.t)}"><button type="button" class="icon-btn sm" data-subx>${ic('x', 'sm')}</button></div>`;
function openForm(coll, item, defaults = {}) {
  const isNew = !item; const it = item || Object.assign({}, defaults);
  if (coll === 'areas' && it.key && !it.name) it.name = areaName(it);
  const title = isNew ? t(TITLES[coll]) : t('edit');
  const o = openModal(`<div class="modal-h"><h2>${title}</h2><button class="icon-btn" data-close>${ic('x')}</button></div>
    <form id="ef">${SCHEMA[coll]().map(f => fieldHTML(f, it)).join('')}
    <div class="modal-f">${!isNew ? `<button type="button" class="btn danger" data-del>${ic('trash', 'sm')}${t('delete')}</button>` : ''}<span class="sp"></span>
    <button type="button" class="btn" data-close>${t('cancel')}</button><button class="btn primary" type="submit">${t('save')}</button></div></form>`, coll === 'notes' ? 'wide' : '');
  o.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  o.querySelectorAll('.apick input').forEach(cb => cb.onchange = () => cb.parentElement.classList.toggle('on', cb.checked));
  o.querySelectorAll('[data-pickc]').forEach(sp => sp.parentElement.onclick = () => setTimeout(() => {
    o.querySelectorAll('[data-pickc]').forEach(x => x.style.outline = x.parentElement.querySelector('input').checked ? '2px solid var(--text)' : 'none'); }));
  const sb_ = o.querySelector('#subsBox');
  if (sb_) {
    sb_.addEventListener('click', e => { const r = e.target.closest('.sub-row'); if (!r) return;
      if (e.target.closest('[data-subt]')) { r.classList.toggle('done'); r.querySelector('.check').classList.toggle('on'); }
      if (e.target.closest('[data-subx]')) r.remove(); });
    o.querySelector('#subAdd').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); if (!v) return; sb_.insertAdjacentHTML('beforeend', subRow({ id: uid(), t: v, d: 0 })); e.target.value = ''; } });
  }
  const del = o.querySelector('[data-del]'); if (del) del.onclick = () => { closeModal(); removeItem(coll, item.id); };
  o.querySelector('#ef').onsubmit = e => {
    e.preventDefault(); const fd = new FormData(e.target); const data = {};
    for (const [k, v] of fd.entries()) data[k] = v;
    if (e.target.querySelector('.area-pick')) { data.areaIds = fd.getAll('areaIds'); data.areaId = data.areaIds[0] || ''; }
    if (!String(data.title ?? data.name ?? 'x').trim() && coll !== 'tx') { e.target.querySelector('[name=title],[name=name]')?.focus(); return; }
    if (sb_) data.sub = [...sb_.querySelectorAll('.sub-row')].map(r => ({ id: r.dataset.sid, t: r.querySelector('.sub-in').value.trim(), d: r.classList.contains('done') ? 1 : 0 })).filter(z => z.t);
    ['priority', 'amount', 'current', 'target', 'progress', 'rating', 'freq'].forEach(k => { if (k in data) data[k] = Number(data[k]) || 0; });
    if ('tags' in data) data.tags = data.tags.split(/[,،]/).map(s => s.trim()).filter(Boolean);
    if (coll === 'tx' && !data.amount) return;
    if (coll === 'areas' && item && item.key && data.name === t('area_' + item.key)) delete data.name;
    if (isNew) {
      const obj = Object.assign({ id: uid(), createdAt: Date.now() }, defaults, data);
      if (coll === 'tasks') { obj.status = obj.status || 'todo'; if (!obj.areaId && !obj.due && !obj.projectId) obj.inbox = true; }
      if (coll === 'habits') obj.log = {};
      if (coll === 'lists') obj.items = [];
      if (coll === 'areas') { obj.score = 6; obj.order = S.areas.length; }
      S[coll].push(obj);
    } else { Object.assign(item, data); if (item.areaId || item.due) delete item.inbox; }
    closeModal(); commit(t('saved'));
  };
}
function removeItem(coll, id) {
  const i = S[coll].findIndex(x => x.id === id); if (i < 0) return;
  const [obj] = S[coll].splice(i, 1); save(); render();
  toast(t('deleted'), '', { label: t('undo'), fn: () => { S[coll].splice(i, 0, obj); commit(); } });
}

/* ---------- tasks logic ---------- */
function toggleTask(id) {
  const tk = S.tasks.find(x => x.id === id); if (!tk) return;
  if (tk.status === 'done' || tk.status === 'cancelled') { tk.status = 'todo'; delete tk.doneAt;
    S.tasks = S.tasks.filter(x => !(x.recurFrom === tk.id && x.status === 'todo' && !x.u2)); }
  else {
    tk.status = 'done'; tk.doneAt = Date.now();
    if (tk.recur && tk.recur !== 'none') { // spawn next occurrence
      const base = tk.due || today(); let nd = base;
      if (tk.recur === 'daily') nd = addDays(base, 1); else if (tk.recur === 'weekly') nd = addDays(base, 7);
      else { const d = new Date(base + 'T00:00:00'); d.setMonth(d.getMonth() + 1); nd = iso(d); }
      if (!S.tasks.some(x => x.recurFrom === tk.id)) { const nx = Object.assign({}, tk, { id: uid(), status: 'todo', due: nd, createdAt: Date.now(), recurFrom: tk.id, sub: (tk.sub || []).map(z => ({ ...z, d: 0 })), missed: [] }); delete nx.doneAt; delete nx.u; S.tasks.push(nx); }
    }
    sparkle();
  }
  commit();
}
function sparkle() { try { const a = new (window.AudioContext || window.webkitAudioContext)(); const o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.setValueAtTime(880, a.currentTime); o.frequency.exponentialRampToValueAtTime(1320, a.currentTime + .08); g.gain.setValueAtTime(.06, a.currentTime); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + .25); o.start(); o.stop(a.currentTime + .26); } catch (e) { } }

/* ---------- quick capture parser ---------- */
function parseCapture(raw) {
  let text = raw.trim(); const out = {};
  text = text.replace(/(^|\s)[!！]([1-4۱-۴])(?=\s|$)/, (m, s, p) => { out.priority = Number('1234۱۲۳۴'.indexOf(p) % 4 + 1); return s; });
  text = text.replace(/(^|\s)@(\S+)/, (m, s, w) => {
    const k = w.toLowerCase(); const map = { today: 0, 'امروز': 0, tomorrow: 1, 'فردا': 1, 'پسفردا': 2, 'پس‌فردا': 2, week: 7, 'هفته': 7 };
    if (k in map) { out.due = addDays(today(), map[k]); return s; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(k)) { out.due = k; return s; } return m;
  });
  text = text.replace(/(^|\s)#(\S+)/g, (m, s, w) => {
    const q = w.replace(/_/g, ' ').toLowerCase();
    const a = S.areas.find(a => areaName(a).toLowerCase().includes(q) || (a.key || '').startsWith(q) || (a.name || '').toLowerCase().includes(q));
    if (a) { out.areaId = a.id; return s; }
    const p = S.projects.find(p => p.title.toLowerCase().includes(q)); if (p) { out.projectId = p.id; out.areaId = out.areaId || p.areaId; return s; }
    (out.tags = out.tags || []).push(w); return s;
  });
  text = text.replace(/\s+/g, ' ').trim();
  return { text, ...out };
}
function doCapture(raw, type) {
  if (!raw.trim()) return false;
  const p = parseCapture(raw); const base = { id: uid(), createdAt: Date.now() };
  if (type === 'task') S.tasks.push(Object.assign(base, { title: p.text, status: 'todo', priority: p.priority || 3, due: p.due || '', areaId: p.areaId || '', projectId: p.projectId || '', tags: p.tags || [], inbox: !p.areaId && !p.due }));
  else if (type === 'expense' || type === 'income') {
    const lat = s => s.replace(/[۰-۹]/g, d => d.charCodeAt(0) - 1776).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632);
    const num = Number(lat((p.text.match(/[\d٠-٩۰-۹][\d٠-٩۰-۹,٬.]*/) || ['0'])[0]).replace(/[,٬]/g, ''));
    if (!num) { toast(t('f_amount') + '?', 'err'); return false; }
    S.tx.push(Object.assign(base, { type: type === 'income' ? 'in' : 'out', amount: num, cat: 'other', date: p.due || today(), note: p.text.replace(/[\d٠-٩۰-۹,٬.]+/, '').trim() }));
  } else S.notes.push(Object.assign(base, { title: p.text, body: '', type, areaId: p.areaId || '', projectId: p.projectId || '', tags: p.tags || [], inbox: !p.areaId }));
  commit(t('captured')); return true;
}
function quickCaptureModal() {
  const types = ['task', 'idea', 'note', 'report', 'expense'];
  const o = openModal(`<div class="modal-h"><h2>${ic('sparkle')} ${t('sc_capture')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div>
   <div class="cap-types" style="margin:0 0 12px">${types.map(x => `<button class="cap-type ${x === UI.capType ? 'on' : ''}" data-t="${x}">${t('type_' + x)}</button>`).join('')}</div>
   <textarea class="textarea" id="qcText" placeholder="${esc(t('capture_ph'))}" rows="3"></textarea>
   <div class="modal-f" style="margin-top:14px"><span class="small muted">${t('capture_hint')}</span><span class="sp"></span><button class="btn primary" id="qcGo">${t('save')}</button></div>`);
  o.querySelector('[data-close]').onclick = closeModal;
  o.querySelectorAll('.cap-type').forEach(b => b.onclick = () => { UI.capType = b.dataset.t; o.querySelectorAll('.cap-type').forEach(x => x.classList.toggle('on', x === b)); });
  const ta = o.querySelector('#qcText'); setTimeout(() => ta.focus(), 40);
  const go = () => { if (doCapture(ta.value, UI.capType)) closeModal(); };
  o.querySelector('#qcGo').onclick = go;
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } });
}

/* ---------- command palette ---------- */
function openPalette() {
  closeModal();
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'palette';
  o.innerHTML = `<div class="palette"><input id="palIn" placeholder="${esc(t('search_ph'))}" autocomplete="off"><div class="pal-list" id="palList"></div></div>`;
  o.addEventListener('mousedown', e => { if (e.target === o) closeModal(); });
  $('#modal-root').appendChild(o);
  const inp = $('#palIn'); let sel = 0, items = [];
  const views = NAV.flatMap(([, it]) => it).concat([['settings', 'settings']]);
  const actions = [
    { i: 'plus', l: t('new_task'), f: () => openForm('tasks') }, { i: 'bulb', l: t('new_note'), f: () => openForm('notes', null, { type: 'idea' }) },
    { i: 'folder', l: t('new_project'), f: () => openForm('projects') }, { i: 'wallet', l: t('new_tx'), f: () => openForm('tx', null, { type: 'out', date: today() }) },
    { i: 'timer', l: t('act_focus'), f: () => { focusStart(); } }, { i: 'globe', l: t('act_toggle_lang'), f: toggleLang },
    { i: 'sun', l: t('act_toggle_theme'), f: toggleTheme }, { i: 'download', l: t('act_export'), f: exportData }];
  function build() {
    const q = inp.value.trim().toLowerCase(); items = [];
    const m = s => !q || String(s).toLowerCase().includes(q);
    views.forEach(([v, i]) => m(t('nav_' + v)) && items.push({ sec: 'pal_go', i, l: t('nav_' + v), f: () => go(v) }));
    actions.forEach(a => m(a.l) && items.push(Object.assign({ sec: 'pal_act' }, a)));
    if (q) {
      S.tasks.filter(x => m(x.title)).slice(0, 6).forEach(x => items.push({ sec: 'pal_items', i: 'tasks', l: x.title, s: t('nav_tasks'), f: () => openForm('tasks', x) }));
      S.projects.filter(x => m(x.title)).slice(0, 4).forEach(x => items.push({ sec: 'pal_items', i: 'folder', l: x.title, s: t('nav_projects'), f: () => go('projects', x.id) }));
      S.notes.filter(x => m(x.title) || m(x.body)).slice(0, 6).forEach(x => items.push({ sec: 'pal_items', i: 'note', l: x.title, s: t('type_' + x.type), f: () => openForm('notes', x) }));
      S.library.filter(x => m(x.title)).slice(0, 4).forEach(x => items.push({ sec: 'pal_items', i: 'book', l: x.title, s: t('k_' + x.kind), f: () => openForm('library', x) }));
      S.goals.filter(x => m(x.title)).slice(0, 3).forEach(x => items.push({ sec: 'pal_items', i: 'target', l: x.title, s: t('nav_goals'), f: () => openForm('goals', x) }));
    }
    sel = clamp(sel, 0, Math.max(0, items.length - 1)); let last = '';
    $('#palList').innerHTML = items.map((x, i) => { const h = x.sec !== last ? `<div class="pal-sec">${t(x.sec)}</div>` : ''; last = x.sec;
      return h + `<div class="pal-item ${i === sel ? 'sel' : ''}" data-i="${i}">${ic(x.i)}<span>${esc(x.l)}</span>${x.s ? `<small>${esc(x.s)}</small>` : ''}</div>`; }).join('') || `<div class="empty">—</div>`;
    $('#palList .sel')?.scrollIntoView({ block: 'nearest' });
  }
  const run = i => { const x = items[i]; if (!x) return; closeModal(); x.f(); };
  inp.addEventListener('input', () => { sel = 0; build(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { sel++; build(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel--; build(); e.preventDefault(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); } });
  $('#palList').addEventListener('click', e => { const el = e.target.closest('.pal-item'); if (el) run(+el.dataset.i); });
  build(); inp.focus();
}

/* ---------- focus timer ---------- */
const F = { total: 25 * 60, left: 25 * 60, running: false, end: 0, taskId: '', iv: null, mode: 'focus' };
function focusStart(min) {
  if (min) { F.total = F.left = min * 60; }
  F.running = true; F.end = Date.now() + F.left * 1000; clearInterval(F.iv); F.iv = setInterval(focusTick, 500); updateFocusUI();
  if ('Notification' in window && Notification.permission === 'default') try { Notification.requestPermission(); } catch (e) { }
}
function focusPause() { if (!F.running) return; F.left = Math.max(0, Math.round((F.end - Date.now()) / 1000)); F.running = false; clearInterval(F.iv); updateFocusUI(); }
function focusReset() { F.running = false; clearInterval(F.iv); F.left = F.total; updateFocusUI(); }
function focusTick() {
  F.left = Math.max(0, Math.round((F.end - Date.now()) / 1000));
  if (F.left <= 0) {
    clearInterval(F.iv); F.running = false;
    if (F.mode === 'focus') S.focus.push({ id: uid(), date: today(), minutes: Math.round(F.total / 60), taskId: F.taskId, at: Date.now() });
    F.left = F.total; save(); toast(t('focus_done')); sparkle(); setTimeout(sparkle, 300);
    try { if (Notification.permission === 'granted') new Notification(t('appName'), { body: t('focus_done') }); } catch (e) { }
    render(); return;
  }
  updateFocusUI();
}
const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
function updateFocusUI() {
  const pill = $('#focusPill'); if (pill) { pill.classList.toggle('show', F.running); $('#focusPillT').textContent = mmss(F.left); }
  const r = $('#focusRing'); if (r) { r.style.setProperty('--p', (100 - F.left / F.total * 100).toFixed(2)); $('#focusT').textContent = mmss(F.left); }
  const b = $('#focusBtn'); if (b) b.innerHTML = F.running ? ic('pause') + t('focus_pause') : ic('play') + t('focus_start');
  document.title = F.running ? `⏱ ${mmss(F.left)} · ${t('appName')}` : t('appName') + ' · ' + t('nav_' + route.view);
}
const focusToday = () => S.focus.filter(f => f.date === today()).reduce((a, f) => a + f.minutes, 0);

/* ---------- settings actions ---------- */
function toggleLang() { L = L === 'fa' ? 'en' : 'fa'; S.settings.lang = L; save(); render(); }
function toggleTheme() { S.settings.theme = S.settings.theme === 'light' ? 'dark' : 'light'; save(); render(); }
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `second-brain-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importData(file) {
  const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d || !Array.isArray(d.tasks)) throw 0; S = migrate(d); L = S.settings.lang || 'fa'; commit(t('imported')); } catch (e) { toast(t('import_fail'), 'err'); } }; r.readAsText(file);
}
function clearDemo() {
  ['tasks', 'projects', 'notes', 'habits', 'goals', 'events', 'tx', 'library'].forEach(k => S[k] = S[k].filter(x => !x.demo));
  S.health = {}; S.journal = {}; S.budgets = {}; S.demo = false; commit(t('deleted'));
}
