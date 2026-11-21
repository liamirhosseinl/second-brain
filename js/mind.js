/* Second Brain — Mind boards: infinite canvas (stickies, text, shapes, frames, images, links, connectors) */
'use strict';
const MCOL = ['#ffe08a', '#ffb3cf', '#b6f0a8', '#a8d8ff', '#d4c2ff', '#ffc59a', '#9ff0e0', '#ffffff', '#3a4a47'];
const TCOL = ['', '#5eead4', '#e9c78f', '#f3a6c8', '#b9a2ff', '#8ec5ff', '#74e3a9', '#ff7a8a', '#ffb27a'];
const M = { lastTap: null, snap: (() => { try { return localStorage.getItem('mind.snap') !== '0'; } catch (e) { return true; } })(), bid: null, view: { x: 0, y: 0, k: 1 }, sel: new Set(), selEdge: null, tool: 'select', undo: [], redo: [], clip: null, drag: null, ptrs: new Map(), space: false, editing: null, connFrom: null, inited: null };
const board = () => S.boards.find(b => b.id === M.bid);
const mnode = id => board()?.nodes.find(n => n.id === id);
const DEF = { sticky: [200, 200, 16], text: [260, 0, 20], shape: [180, 110, 16], frame: [560, 380, 16], image: [320, 220, 14], link: [270, 0, 14] };

/* ---------- gallery ---------- */
function boardPreview(b) {
  const ns = b.nodes || []; if (!ns.length) return `<div class="bp-empty">${ic('sparkle', 'lg')}</div>`;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; ns.forEach(n => { x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.w); y1 = Math.max(y1, n.y + (n.h || 80)); });
  const pad = 40; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const c = id => { const n = ns.find(z => z.id === id); return n ? [n.x + n.w / 2, n.y + (n.h || 80) / 2] : [0, 0]; };
  return `<svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" preserveAspectRatio="xMidYMid meet">${(b.edges || []).map(e => { const [ax, ay] = c(e.from), [bx, by] = c(e.to); return `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#7f9b95" stroke-width="${(x1 - x0) / 200}"/>`; }).join('')}
    ${[...ns].sort((a, b) => (b.type === 'frame') - (a.type === 'frame')).map(n => n.type === 'frame' ? `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="12" fill="${n.color || '#e6e9ec'}" opacity=".18" stroke="${n.color || '#e6e9ec'}" stroke-width="${(x1 - x0) / 250}"/>` :
      n.type === 'text' ? `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${(n.fs || 20) * 1.6}" rx="4" fill="#cfe0dc" opacity=".55"/>` :
      `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h || 80}" rx="${n.shape === 'ellipse' ? (n.h || 80) / 2 : 10}" fill="${n.type === 'image' ? '#5a6b68' : (n.color || '#ffe08a')}"/>`).join('')}</svg>`;
}
const TPLS = {
  blank: () => ({ nodes: [], edges: [] }),
  mindmap: () => { const c = { id: uid(), type: 'shape', shape: 'pill', x: -110, y: -45, w: 220, h: 90, text: t('mt_center'), color: '#d4c2ff', fs: 20, bold: 1 }; const kids = [[-420, -220], [260, -220], [-420, 160], [260, 160]].map(([x, y], i) => ({ id: uid(), type: 'sticky', x, y, w: 170, h: 120, text: t('mt_branch') + ' ' + (i + 1), color: MCOL[i], fs: 16 }));
    return { nodes: [c, ...kids], edges: kids.map(k => ({ id: uid(), from: c.id, to: k.id })) }; },
  brainstorm: () => { const f = { id: uid(), type: 'frame', x: -420, y: -260, w: 840, h: 520, text: t('mt_brainstorm'), color: '#a8d8ff' };
    return { nodes: [f, ...Array.from({ length: 6 }, (_, i) => ({ id: uid(), type: 'sticky', x: -380 + (i % 3) * 270, y: -190 + Math.floor(i / 3) * 230, w: 200, h: 180, text: '', color: MCOL[i % 6], fs: 16 }))], edges: [] }; },
  swot: () => ({ nodes: [['mt_s', '#b6f0a8'], ['mt_w', '#ffb3cf'], ['mt_o', '#a8d8ff'], ['mt_t', '#ffc59a']].map(([k, c], i) => ({ id: uid(), type: 'frame', x: (i % 2) * 460 - 460, y: Math.floor(i / 2) * 340 - 340, w: 440, h: 320, text: t(k), color: c })), edges: [] }),
  reflect: () => ({ nodes: [['mt_wins', '#b6f0a8'], ['mt_hard', '#ffb3cf'], ['mt_learn', '#ffe08a'], ['mt_next', '#a8d8ff']].map(([k, c], i) => ({ id: uid(), type: 'frame', x: i * 380 - 760, y: -220, w: 360, h: 440, text: t(k), color: c })), edges: [] }),
};
function newBoardModal() {
  const o = openModal(`<div class="modal-h"><h2>${ic('sparkle')} ${t('mind_new')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div>
    <div class="grid2"><div class="field"><label>${t('f_title')}</label><input class="input" id="nbTitle" placeholder="${esc(t('mind_untitled'))}"></div><div class="field"><label>${t('f_icon')}</label><input class="input" id="nbIcon" value="🧠"></div></div>
    <div class="field"><label>${t('mind_template')}</label><div class="tpl-grid">${Object.keys(TPLS).map((k, i) => `<button type="button" class="tpl ${i === 0 ? 'on' : ''}" data-t="${k}">${boardPreview(TPLS[k]())}<span>${t('mtpl_' + k)}</span></button>`).join('')}</div></div>
    <div class="modal-f"><span class="sp"></span><button class="btn" data-close>${t('cancel')}</button><button class="btn primary" id="nbGo">${t('mind_create')}</button></div>`, 'wide');
  let tpl = 'blank';
  o.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  o.querySelectorAll('.tpl').forEach(b => b.onclick = () => { tpl = b.dataset.t; o.querySelectorAll('.tpl').forEach(x => x.classList.toggle('on', x === b)); });
  o.querySelector('#nbGo').onclick = () => {
    const b = Object.assign({ id: uid(), createdAt: Date.now(), updatedAt: Date.now(), title: $('#nbTitle').value.trim() || t('mind_untitled'), icon: $('#nbIcon').value.trim() || '🧠' }, TPLS[tpl]());
    S.boards.unshift(b); save(); closeModal(); go('mind', b.id);
  };
}
ACT.mindNew = newBoardModal;
ACT.mindDel = (el, e) => { e.stopPropagation(); const b = S.boards.find(x => x.id === el.dataset.id); if (b) confirmBox(tf('mind_del_q', { t: b.title }), () => removeItem('boards', b.id)); };
ACT.mindRename = (el, e) => { e.stopPropagation(); const b = S.boards.find(x => x.id === el.dataset.id); if (!b) return;
  const o = openModal(`<div class="modal-h"><h2>${t('edit')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div><div class="grid2"><div class="field"><label>${t('f_title')}</label><input class="input" id="rbT" value="${esc(b.title)}"></div><div class="field"><label>${t('f_icon')}</label><input class="input" id="rbI" value="${esc(b.icon || '🧠')}"></div></div><div class="modal-f"><span class="sp"></span><button class="btn primary" id="rbOk">${t('save')}</button></div>`);
  o.querySelector('[data-close]').onclick = closeModal; o.querySelector('#rbOk').onclick = () => { b.title = $('#rbT').value.trim() || b.title; b.icon = $('#rbI').value.trim() || b.icon; b.updatedAt = Date.now(); closeModal(); commit(); }; };
VIEWS.mind = () => {
  if (route.arg && S.boards.some(b => b.id === route.arg)) return mindEditorHTML();
  const list = [...S.boards].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return pageH(t('nav_mind'), t('mind_desc'), `<button class="btn primary" data-act="mindNew">${ic('plus', 'sm')}${t('mind_new')}</button>`) +
    `<div class="boards">${list.map(b => `<div class="card board-card" data-act="go" data-v="mind" data-arg="${b.id}"><div class="bp">${boardPreview(b)}</div>
      <div class="row"><span style="font-size:20px">${esc(b.icon || '🧠')}</span><div style="flex:1;min-width:0"><b class="ellip">${esc(b.title)}</b><div class="small muted">${tf('mind_meta', { n: (b.nodes || []).length })} · ${relDay(iso(new Date(b.updatedAt || b.createdAt)))}</div></div>
      <button class="icon-btn sm" data-act="mindRename" data-id="${b.id}">${ic('edit', 'sm')}</button><button class="icon-btn sm" data-act="mindDel" data-id="${b.id}">${ic('trash', 'sm')}</button></div></div>`).join('')}
      <button class="card board-card new" data-act="mindNew"><div class="bp">${ic('plus', 'lg')}</div><b>${t('mind_new')}</b><span class="small muted">${t('mind_new_desc')}</span></button></div>`;
};


/* ---------- editor ---------- */
const TOOLS = [['select', 'V', '<path d="M5 3l14 8-6 1.5L10 19z"/>'], ['hand', 'H', '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-3a2 2 0 0 0-4 0"/>'],
  ['sticky', 'S', '<path d="M4 4h16v10l-6 6H4z"/><path d="M14 20v-6h6"/>'], ['text', 'T', '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'], ['shape', 'R', '<rect x="4" y="5" width="16" height="14" rx="3"/>'],
  ['ellipse', 'O', '<ellipse cx="12" cy="12" rx="9" ry="7"/>'], ['diamond', 'D', '<path d="M12 3l9 9-9 9-9-9z"/>'], ['frame', 'F', '<path d="M7 3v18M17 3v18M3 7h18M3 17h18"/>'],
  ['connector', 'C', '<path d="M5 19C5 10 19 14 19 5"/><circle cx="5" cy="19" r="2"/><path d="M16 5h3v3"/>'], ['image', 'I', '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'], ['link', 'L', '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>']];
const TEXTY = ['sticky', 'text', 'shape', 'frame'];
function mindEditorHTML() {
  const b = S.boards.find(x => x.id === route.arg);
  return `<div class="mind" id="mind" dir="${document.documentElement.dir}">
    <div class="mind-top"><button class="icon-btn" data-act="go" data-v="mind" title="${t('back')}">${ic('chevR', 'flip')}</button><span class="mind-icon">${esc(b.icon || '🧠')}</span>
      <input class="mind-title" id="mTitle" value="${esc(b.title)}"><span class="mind-saved" id="mSaved" title="${t('saved')}">${ic('cloud', 'sm')}</span>
      <div class="mind-top-r"><button class="icon-btn" data-mact="undo" title="${t('mind_undo')} (Ctrl+Z)">${ic('rotate')}</button><button class="icon-btn" data-mact="redo" title="${t('mind_redo')} (Ctrl+Shift+Z)" style="transform:scaleX(-1)">${ic('rotate')}</button>
      <span class="mind-sep"></span><button class="icon-btn" data-mact="zout">${ic('minus')}</button><button class="mind-zoom" data-mact="fit" id="mZoom" title="${t('mind_fit')} (0)">100%</button><button class="icon-btn" data-mact="zin">${ic('plus')}</button>
      <span class="mind-sep"></span><button class="icon-btn ${M.snap ? 'on' : ''}" data-mact="snapT" id="mSnap" title="${t('mind_snap')}">${ic('grid')}</button><button class="icon-btn" data-mact="png" title="${t('mind_png')}">${ic('download')}</button><button class="icon-btn" data-mact="help" title="${t('mind_help')}">?</button></div></div>
    <div class="mind-vp" id="mvp" tabindex="0"><div class="mind-world" id="mworld"><svg class="mind-edges" id="medges"><defs><marker id="marr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs><g id="medgeg"></g><path id="mprev" class="m-prev" d=""/></svg><div id="mnodes"></div><div id="mhandles"></div></div>
      <div class="mind-marq" id="mmarq"></div><div class="mind-empty" id="mEmpty"><div>${ic('sparkle', 'lg')}</div><b>${t('mind_empty')}</b><span>${t('mind_empty_hint')}</span></div></div>
    <canvas class="mind-mini" id="mmini" width="180" height="120" title="${t('mind_minimap')}"></canvas>
    <div class="mind-tools" id="mtools">${TOOLS.map(([k, key, p]) => `<button data-tool="${k}" title="${t('mtool_' + k)} (${key})"><svg viewBox="0 0 24 24" class="svg">${p}</svg><span>${t('mtool_' + k)}</span></button>`).join('')}</div>
    <div class="mind-ctx" id="mctx"></div><div class="mind-menu" id="mmenu"></div><input type="file" id="mImg" accept="image/*" hidden></div>`;
}
afterRenderHook('mind', () => { if (route.arg && $('#mind')) mindInit(); else document.body.classList.remove('mind-mode'); });
function mindInit() {
  document.body.classList.add('mind-mode');
  if (M.bid !== route.arg) { M.bid = route.arg; M.sel.clear(); M.selEdge = null; M.undo = []; M.redo = []; M.tool = 'select'; M.editing = null;
    let v = null; try { v = JSON.parse(localStorage.getItem('mind.view.' + M.bid)); } catch (e) { } M.view = v || { x: 0, y: 0, k: 1, fit: true }; }
  M.editing = null;
  const vp = $('#mvp');
  vp.addEventListener('pointerdown', onDown); vp.addEventListener('wheel', onWheel, { passive: false });
  vp.addEventListener('contextmenu', onMenu);
  $('#mtools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); });
  $('#mind').addEventListener('click', e => { const b = e.target.closest('[data-mact]'); if (b) { hideMenu(); MACT[b.dataset.mact]?.(b, e); } });
  $('#mTitle').addEventListener('change', e => { const b = board(); b.title = e.target.value.trim() || b.title; persist(); });
  $('#mImg').addEventListener('change', e => { const f = e.target.files[0]; if (f) addImage(f, M.imgAt); M.imgAt = null; e.target.value = ''; });
  $('#mmini').addEventListener('pointerdown', miniNav);
  draw(); if (M.view.fit) requestAnimationFrame(fit);
}
const pkey = () => { try { localStorage.setItem('mind.view.' + M.bid, JSON.stringify({ x: M.view.x, y: M.view.y, k: M.view.k })); } catch (e) { } };
function persist() { const b = board(); if (!b) return; b.updatedAt = Date.now(); save(); const s = $('#mSaved'); if (s) { s.classList.add('pulse'); setTimeout(() => s.classList.remove('pulse'), 700); } scheduleMini(); }
function snap() { const b = board(); M.undo.push(JSON.stringify({ n: b.nodes, e: b.edges })); if (M.undo.length > 100) M.undo.shift(); M.redo = []; }
const forSel = fn => { snap(); M.sel.forEach(id => { const n = mnode(id); if (n) fn(n); }); persist(); draw(); };
const MACT = {
  undo: () => { const b = board(); if (!M.undo.length) return; M.redo.push(JSON.stringify({ n: b.nodes, e: b.edges })); const s = JSON.parse(M.undo.pop()); b.nodes = s.n; b.edges = s.e; M.sel.clear(); M.selEdge = null; persist(); draw(); },
  redo: () => { const b = board(); if (!M.redo.length) return; M.undo.push(JSON.stringify({ n: b.nodes, e: b.edges })); const s = JSON.parse(M.redo.pop()); b.nodes = s.n; b.edges = s.e; M.sel.clear(); M.selEdge = null; persist(); draw(); },
  zin: () => zoomAt(1.2), zout: () => zoomAt(1 / 1.2), fit: () => fit(),
  snapT: () => { M.snap = !M.snap; try { localStorage.setItem('mind.snap', M.snap ? '1' : '0'); } catch (e) { } $('#mSnap').classList.toggle('on', M.snap); toast(M.snap ? t('mind_snap_on') : t('mind_snap_off')); },
  help: () => { const o = openModal(`<div class="modal-h"><h2>⌨️ ${t('mind_help')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div><div class="mind-help">${t('mind_help_body')}</div>`); o.querySelector('[data-close]').onclick = closeModal; },
  color: b => { if (M.selEdge) { const e = board().edges.find(x => x.id === M.selEdge); snap(); e.color = b.dataset.c; persist(); draw(); } else forSel(n => n.color = b.dataset.c); },
  fs: b => forSel(n => n.fs = +b.dataset.v),
  bold: () => forSel(n => n.bold = n.bold ? 0 : 1),
  align: b => forSel(n => n.align = b.dataset.v),
  shape: b => forSel(n => { if (n.type === 'shape') n.shape = b.dataset.v; }),
  edit: () => { const id = [...M.sel][0]; if (id) startEdit(id); },
  child: () => { const id = [...M.sel][0]; if (id) addChild(id); },
  dup: () => duplicate(), del: () => delSel(),
  front: () => { const b = board(); snap(); const s = b.nodes.filter(n => M.sel.has(n.id)); b.nodes = b.nodes.filter(n => !M.sel.has(n.id)).concat(s); persist(); draw(); },
  back: () => { const b = board(); snap(); const s = b.nodes.filter(n => M.sel.has(n.id)); b.nodes = s.concat(b.nodes.filter(n => !M.sel.has(n.id))); persist(); draw(); },
  dash: () => { const e = board().edges.find(x => x.id === M.selEdge); if (!e) return; snap(); e.dash = e.dash ? 0 : 1; persist(); draw(); },
  arrow: () => { const e = board().edges.find(x => x.id === M.selEdge); if (!e) return; snap(); e.arrow = ((e.arrow ?? 1) + 1) % 3; persist(); draw(); },
  label: () => editEdgeLabel(M.selEdge),
  openRef: () => { const n = mnode([...M.sel][0]); if (n && n.ref) openRef(n.ref); },
  menuAdd: b => { const tool = b.dataset.v; const p = M.menuAt; if (tool === 'image') { M.imgAt = p; $('#mImg').click(); return; } const n = addNode(tool, p.x, p.y); if (TEXTY.includes(n.type)) setTimeout(() => startEdit(n.id), 30); },
  paste: () => { if (M.clip) duplicate(M.clip.nodes.map(n => ({ ...n }))); },
  selAll: () => { M.sel = new Set(board().nodes.map(n => n.id)); selRefresh(); },
  png: () => exportPNG(),
};
function setTool(k) {
  if (k === 'image') { $('#mImg').click(); return; }
  if (k === 'link') { pickItem(); return; }
  M.tool = k; M.connFrom = null; $$('#mtools [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === k));
  const vp = $('#mvp'); if (vp) vp.dataset.tool = k;
}
/* coordinates */
const vpRect = () => $('#mvp').getBoundingClientRect();
function toWorld(cx, cy) { const r = vpRect(); return { x: (cx - r.left - M.view.x) / M.view.k, y: (cy - r.top - M.view.y) / M.view.k }; }
function applyView() {
  const w = $('#mworld'); if (!w) return; const { x, y, k } = M.view;
  w.style.transform = `translate(${x}px,${y}px) scale(${k})`; w.style.setProperty('--ik', 1 / k);
  const vp = $('#mvp'); vp.style.backgroundSize = `${24 * k}px ${24 * k}px`; vp.style.backgroundPosition = `${x}px ${y}px`;
  const z = $('#mZoom'); if (z) z.textContent = Math.round(k * 100) + '%';
  placeCtx(); scheduleMini();
}
function zoomAt(f, cx, cy) { const r = vpRect(); cx = cx ?? r.left + r.width / 2; cy = cy ?? r.top + r.height / 2;
  const k2 = clamp(M.view.k * f, .1, 4); const wx = (cx - r.left - M.view.x) / M.view.k, wy = (cy - r.top - M.view.y) / M.view.k;
  M.view.k = k2; M.view.x = cx - r.left - wx * k2; M.view.y = cy - r.top - wy * k2; delete M.view.fit; applyView(); pkey(); }
function bbox(ns) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; ns.forEach(n => { const h = nodeH(n); x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.w); y1 = Math.max(y1, n.y + h); }); return { x0, y0, x1, y1 }; }
function fit() {
  const b = board(), r = vpRect(); if (!b || !r.height) return;
  if (!b.nodes.length) { M.view = { x: r.width / 2, y: r.height / 2, k: 1 }; applyView(); pkey(); return; }
  const { x0, y0, x1, y1 } = bbox(b.nodes);
  const k = clamp(Math.min((r.width - 120) / (x1 - x0 || 1), (r.height - 200) / (y1 - y0 || 1)), .15, 1.4);
  M.view = { k, x: r.width / 2 - (x0 + x1) / 2 * k, y: r.height / 2 - (y0 + y1) / 2 * k + 10 }; applyView(); pkey();
}
const nodeEl = id => document.querySelector(`#mnodes .mn[data-id="${id}"]`);
const nodeH = n => { const el = nodeEl(n.id); return el ? el.offsetHeight : (n.h || 60); };
/* readable text on any fill */
function ink(c) { if (!c || c[0] !== '#' || c.length < 7) return '#1d2a28'; const v = parseInt(c.slice(1, 7), 16); const l = (.299 * (v >> 16) + .587 * ((v >> 8) & 255) + .114 * (v & 255)) / 255; return l > .55 ? '#1d2a28' : '#f4f7f6'; }

/* ---------- drawing ---------- */
function nodeHTML(n) {
  const sel = M.sel.has(n.id); const fs = n.fs || DEF[n.type]?.[2] || 16;
  const fixedH = n.type === 'image' || n.type === 'frame';
  const minH = (n.type === 'sticky' || n.type === 'shape') && n.h ? `min-height:${n.h}px;` : '';
  const color = n.type === 'text' ? (n.color ? `color:${n.color};` : '') : (n.type === 'sticky' || n.type === 'shape') ? `color:${ink(n.color || (n.type === 'sticky' ? '#ffe08a' : '#d4c2ff'))};` : '';
  const st = `left:${n.x}px;top:${n.y}px;width:${n.w}px;${fixedH && n.h ? `height:${n.h}px;` : ''}${minH}--c:${n.color || ''};font-size:${fs}px;${n.bold ? 'font-weight:700;' : ''}${color}text-align:${n.align || (n.type === 'text' ? 'start' : 'center')};`;
  let inner = '';
  if (n.type === 'frame') inner = `<div class="mn-ftitle mn-tx" dir="auto">${esc(n.text || t('mtool_frame'))}</div>`;
  else if (n.type === 'image') inner = `<img src="${n.img}" draggable="false" alt="">`;
  else if (n.type === 'link') { const it = refItem(n.ref); inner = `<div class="mn-link"><span class="mn-licon">${ic(n.ref?.coll === 'tasks' ? 'tasks' : n.ref?.coll === 'projects' ? 'folder' : n.ref?.coll === 'boards' ? 'sparkle' : 'note')}</span><div><b dir="auto">${esc(it ? (it.title || it.name) : '—')}</b><small>${it ? refMeta(n.ref, it) : t('mind_missing')}</small></div></div>`; }
  else {
    const bg = n.type === 'shape' && (n.shape === 'ellipse' || n.shape === 'diamond') ? `<svg class="mn-bg" viewBox="0 0 100 100" preserveAspectRatio="none">${n.shape === 'ellipse' ? '<ellipse cx="50" cy="50" rx="49" ry="49"/>' : '<path d="M50 1L99 50L50 99L1 50Z"/>'}</svg>` : '';
    inner = `${bg}<div class="mn-tx" dir="auto" data-ph="${n.type === 'text' ? t('mind_text_ph') : ''}">${esc(n.text || '')}</div>`;
  }
  return `<div class="mn k-${n.type} ${n.type === 'shape' ? 'sh-' + (n.shape || 'rect') : ''} ${sel ? 'sel' : ''} ${M.connFrom === n.id ? 'conn' : ''} ${n.text ? '' : 'empty'}" data-id="${n.id}" style="${st}">${inner}</div>`;
}
function draw() {
  const b = board(); if (!b || !$('#mnodes')) return;
  const ordered = [...b.nodes.filter(n => n.type === 'frame'), ...b.nodes.filter(n => n.type !== 'frame')];
  $('#mnodes').innerHTML = ordered.map(nodeHTML).join('');
  $('#mEmpty').style.display = b.nodes.length ? 'none' : '';
  drawEdges(); drawHandles(); applyView(); setTool(M.tool === 'image' || M.tool === 'link' ? 'select' : M.tool);
}
/* selection changes never rebuild nodes (keeps double-click & editing stable) */
function selRefresh() {
  $$('#mnodes .mn').forEach(el => { el.classList.toggle('sel', M.sel.has(el.dataset.id)); el.classList.toggle('conn', M.connFrom === el.dataset.id); });
  drawEdges(); drawHandles(); placeCtx();
}
function drawHandles() {
  const h = $('#mhandles'); if (!h) return;
  const ns = [...M.sel].map(mnode).filter(Boolean);
  if (!ns.length || M.drag?.kind === 'marq') { h.innerHTML = ''; return; }
  if (ns.length > 1) { const { x0, y0, x1, y1 } = bbox(ns); h.innerHTML = `<div class="mh-box multi" style="left:${x0 - 6}px;top:${y0 - 6}px;width:${x1 - x0 + 12}px;height:${y1 - y0 + 12}px"></div>`; return; }
  const n = ns[0], H = nodeH(n), ed = M.editing === n.id;
  h.innerHTML = `<div class="mh-box ${ed ? 'editing' : ''}" style="left:${n.x}px;top:${n.y}px;width:${n.w}px;height:${H}px">${ed ? '' : `<i class="mh-rs" data-h="rs"></i>${['t', 'r', 'b', 'l'].map(s => `<i class="mh-dot d-${s}" data-h="dot"></i>`).join('')}`}</div>`;
}
function anchor(n, toward) {
  const h = nodeH(n), cx = n.x + n.w / 2, cy = n.y + h / 2;
  const dx = toward.x - cx, dy = toward.y - cy;
  if (Math.abs(dx) / (n.w / 2 + 1) > Math.abs(dy) / (h / 2 + 1)) return dx > 0 ? { x: n.x + n.w, y: cy, nx: 1, ny: 0 } : { x: n.x, y: cy, nx: -1, ny: 0 };
  return dy > 0 ? { x: cx, y: n.y + h, nx: 0, ny: 1 } : { x: cx, y: n.y, nx: 0, ny: -1 };
}
const center = n => ({ x: n.x + n.w / 2, y: n.y + nodeH(n) / 2 });
function edgePath(a, b) { const d = Math.max(40, Math.hypot(b.x - a.x, b.y - a.y) * .4); return `M${a.x} ${a.y} C${a.x + a.nx * d} ${a.y + a.ny * d} ${b.x + (b.nx || 0) * d} ${b.y + (b.ny || 0) * d} ${b.x} ${b.y}`; }
function drawEdges() {
  const b = board(), g = $('#medgeg'); if (!b || !g) return;
  g.innerHTML = b.edges.map(e => {
    const A = mnode(e.from), B = mnode(e.to); if (!A || !B) return '';
    const a = anchor(A, center(B)), bb = anchor(B, center(A)); const d = edgePath(a, bb); const col = e.color || 'var(--edge)';
    const mx = (a.x + bb.x) / 2, my = (a.y + bb.y) / 2; const ar = e.arrow ?? 1;
    return `<g class="me ${M.selEdge === e.id ? 'sel' : ''}" data-eid="${e.id}"><path d="${d}" class="me-hit"/><path d="${d}" class="me-line" style="stroke:${col}" ${e.dash ? 'stroke-dasharray="8 7"' : ''} ${ar >= 1 ? 'marker-end="url(#marr)"' : ''} ${ar === 2 ? 'marker-start="url(#marr)"' : ''}/>
      ${e.label ? `<foreignObject x="${mx - 100}" y="${my - 16}" width="200" height="32"><div class="me-label" dir="auto">${esc(e.label)}</div></foreignObject>` : ''}</g>`;
  }).join('');
}
/* minimap */
let miniRaf = 0;
function scheduleMini() { if (miniRaf) return; miniRaf = requestAnimationFrame(() => { miniRaf = 0; drawMini(); }); }
function drawMini() {
  const cv = $('#mmini'), b = board(); if (!cv || !b) return; const ctx = cv.getContext('2d'); const W = cv.width, H = cv.height; ctx.clearRect(0, 0, W, H);
  cv.style.display = b.nodes.length > 2 ? '' : 'none'; if (b.nodes.length <= 2) return;
  const r = vpRect(); const v = { x0: -M.view.x / M.view.k, y0: -M.view.y / M.view.k, x1: (r.width - M.view.x) / M.view.k, y1: (r.height - M.view.y) / M.view.k };
  const bb = b.nodes.reduce((a, n) => ({ x0: Math.min(a.x0, n.x), y0: Math.min(a.y0, n.y), x1: Math.max(a.x1, n.x + n.w), y1: Math.max(a.y1, n.y + (n.h || 80)) }), { ...v });
  const s = Math.min((W - 12) / (bb.x1 - bb.x0), (H - 12) / (bb.y1 - bb.y0)); const ox = 6 - bb.x0 * s, oy = 6 - bb.y0 * s; M.mini = { s, ox, oy };
  b.nodes.forEach(n => { ctx.fillStyle = n.type === 'frame' ? 'rgba(168,216,255,.25)' : n.type === 'text' ? 'rgba(200,220,215,.6)' : (n.color || '#ffe08a'); ctx.fillRect(n.x * s + ox, n.y * s + oy, Math.max(2, n.w * s), Math.max(2, (n.h || 40) * s)); });
  ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 1.5; ctx.strokeRect(v.x0 * s + ox, v.y0 * s + oy, (v.x1 - v.x0) * s, (v.y1 - v.y0) * s);
}
function miniNav(e) {
  const cv = $('#mmini'); const go_ = ev => { const rc = cv.getBoundingClientRect(); if (!M.mini) return; const wx = (ev.clientX - rc.left - M.mini.ox) / M.mini.s, wy = (ev.clientY - rc.top - M.mini.oy) / M.mini.s; const r = vpRect();
    M.view.x = r.width / 2 - wx * M.view.k; M.view.y = r.height / 2 - wy * M.view.k; applyView(); };
  go_(e); const mv = ev => go_(ev), up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); pkey(); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
/* contextual toolbar */
function placeCtx() {
  const c = $('#mctx'); if (!c) return; const b = board();
  if (M.editing || (!M.sel.size && !M.selEdge) || (M.drag && M.drag.kind !== 'pan')) { c.classList.remove('show'); return; }
  let html = '';
  const sw = (pal, cur) => pal.map(x => `<button class="sw ${x === (cur || '') ? 'on' : ''}" style="--c:${x || 'var(--text)'}" data-mact="color" data-c="${x}"></button>`).join('');
  if (M.selEdge) { const e = b.edges.find(x => x.id === M.selEdge); html = `${sw(['', '#5eead4', '#e9c78f', '#f3a6c8', '#b9a2ff', '#8ec5ff', '#ff7a8a'], e?.color)}<span class="mind-sep"></span><button data-mact="label">${ic('edit', 'sm')}${t('mind_label')}</button><button data-mact="dash" title="${t('mind_dash')}">┄</button><button data-mact="arrow" title="${t('mind_arrow')}">⇄</button><button data-mact="del">${ic('trash', 'sm')}</button>`; }
  else {
    const ns = [...M.sel].map(mnode).filter(Boolean); const one = ns.length === 1 ? ns[0] : null; const allText = ns.every(n => n.type === 'text');
    const texty = ns.some(n => TEXTY.includes(n.type));
    html = `${one && TEXTY.includes(one.type) ? `<button data-mact="edit" class="primary-ish">${ic('edit', 'sm')}${t('edit')}</button><span class="mind-sep"></span>` : ''}
      ${ns.some(n => n.type !== 'image' && n.type !== 'link') ? sw(allText ? TCOL : MCOL, one?.color) + '<span class="mind-sep"></span>' : ''}
      ${texty ? [12, 16, 20, 28, 40].map((v, i) => `<button data-mact="fs" data-v="${v}" class="fsb ${one && (one.fs || DEF[one.type]?.[2]) === v ? 'on' : ''}">${['XS', 'S', 'M', 'L', 'XL'][i]}</button>`).join('') + `<button data-mact="bold" class="${one?.bold ? 'on' : ''}"><b>B</b></button>`
        + ['start', 'center', 'end'].map(a => `<button data-mact="align" data-v="${a}" title="${t('mind_align')}">${a === 'center' ? '≡' : (a === 'start') === (document.documentElement.dir === 'rtl') ? '⫸' : '⫷'}</button>`).join('') + '<span class="mind-sep"></span>' : ''}
      ${ns.some(n => n.type === 'shape') ? ['rect', 'pill', 'ellipse', 'diamond'].map(v => `<button data-mact="shape" data-v="${v}">${{ rect: '▭', pill: '⬭', ellipse: '◯', diamond: '◇' }[v]}</button>`).join('') + '<span class="mind-sep"></span>' : ''}
      ${one && one.ref ? `<button data-mact="openRef">${ic('arrowUp', 'sm')}${t('mind_open')}</button>` : ''}
      ${one ? `<button data-mact="child" title="Tab">＋${t('mind_child')}</button>` : ''}
      <button data-mact="front" title="${t('mind_front')}">⤒</button><button data-mact="back" title="${t('mind_back')}">⤓</button><button data-mact="dup" title="Ctrl+D">⧉</button><button data-mact="del" title="Delete">${ic('trash', 'sm')}</button>`;
  }
  c.innerHTML = html; c.classList.add('show');
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  if (M.selEdge) { const e = b.edges.find(x => x.id === M.selEdge); const A = e && mnode(e.from), B = e && mnode(e.to); if (A && B) { const a = center(A), bb = center(B); x0 = Math.min(a.x, bb.x); x1 = Math.max(a.x, bb.x); y0 = Math.min(a.y, bb.y); y1 = Math.max(a.y, bb.y); } }
  else ({ x0, y0, x1, y1 } = bbox([...M.sel].map(mnode).filter(Boolean)));
  if (x0 > 1e8) { c.classList.remove('show'); return; }
  const r = vpRect(); const sx = (x0 + x1) / 2 * M.view.k + M.view.x, sy = y0 * M.view.k + M.view.y;
  if (window.innerWidth < 760) { c.style.left = ''; c.style.top = ''; c.classList.add('dock'); return; }
  c.classList.remove('dock'); c.style.left = clamp(sx - c.offsetWidth / 2, 8, r.width - c.offsetWidth - 8) + 'px';
  const ch = Math.max(c.offsetHeight, 44); let top = sy - ch - 30 * Math.max(1, M.view.k); if (top < 70) top = y1 * M.view.k + M.view.y + 30; c.style.top = clamp(top, 70, r.height - ch - 90) + 'px';
}
/* right-click menu */
function onMenu(e) {
  e.preventDefault(); const m = $('#mmenu'); const el = e.target.closest('.mn'); const w = toWorld(e.clientX, e.clientY); M.menuAt = w;
  if (el) { const id = el.dataset.id; if (!M.sel.has(id)) { M.sel = new Set([id]); M.selEdge = null; selRefresh(); } }
  const one = el && M.sel.size === 1 ? mnode(el.dataset.id) : null;
  m.innerHTML = el ? `${one && TEXTY.includes(one.type) ? `<button data-mact="edit">${ic('edit', 'sm')}${t('edit')}<kbd>Enter</kbd></button>` : ''}${one ? `<button data-mact="child">＋ ${t('mind_child')}<kbd>Tab</kbd></button>` : ''}
      <button data-mact="dup">⧉ ${t('mind_dup')}<kbd>Ctrl D</kbd></button><button data-mact="front">⤒ ${t('mind_front')}</button><button data-mact="back">⤓ ${t('mind_back')}</button><hr><button data-mact="del" class="neg">${ic('trash', 'sm')}${t('delete')}<kbd>Del</kbd></button>`
    : `${[['sticky', '🟨'], ['text', '🔤'], ['shape', '▭'], ['frame', '⬚'], ['image', '🖼']].map(([k, i]) => `<button data-mact="menuAdd" data-v="${k}">${i} ${t('mtool_' + k)}</button>`).join('')}<hr>${M.clip ? `<button data-mact="paste">📋 ${t('mind_paste')}<kbd>Ctrl V</kbd></button>` : ''}<button data-mact="selAll">${t('mind_selall')}<kbd>Ctrl A</kbd></button><button data-mact="fit">${t('mind_fit')}<kbd>0</kbd></button>`;
  m.classList.add('show'); const mr = $('#mind').getBoundingClientRect();
  m.style.left = Math.min(e.clientX - mr.left, mr.width - m.offsetWidth - 8) + 'px'; m.style.top = Math.min(e.clientY - mr.top, mr.height - m.offsetHeight - 8) + 'px';
}
function hideMenu() { $('#mmenu')?.classList.remove('show'); }

/* ---------- create / edit ---------- */
function addNode(type, x, y, extra = {}) {
  const b = board(); const base = type === 'ellipse' || type === 'diamond' ? 'shape' : type; const [w, h, fs] = DEF[base];
  const n = Object.assign({ id: uid(), type: base, w, h: h || undefined, text: '', fs,
    color: base === 'sticky' ? MCOL[Math.floor(Math.random() * 6)] : base === 'frame' ? '#a8d8ff' : base === 'text' ? '' : '#d4c2ff' }, extra);
  n.x = Math.round(x - n.w / 2); n.y = Math.round(y - (n.h || 40) / 2);
  if (M.snap) { n.x = Math.round(n.x / 8) * 8; n.y = Math.round(n.y / 8) * 8; }
  if (type === 'ellipse') n.shape = 'ellipse'; else if (type === 'diamond') n.shape = 'diamond'; else if (n.type === 'shape') n.shape = n.shape || 'rect';
  snap(); b.nodes.push(n); M.sel = new Set([n.id]); M.selEdge = null; persist(); draw(); return n;
}
function caretEnd(el) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
function startEdit(id, selectAll) {
  if (M.editing === id) return; if (M.editing) finishEdit();
  const n = mnode(id); const el = nodeEl(id)?.querySelector('.mn-tx'); if (!n || !el) return;
  M.editing = id; M.sel = new Set([id]); M.selEdge = null;
  try { el.contentEditable = 'plaintext-only'; } catch (e) { } if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
  el.closest('.mn').classList.add('editing'); el.closest('.mn').classList.remove('empty');
  el.focus({ preventScroll: true }); if (selectAll) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } else caretEnd(el);
  selRefresh();
  const onKey = e => { e.stopPropagation(); if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); finishEdit(); } else if (e.key === 'Tab') { e.preventDefault(); finishEdit(); addChild(id); } };
  const onInput = () => { drawEdges(); drawHandles(); };
  el.addEventListener('keydown', onKey); el.addEventListener('input', onInput);
  el.addEventListener('blur', () => setTimeout(() => { if (M.editing === id && document.activeElement !== el) finishEdit(); }, 0));
  M.editEnd = () => { el.removeEventListener('keydown', onKey); el.removeEventListener('input', onInput); return el.innerText.replace(/\n$/, ''); };
}
function finishEdit() {
  const id = M.editing; if (!id) return; const n = mnode(id); const v = M.editEnd ? M.editEnd() : ''; M.editing = null; M.editEnd = null;
  if (n) { if (v !== (n.text || '')) { snap(); n.text = v; } if (n.type === 'text' && !v.trim()) { board().nodes = board().nodes.filter(x => x !== n); board().edges = board().edges.filter(e => e.from !== id && e.to !== id); M.sel.delete(id); } persist(); }
  draw(); placeCtx();
}
function addChild(pid, sibling) {
  const b = board(); const p = mnode(pid); if (!p) return;
  const kind = p.type === 'frame' || p.type === 'image' || p.type === 'link' ? 'sticky' : p.type === 'shape' ? (p.shape === 'ellipse' || p.shape === 'diamond' ? p.shape : 'shape') : p.type;
  if (sibling) { const inc = b.edges.find(e => e.to === pid); const par = inc && mnode(inc.from); if (par) { const kids = b.edges.filter(e => e.from === par.id).map(e => mnode(e.to)).filter(Boolean);
    const lowest = kids.reduce((m, k) => Math.max(m, k.y + nodeH(k)), 0); const n = addNode(kind, p.x + p.w / 2, lowest + 30 + nodeH(p) / 2, { color: p.color, shape: p.shape, fs: p.fs, w: p.w, h: p.h });
    b.edges.push({ id: uid(), from: par.id, to: n.id }); persist(); draw(); setTimeout(() => startEdit(n.id), 30); return; } }
  const rtl = document.documentElement.dir === 'rtl'; const kids = b.edges.filter(e => e.from === pid).map(e => mnode(e.to)).filter(Boolean);
  const w = p.type === 'frame' ? 200 : Math.min(p.w, 240), h = p.type === 'text' ? undefined : (p.type === 'frame' ? 140 : Math.min(p.h || 100, 200));
  const x = rtl ? p.x - 110 - w / 2 : p.x + p.w + 110 + w / 2; const y = kids.length ? kids.reduce((m, k) => Math.max(m, k.y + nodeH(k)), -1e9) + 30 + (h || 40) / 2 : p.y + nodeH(p) / 2;
  const n = addNode(kind, x, y, { w, h, color: p.type === 'frame' || p.type === 'image' || p.type === 'link' ? MCOL[kids.length % 6] : p.color, shape: p.shape, fs: p.type === 'text' ? p.fs : p.fs });
  b.edges.push({ id: uid(), from: pid, to: n.id }); persist(); draw(); setTimeout(() => startEdit(n.id), 30);
}
function delSel() {
  const b = board(); snap();
  if (M.selEdge) { b.edges = b.edges.filter(e => e.id !== M.selEdge); M.selEdge = null; }
  else { b.nodes = b.nodes.filter(n => !M.sel.has(n.id)); b.edges = b.edges.filter(e => !M.sel.has(e.from) && !M.sel.has(e.to)); M.sel.clear(); }
  persist(); draw();
}
function duplicate(src) {
  const b = board(); const ns = src || [...M.sel].map(mnode).filter(Boolean); if (!ns.length) return; snap();
  const map = {}; const copies = ns.map(n => { const c = JSON.parse(JSON.stringify(n)); c.id = uid(); map[n.id] = c.id; c.x += 32; c.y += 32; return c; });
  const es = b.edges.filter(e => map[e.from] && map[e.to]).map(e => ({ ...e, id: uid(), from: map[e.from], to: map[e.to] }));
  if (src && M.clip) M.clip.edges.forEach(e => { if (map[e.from] && map[e.to]) es.push({ ...e, id: uid(), from: map[e.from], to: map[e.to] }); });
  b.nodes.push(...copies); b.edges.push(...es); M.sel = new Set(copies.map(c => c.id)); persist(); draw();
}
function editEdgeLabel(eid) {
  const e = board().edges.find(x => x.id === eid); if (!e) return;
  const o = openModal(`<div class="modal-h"><h2>${t('mind_label')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div><input class="input" id="elIn" value="${esc(e.label || '')}"><div class="modal-f" style="margin-top:14px"><span class="sp"></span><button class="btn primary" id="elOk">${t('save')}</button></div>`);
  o.querySelector('[data-close]').onclick = closeModal; const ok = () => { snap(); e.label = $('#elIn').value.trim(); closeModal(); persist(); draw(); };
  o.querySelector('#elOk').onclick = ok; $('#elIn').addEventListener('keydown', ev => { if (ev.key === 'Enter') ok(); }); setTimeout(() => $('#elIn')?.focus(), 30);
}
function addImage(file, at) {
  const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => {
    const mx = 1400, sc = Math.min(1, mx / Math.max(im.width, im.height)); const cv = document.createElement('canvas'); cv.width = Math.round(im.width * sc); cv.height = Math.round(im.height * sc);
    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); const url = cv.toDataURL('image/jpeg', .84);
    const w = Math.min(420, cv.width), h = Math.round(w * cv.height / cv.width); const r = vpRect(); const p = at || toWorld(r.left + r.width / 2, r.top + r.height / 2);
    addNode('image', p.x, p.y, { img: url, w, h }); }; im.src = rd.result; }; rd.readAsDataURL(file);
}
/* links to app items */
function refItem(ref) { if (!ref) return null; return (S[ref.coll] || []).find(x => x.id === ref.id); }
function refMeta(ref, it) { if (ref.coll === 'tasks') return (it.status === 'done' ? '✓ ' : '') + (it.due ? relDay(it.due) : t('type_task')); if (ref.coll === 'projects') return t('f_project') + ' · ' + projStats(it).pct + '%'; if (ref.coll === 'boards') return t('nav_mind'); return t('type_' + (it.type || 'note')); }
function openRef(ref) { const it = refItem(ref); if (!it) return; if (ref.coll === 'tasks') openForm('tasks', it); else if (ref.coll === 'notes') openNote(it); else if (ref.coll === 'projects') go('projects', it.id); else if (ref.coll === 'boards') go('mind', it.id); }
function pickItem() {
  const o = openModal(`<div class="modal-h"><h2>${ic('link')} ${t('mind_link_title')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div><input class="input" id="liQ" placeholder="${t('search')}…"><div id="liList" class="li-list"></div>`);
  o.querySelector('[data-close]').onclick = closeModal;
  const items = [...S.tasks.filter(isOpen).map(x => ['tasks', x, 'tasks']), ...S.notes.map(x => ['notes', x, 'note']), ...S.projects.map(x => ['projects', x, 'folder']), ...S.boards.filter(b => b.id !== M.bid).map(x => ['boards', x, 'sparkle'])];
  const drawL = () => { const q = $('#liQ').value.trim().toLowerCase(); $('#liList').innerHTML = items.filter(([, x]) => !q || (x.title || '').toLowerCase().includes(q)).slice(0, 40).map(([c, x, i]) => `<div class="pal-item" data-c="${c}" data-id="${x.id}">${ic(i)}<span>${esc(x.title)}</span><small>${t(c === 'boards' ? 'nav_mind' : 'nav_' + c)}</small></div>`).join('') || emptyBox(); };
  $('#liQ').addEventListener('input', drawL); drawL(); setTimeout(() => $('#liQ').focus(), 30);
  $('#liList').addEventListener('click', e => { const r = e.target.closest('.pal-item'); if (!r) return; closeModal(); const vr = vpRect(); const p = toWorld(vr.left + vr.width / 2, vr.top + vr.height / 2);
    addNode('link', p.x, p.y, { ref: { coll: r.dataset.c, id: r.dataset.id }, w: 270 }); });
}
/* export as PNG */
function exportPNG() {
  const b = board(); if (!b.nodes.length) return; const { x0, y0, x1, y1 } = bbox(b.nodes); const pad = 60, sc = 2;
  const W = Math.min(8000, (x1 - x0 + pad * 2) * sc), H = Math.min(8000, (y1 - y0 + pad * 2) * sc); const k = Math.min(sc, W / (x1 - x0 + pad * 2), H / (y1 - y0 + pad * 2));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const css = getComputedStyle(document.documentElement); c.fillStyle = css.getPropertyValue('--bg').trim() || '#081311'; c.fillRect(0, 0, W, H);
  c.setTransform(k, 0, 0, k, (pad - x0) * k, (pad - y0) * k); const font = getComputedStyle(document.body).fontFamily; c.direction = document.documentElement.dir;
  const wrap = (txt, maxW) => { const out = []; String(txt || '').split('\n').forEach(par => { let line = ''; par.split(' ').forEach(w => { const tt = line ? line + ' ' + w : w; if (c.measureText(tt).width > maxW && line) { out.push(line); line = w; } else line = tt; }); out.push(line); }); return out; };
  const rr = (x, y, w, h, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); };
  b.edges.forEach(e => { const A = mnode(e.from), B = mnode(e.to); if (!A || !B) return; const a = anchor(A, center(B)), bb = anchor(B, center(A)); c.strokeStyle = e.color || '#9fb5b0'; c.lineWidth = 2.2; c.setLineDash(e.dash ? [8, 7] : []); c.stroke(new Path2D(edgePath(a, bb))); c.setLineDash([]); });
  const imgs = [];
  [...b.nodes.filter(n => n.type === 'frame'), ...b.nodes.filter(n => n.type !== 'frame')].forEach(n => {
    const h = nodeH(n), fs = n.fs || DEF[n.type]?.[2] || 16;
    if (n.type === 'frame') { c.fillStyle = (n.color || '#a8d8ff') + '22'; c.strokeStyle = (n.color || '#a8d8ff') + '99'; c.lineWidth = 1.5; rr(n.x, n.y, n.w, h, 18); c.fill(); c.stroke(); c.fillStyle = css.getPropertyValue('--text').trim(); c.font = `600 14px ${font}`; c.textAlign = 'start'; c.fillText(n.text || '', n.x + 10, n.y - 10); return; }
    if (n.type === 'image') { imgs.push(n); return; }
    if (n.type === 'sticky' || n.type === 'shape') { c.fillStyle = n.color || (n.type === 'sticky' ? '#ffe08a' : '#d4c2ff'); if (n.shape === 'ellipse') { c.beginPath(); c.ellipse(n.x + n.w / 2, n.y + h / 2, n.w / 2, h / 2, 0, 0, 7); c.fill(); } else if (n.shape === 'diamond') { c.beginPath(); c.moveTo(n.x + n.w / 2, n.y); c.lineTo(n.x + n.w, n.y + h / 2); c.lineTo(n.x + n.w / 2, n.y + h); c.lineTo(n.x, n.y + h / 2); c.closePath(); c.fill(); } else { rr(n.x, n.y, n.w, h, n.shape === 'pill' ? h / 2 : n.type === 'sticky' ? 6 : 12); c.fill(); } }
    if (n.type === 'link') { c.fillStyle = css.getPropertyValue('--bg2').trim(); rr(n.x, n.y, n.w, h, 14); c.fill(); }
    c.fillStyle = n.type === 'text' ? (n.color || css.getPropertyValue('--text').trim()) : n.type === 'link' ? css.getPropertyValue('--text').trim() : ink(n.color); c.font = `${n.bold ? 700 : 400} ${fs}px ${font}`;
    const txt = n.type === 'link' ? (refItem(n.ref)?.title || '') : n.text; const lines = wrap(txt, n.w - 28); const lh = fs * 1.6; const al = n.align || (n.type === 'text' ? 'start' : 'center');
    c.textAlign = al === 'center' ? 'center' : al; const tx = al === 'center' ? n.x + n.w / 2 : (al === 'start') === (c.direction === 'rtl') ? n.x + n.w - 14 : n.x + 14;
    let ty = n.type === 'text' || n.type === 'link' ? n.y + 14 + fs : n.y + h / 2 - (lines.length - 1) * lh / 2 + fs * .35; lines.forEach(l => { c.fillText(l, tx, ty); ty += lh; });
  });
  let left = imgs.length; const done = () => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = (b.title || 'board') + '.png'; a.click(); toast(t('mind_png_done')); };
  if (!left) return done(); imgs.forEach(n => { const im = new Image(); im.onload = im.onerror = () => { try { c.drawImage(im, n.x, n.y, n.w, n.h || nodeH(n)); } catch (e) { } if (--left === 0) done(); }; im.src = n.img; });
}

/* ---------- pointer interactions ---------- */
function onDown(e) {
  hideMenu();
  if (e.button === 2) return;
  if (M.editing && e.target.closest('.mn-tx[contenteditable]')) return; // let the caret move inside the text being edited
  const vp = $('#mvp'); M.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (M.ptrs.size === 2) { const [a, b] = [...M.ptrs.values()]; M.drag = { kind: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; return; }
  const nEl = e.target.closest('.mn'), nid = nEl?.dataset.id, handle = e.target.closest('[data-h]'), edgeEl = e.target.closest('.me');
  if (M.editing) finishEdit();
  const w = toWorld(e.clientX, e.clientY);
  // double click / double tap (works on mouse, pen and touch, independent of DOM re-renders)
  const key = handle ? 'h' : nid ? 'n:' + nid : edgeEl ? 'e:' + edgeEl.dataset.eid : 'bg'; const now = Date.now();
  if (M.lastTap && M.lastTap.key === key && now - M.lastTap.t < 380 && Math.hypot(e.clientX - M.lastTap.x, e.clientY - M.lastTap.y) < 12 && key !== 'h') {
    M.lastTap = null; M.drag = null;
    if (nid) { const n = mnode(nid); if (n.type === 'link') openRef(n.ref); else if (TEXTY.includes(n.type)) startEdit(nid); }
    else if (edgeEl) editEdgeLabel(edgeEl.dataset.eid);
    else if (M.tool === 'select' || M.tool === 'hand') { const n = addNode('sticky', w.x, w.y); setTimeout(() => startEdit(n.id), 30); }
    return;
  }
  M.lastTap = { key, t: now, x: e.clientX, y: e.clientY };
  try { vp.setPointerCapture(e.pointerId); } catch (er) { }
  if (e.button === 1 || M.space || M.tool === 'hand' || (e.pointerType === 'touch' && !nid && !edgeEl && !handle && M.tool === 'select')) { M.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: M.view.x, vy: M.view.y }; vp.classList.add('panning'); return; }
  if (handle) { const n = mnode([...M.sel][0]); if (!n) return;
    if (handle.dataset.h === 'rs') { snap(); M.drag = { kind: 'resize', n, sx: w.x, sy: w.y, w: n.w, h: n.h || nodeH(n) }; }
    else M.drag = { kind: 'link', from: n.id };
    return; }
  if (edgeEl && !nid) { M.selEdge = edgeEl.dataset.eid; M.sel.clear(); selRefresh(); return; }
  if (nid) {
    if (M.tool === 'connector') { if (!M.connFrom) { M.connFrom = nid; selRefresh(); } else if (M.connFrom !== nid) { snap(); board().edges.push({ id: uid(), from: M.connFrom, to: nid }); M.connFrom = null; persist(); draw(); } return; }
    if (e.shiftKey) { M.sel.has(nid) ? M.sel.delete(nid) : M.sel.add(nid); } else if (!M.sel.has(nid)) M.sel = new Set([nid]);
    M.selEdge = null; selRefresh();
    const moving = new Set(M.sel); [...M.sel].map(mnode).filter(n => n && n.type === 'frame').forEach(f => board().nodes.forEach(n => { if (n.type !== 'frame' && n.x >= f.x && n.y >= f.y && n.x + n.w <= f.x + f.w && n.y + nodeH(n) <= f.y + f.h) moving.add(n.id); }));
    M.drag = { kind: 'move', sx: w.x, sy: w.y, start: [...moving].map(id => { const n = mnode(id); return [n, n.x, n.y]; }), snapped: false };
    return;
  }
  M.selEdge = null;
  if (['sticky', 'text', 'shape', 'ellipse', 'diamond', 'frame'].includes(M.tool)) { const tool = M.tool; const n = addNode(tool, w.x, w.y); setTool('select'); setTimeout(() => startEdit(n.id, tool === 'frame'), 30); return; }
  if (M.tool === 'connector') { M.connFrom = null; selRefresh(); return; }
  if (!e.shiftKey) M.sel.clear();
  M.drag = { kind: 'marq', sx: w.x, sy: w.y, cx: e.clientX, cy: e.clientY }; selRefresh();
}
window.addEventListener('pointermove', e => {
  if (!M.drag || !$('#mind')) return;
  if (M.ptrs.has(e.pointerId)) M.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const d = M.drag;
  if (d.kind === 'pinch' && M.ptrs.size >= 2) { const [a, b] = [...M.ptrs.values()]; const nd = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    M.view.x += mx - d.mx; M.view.y += my - d.my; zoomAt(nd / d.d, mx, my); d.d = nd; d.mx = mx; d.my = my; return; }
  if (d.kind === 'pan') { M.view.x = d.vx + e.clientX - d.sx; M.view.y = d.vy + e.clientY - d.sy; delete M.view.fit; applyView(); return; }
  const w = toWorld(e.clientX, e.clientY);
  if (d.kind === 'move') { if (!d.snapped) { if (Math.hypot(w.x - d.sx, w.y - d.sy) * M.view.k < 4) return; snap(); d.snapped = true; M.lastTap = null; $('#mctx').classList.remove('show'); }
    const g = M.snap && !e.altKey ? 8 : 1;
    d.start.forEach(([n, x, y]) => { n.x = Math.round((x + w.x - d.sx) / g) * g; n.y = Math.round((y + w.y - d.sy) / g) * g; const el = nodeEl(n.id); if (el) { el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; } }); drawEdges(); drawHandles(); return; }
  if (d.kind === 'resize') { const n = d.n; const g = M.snap && !e.altKey ? 8 : 1; n.w = Math.max(60, Math.round((d.w + w.x - d.sx) / g) * g);
    if (n.type === 'image') n.h = Math.round(n.w * d.h / d.w); else if (n.type !== 'text' && n.type !== 'link') n.h = Math.max(40, Math.round((d.h + w.y - d.sy) / g) * g);
    const el = nodeEl(n.id); if (el) { el.style.width = n.w + 'px'; if (n.type === 'image' || n.type === 'frame') el.style.height = n.h + 'px'; else if (n.h) el.style.minHeight = n.h + 'px'; } drawEdges(); drawHandles(); return; }
  if (d.kind === 'link') { const A = mnode(d.from); const a = anchor(A, w); $('#mprev').setAttribute('d', edgePath(a, { x: w.x, y: w.y })); return; }
  if (d.kind === 'marq') { const m = $('#mmarq'), r = vpRect(); const x = Math.min(e.clientX, d.cx) - r.left, y = Math.min(e.clientY, d.cy) - r.top;
    Object.assign(m.style, { display: 'block', left: x + 'px', top: y + 'px', width: Math.abs(e.clientX - d.cx) + 'px', height: Math.abs(e.clientY - d.cy) + 'px' });
    const x0 = Math.min(d.sx, w.x), x1 = Math.max(d.sx, w.x), y0 = Math.min(d.sy, w.y), y1 = Math.max(d.sy, w.y);
    $$('#mnodes .mn').forEach(el => { const n = mnode(el.dataset.id); const hit = n.x < x1 && n.x + n.w > x0 && n.y < y1 && n.y + el.offsetHeight > y0; el.classList.toggle('sel', hit || M.sel.has(n.id)); }); }
});
window.addEventListener('pointerup', e => {
  M.ptrs.delete(e.pointerId); const d = M.drag; if (!d || !$('#mind')) { M.drag = null; return; }
  $('#mvp')?.classList.remove('panning');
  if (d.kind === 'pinch') { if (M.ptrs.size < 2) M.drag = null; pkey(); return; }
  M.drag = null;
  if (d.kind === 'pan') { pkey(); placeCtx(); return; }
  if (d.kind === 'move') { if (d.snapped) persist(); placeCtx(); return; }
  if (d.kind === 'resize') { persist(); draw(); return; }
  if (d.kind === 'link') { $('#mprev').setAttribute('d', ''); const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.mn'); const w = toWorld(e.clientX, e.clientY);
    if (el && el.dataset.id !== d.from) { snap(); board().edges.push({ id: uid(), from: d.from, to: el.dataset.id }); persist(); draw(); }
    else if (!el) { const A = mnode(d.from); const kind = A.type === 'frame' || A.type === 'image' || A.type === 'link' ? 'sticky' : A.type === 'shape' && (A.shape === 'ellipse' || A.shape === 'diamond') ? A.shape : A.type;
      const n = addNode(kind, w.x, w.y, { color: A.type === 'frame' || A.type === 'image' || A.type === 'link' ? undefined : A.color, shape: A.shape, w: A.type === 'text' ? 240 : Math.min(A.w, 240), h: A.type === 'text' ? undefined : Math.min(A.h || 120, 200) });
      if (!n.color) n.color = MCOL[0]; board().edges.push({ id: uid(), from: d.from, to: n.id }); persist(); draw(); setTimeout(() => startEdit(n.id), 30); }
    return; }
  if (d.kind === 'marq') { $('#mmarq').style.display = 'none'; const w = toWorld(e.clientX, e.clientY); const x0 = Math.min(d.sx, w.x), x1 = Math.max(d.sx, w.x), y0 = Math.min(d.sy, w.y), y1 = Math.max(d.sy, w.y);
    if (x1 - x0 > 2 || y1 - y0 > 2) board().nodes.forEach(n => { if (n.x < x1 && n.x + n.w > x0 && n.y < y1 && n.y + nodeH(n) > y0) M.sel.add(n.id); }); selRefresh(); }
});
function onWheel(e) {
  e.preventDefault(); hideMenu();
  if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * .01), e.clientX, e.clientY);
  else { M.view.x -= e.shiftKey ? e.deltaY : e.deltaX; M.view.y -= e.shiftKey ? 0 : e.deltaY; delete M.view.fit; applyView(); clearTimeout(M.wt); M.wt = setTimeout(pkey, 300); }
}
document.addEventListener('keydown', e => {
  if (!$('#mind') || M.editing || $('#overlay') || $('#palette') || e.target.closest('input,textarea,[contenteditable=true],[contenteditable=plaintext-only]')) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (e.code === 'Space') { M.space = true; $('#mvp').classList.add('space'); e.preventDefault(); return; }
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? MACT.redo() : MACT.undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); MACT.redo(); return; }
  if (mod && k === 'd') { e.preventDefault(); duplicate(); return; }
  if (mod && k === 'b') { e.preventDefault(); if (M.sel.size) MACT.bold(); return; }
  if (mod && k === 'a') { e.preventDefault(); MACT.selAll(); return; }
  if (mod && k === 'c') { const ns = [...M.sel].map(mnode).filter(Boolean); if (ns.length) M.clip = { nodes: JSON.parse(JSON.stringify(ns)), edges: board().edges.filter(x => M.sel.has(x.from) && M.sel.has(x.to)) }; return; }
  if (mod && k === 'v' && M.clip) { e.preventDefault(); MACT.paste(); return; }
  if (mod) return;
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); delSel(); return; }
  if (k === 'escape') { hideMenu(); M.sel.clear(); M.selEdge = null; M.connFrom = null; setTool('select'); selRefresh(); return; }
  if (k === 'tab' && M.sel.size === 1) { e.preventDefault(); addChild([...M.sel][0], e.shiftKey); return; }
  if ((k === 'enter' || k === 'f2') && M.sel.size === 1) { e.preventDefault(); const id = [...M.sel][0]; if (e.shiftKey) addChild(id, true); else startEdit(id); return; }
  if (k.startsWith('arrow') && M.sel.size) { e.preventDefault(); const st = e.shiftKey ? 10 : 1; snap(); M.sel.forEach(id => { const n = mnode(id); if (k === 'arrowleft') n.x -= st; if (k === 'arrowright') n.x += st; if (k === 'arrowup') n.y -= st; if (k === 'arrowdown') n.y += st; }); persist(); draw(); return; }
  if (k === '+' || k === '=') { zoomAt(1.2); return; } if (k === '-') { zoomAt(1 / 1.2); return; } if (k === '0') { fit(); return; }
  if (M.sel.size === 1 && k.length === 1 && !/[vhstrodfcil]/.test(k) && TEXTY.includes(mnode([...M.sel][0])?.type)) { /* type-to-edit like FigJam */ const id = [...M.sel][0]; startEdit(id, true); return; }
  const tk = TOOLS.find(([, key]) => key.toLowerCase() === k); if (tk) setTool(tk[0]);
});
document.addEventListener('keyup', e => { if (e.code === 'Space' && $('#mind')) { M.space = false; $('#mvp')?.classList.remove('space'); } });
document.addEventListener('paste', e => {
  if (!$('#mind') || M.editing || $('#overlay') || e.target.closest('input,textarea,[contenteditable]')) return;
  const items = [...(e.clipboardData?.items || [])]; const img = items.find(i => i.type.startsWith('image/'));
  if (img) { e.preventDefault(); addImage(img.getAsFile()); return; }
  const txt = e.clipboardData?.getData('text/plain'); if (txt && txt.trim() && !M.clip) { e.preventDefault(); const r = vpRect(); const p = toWorld(r.left + r.width / 2, r.top + r.height / 2); addNode('sticky', p.x, p.y, { text: txt.trim().slice(0, 3000) }); }
});
document.addEventListener('pointerdown', e => { if (!e.target.closest('#mmenu')) hideMenu(); }, true);
window.addEventListener('resize', () => { if ($('#mind')) { placeCtx(); scheduleMini(); } });
