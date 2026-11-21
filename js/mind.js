/* Second Brain — Mind boards: infinite canvas (stickies, text, shapes, frames, images, links, connectors) */
'use strict';
const MCOL = ['#ffe08a', '#ffb3cf', '#b6f0a8', '#a8d8ff', '#d4c2ff', '#ffc59a', '#9ff0e0', '#e6e9ec', '#2b3a37'];
const M = { bid: null, view: { x: 0, y: 0, k: 1 }, sel: new Set(), selEdge: null, tool: 'select', undo: [], redo: [], clip: null, drag: null, ptrs: new Map(), space: false, editing: null, connFrom: null, inited: null };
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
function mindEditorHTML() {
  const b = S.boards.find(x => x.id === route.arg);
  return `<div class="mind" id="mind" dir="${document.documentElement.dir}">
    <div class="mind-top"><button class="icon-btn" data-act="go" data-v="mind" title="${t('back')}">${ic('chevR', 'flip')}</button><span class="mind-icon">${esc(b.icon || '🧠')}</span>
      <input class="mind-title" id="mTitle" value="${esc(b.title)}"><span class="mind-saved" id="mSaved">${ic('cloud', 'sm')}</span>
      <div class="mind-top-r"><button class="icon-btn" data-mact="undo" title="Ctrl+Z">${ic('rotate')}</button><button class="icon-btn" data-mact="redo" title="Ctrl+Shift+Z" style="transform:scaleX(-1)">${ic('rotate')}</button>
      <span class="mind-sep"></span><button class="icon-btn" data-mact="zout">${ic('minus')}</button><button class="mind-zoom" data-mact="fit" id="mZoom">100%</button><button class="icon-btn" data-mact="zin">${ic('plus')}</button>
      <button class="icon-btn" data-mact="help" title="?">?</button></div></div>
    <div class="mind-vp" id="mvp" tabindex="0"><div class="mind-world" id="mworld"><svg class="mind-edges" id="medges"><defs><marker id="marr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs><g id="medgeg"></g><path id="mprev" class="m-prev" d=""/></svg><div id="mnodes"></div></div>
      <div class="mind-marq" id="mmarq"></div><div class="mind-empty" id="mEmpty"><div>${ic('sparkle', 'lg')}</div><b>${t('mind_empty')}</b><span>${t('mind_empty_hint')}</span></div></div>
    <div class="mind-tools" id="mtools">${TOOLS.map(([k, key, p]) => `<button data-tool="${k}" title="${t('mtool_' + k)} (${key})"><svg viewBox="0 0 24 24" class="svg">${p}</svg><span>${t('mtool_' + k)}</span></button>`).join('')}</div>
    <div class="mind-ctx" id="mctx"></div><input type="file" id="mImg" accept="image/*" hidden></div>`;
}
afterRenderHook('mind', () => { if (route.arg && $('#mind')) mindInit(); else document.body.classList.remove('mind-mode'); });
function mindInit() {
  document.body.classList.add('mind-mode');
  if (M.bid !== route.arg) { M.bid = route.arg; M.sel.clear(); M.selEdge = null; M.undo = []; M.redo = []; M.tool = 'select';
    let v = null; try { v = JSON.parse(localStorage.getItem('mind.view.' + M.bid)); } catch (e) { } M.view = v || { x: 0, y: 0, k: 1, fit: true }; }
  const vp = $('#mvp');
  vp.addEventListener('pointerdown', onDown); vp.addEventListener('wheel', onWheel, { passive: false }); vp.addEventListener('dblclick', onDbl);
  $('#mtools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); });
  $('#mind').addEventListener('click', e => { const b = e.target.closest('[data-mact]'); if (b) MACT[b.dataset.mact]?.(b, e); });
  $('#mTitle').addEventListener('change', e => { const b = board(); b.title = e.target.value.trim() || b.title; persist(); });
  $('#mImg').addEventListener('change', e => { const f = e.target.files[0]; if (f) addImage(f); e.target.value = ''; });
  draw(); if (M.view.fit) requestAnimationFrame(fit);
}
const pkey = () => { try { localStorage.setItem('mind.view.' + M.bid, JSON.stringify({ x: M.view.x, y: M.view.y, k: M.view.k })); } catch (e) { } };
function persist() { const b = board(); if (!b) return; b.updatedAt = Date.now(); save(); const s = $('#mSaved'); if (s) { s.classList.add('pulse'); setTimeout(() => s.classList.remove('pulse'), 600); } }
function snap() { const b = board(); M.undo.push(JSON.stringify({ n: b.nodes, e: b.edges })); if (M.undo.length > 80) M.undo.shift(); M.redo = []; }
const MACT = {
  undo: () => { const b = board(); if (!M.undo.length) return; M.redo.push(JSON.stringify({ n: b.nodes, e: b.edges })); const s = JSON.parse(M.undo.pop()); b.nodes = s.n; b.edges = s.e; M.sel.clear(); persist(); draw(); },
  redo: () => { const b = board(); if (!M.redo.length) return; M.undo.push(JSON.stringify({ n: b.nodes, e: b.edges })); const s = JSON.parse(M.redo.pop()); b.nodes = s.n; b.edges = s.e; M.sel.clear(); persist(); draw(); },
  zin: () => zoomAt(1.2), zout: () => zoomAt(1 / 1.2), fit: () => fit(),
  help: () => { const o = openModal(`<div class="modal-h"><h2>⌨️ ${t('mind_help')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div><div class="mind-help">${t('mind_help_body')}</div>`); o.querySelector('[data-close]').onclick = closeModal; },
  color: b => { if (M.selEdge) { const e = board().edges.find(x => x.id === M.selEdge); snap(); e.color = b.dataset.c; } else { snap(); M.sel.forEach(id => { const n = mnode(id); if (n) n.color = b.dataset.c; }); } persist(); draw(); },
  fs: b => { snap(); M.sel.forEach(id => { const n = mnode(id); if (n) n.fs = +b.dataset.v; }); persist(); draw(); },
  bold: () => { snap(); M.sel.forEach(id => { const n = mnode(id); if (n) n.bold = n.bold ? 0 : 1; }); persist(); draw(); },
  shape: b => { snap(); M.sel.forEach(id => { const n = mnode(id); if (n && n.type === 'shape') n.shape = b.dataset.v; }); persist(); draw(); },
  dup: () => duplicate(), del: () => delSel(),
  front: () => { const b = board(); snap(); const s = b.nodes.filter(n => M.sel.has(n.id)); b.nodes = b.nodes.filter(n => !M.sel.has(n.id)).concat(s); persist(); draw(); },
  back: () => { const b = board(); snap(); const s = b.nodes.filter(n => M.sel.has(n.id)); b.nodes = s.concat(b.nodes.filter(n => !M.sel.has(n.id))); persist(); draw(); },
  dash: () => { const e = board().edges.find(x => x.id === M.selEdge); if (!e) return; snap(); e.dash = e.dash ? 0 : 1; persist(); draw(); },
  arrow: () => { const e = board().edges.find(x => x.id === M.selEdge); if (!e) return; snap(); e.arrow = ((e.arrow ?? 1) + 1) % 3; persist(); draw(); },
  label: () => editEdgeLabel(M.selEdge),
  linkItem: () => pickItem(null),
  openRef: () => { const n = mnode([...M.sel][0]); if (n && n.ref) openRef(n.ref); },
};
function setTool(k) {
  if (k === 'image') { $('#mImg').click(); return; }
  if (k === 'link') { pickItem(null); return; }
  M.tool = k; M.connFrom = null; $$('#mtools [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === k));
  $('#mvp').dataset.tool = k;
}
/* coordinates */
const vpRect = () => $('#mvp').getBoundingClientRect();
function toWorld(cx, cy) { const r = vpRect(); return { x: (cx - r.left - M.view.x) / M.view.k, y: (cy - r.top - M.view.y) / M.view.k }; }
function applyView() {
  const w = $('#mworld'); if (!w) return; const { x, y, k } = M.view;
  w.style.transform = `translate(${x}px,${y}px) scale(${k})`;
  const vp = $('#mvp'); vp.style.backgroundSize = `${24 * k}px ${24 * k}px`; vp.style.backgroundPosition = `${x}px ${y}px`;
  const z = $('#mZoom'); if (z) z.textContent = Math.round(k * 100) + '%';
  placeCtx();
}
function zoomAt(f, cx, cy) { const r = vpRect(); cx = cx ?? r.left + r.width / 2; cy = cy ?? r.top + r.height / 2;
  const k2 = clamp(M.view.k * f, .1, 4); const wx = (cx - r.left - M.view.x) / M.view.k, wy = (cy - r.top - M.view.y) / M.view.k;
  M.view.k = k2; M.view.x = cx - r.left - wx * k2; M.view.y = cy - r.top - wy * k2; delete M.view.fit; applyView(); pkey(); }
function fit() {
  const b = board(), r = vpRect(); if (!b) return;
  if (!b.nodes.length) { M.view = { x: r.width / 2, y: r.height / 2, k: 1 }; applyView(); pkey(); return; }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; b.nodes.forEach(n => { const h = nodeH(n); x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + n.w); y1 = Math.max(y1, n.y + h); });
  const k = clamp(Math.min((r.width - 120) / (x1 - x0), (r.height - 200) / (y1 - y0)), .15, 1.4);
  M.view = { k, x: r.width / 2 - (x0 + x1) / 2 * k, y: r.height / 2 - (y0 + y1) / 2 * k + 10 }; applyView(); pkey();
}
const nodeH = n => { const el = document.querySelector(`.mn[data-id="${n.id}"]`); return el ? el.offsetHeight : (n.h || 60); };

/* ---------- drawing ---------- */
function nodeHTML(n) {
  const sel = M.sel.has(n.id), one = sel && M.sel.size === 1;
  const st = `left:${n.x}px;top:${n.y}px;width:${n.w}px;${n.h && n.type !== 'text' && n.type !== 'link' ? `height:${n.h}px;` : ''}--c:${n.color || ''};font-size:${n.fs || DEF[n.type]?.[2] || 16}px;${n.bold ? 'font-weight:700;' : ''}`;
  let inner = '';
  if (n.type === 'frame') inner = `<div class="mn-ftitle mn-text" dir="auto">${esc(n.text || t('mtool_frame'))}</div>`;
  else if (n.type === 'image') inner = `<img src="${n.img}" draggable="false" alt="">`;
  else if (n.type === 'link') { const it = refItem(n.ref); inner = `<div class="mn-link"><span class="mn-licon">${ic(n.ref?.coll === 'tasks' ? 'tasks' : n.ref?.coll === 'projects' ? 'folder' : n.ref?.coll === 'boards' ? 'sparkle' : 'note')}</span><div><b dir="auto">${esc(it ? (it.title || it.name) : '—')}</b><small>${it ? refMeta(n.ref, it) : t('mind_missing')}</small></div></div>`; }
  else {
    const shapeBg = n.type === 'shape' && n.shape !== 'rect' && n.shape !== 'pill' ? `<svg class="mn-shape" viewBox="0 0 100 100" preserveAspectRatio="none">${n.shape === 'ellipse' ? '<ellipse cx="50" cy="50" rx="49" ry="49"/>' : '<path d="M50 1L99 50L50 99L1 50Z"/>'}</svg>` : '';
    inner = `${shapeBg}<div class="mn-text" dir="auto">${esc(n.text || '')}</div>`;
  }
  const handles = one && n.type !== 'link' ? `<i class="mn-rs"></i>` : '';
  const dots = sel && M.sel.size === 1 ? ['t', 'r', 'b', 'l'].map(s => `<i class="mn-dot d-${s}" data-side="${s}"></i>`).join('') : '';
  return `<div class="mn mn-${n.type} ${n.type === 'shape' ? 'sh-' + (n.shape || 'rect') : ''} ${sel ? 'sel' : ''} ${M.connFrom === n.id ? 'conn' : ''}" data-id="${n.id}" style="${st}">${inner}${handles}${dots}</div>`;
}
function draw() {
  const b = board(); if (!b || !$('#mnodes')) return;
  const ordered = [...b.nodes.filter(n => n.type === 'frame'), ...b.nodes.filter(n => n.type !== 'frame')];
  $('#mnodes').innerHTML = ordered.map(nodeHTML).join('');
  $('#mEmpty').style.display = b.nodes.length ? 'none' : '';
  drawEdges(); applyView(); setTool(M.tool === 'image' || M.tool === 'link' ? 'select' : M.tool);
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
    const a = anchor(A, center(B)), bb = anchor(B, center(A)); const d = edgePath(a, bb); const col = e.color || '#9fb5b0';
    const mx = (a.x + bb.x) / 2, my = (a.y + bb.y) / 2; const ar = e.arrow ?? 1;
    return `<g class="me ${M.selEdge === e.id ? 'sel' : ''}" data-eid="${e.id}"><path d="${d}" class="me-hit"/><path d="${d}" class="me-line" style="stroke:${col}" ${e.dash ? 'stroke-dasharray="8 7"' : ''} ${ar >= 1 ? 'marker-end="url(#marr)"' : ''} ${ar === 2 ? 'marker-start="url(#marr)"' : ''}/>
      ${e.label ? `<foreignObject x="${mx - 90}" y="${my - 16}" width="180" height="32"><div class="me-label" dir="auto">${esc(e.label)}</div></foreignObject>` : ''}</g>`;
  }).join('');
}
/* contextual toolbar */
function placeCtx() {
  const c = $('#mctx'); if (!c) return; const b = board();
  if (M.editing || (!M.sel.size && !M.selEdge) || M.drag) { c.classList.remove('show'); return; }
  let html = '';
  if (M.selEdge) html = `${MCOL.map(x => `<button class="sw" style="--c:${x}" data-mact="color" data-c="${x}"></button>`).join('')}<span class="mind-sep"></span><button data-mact="label">${ic('edit', 'sm')}${t('mind_label')}</button><button data-mact="dash">┄</button><button data-mact="arrow">→</button><button data-mact="del">${ic('trash', 'sm')}</button>`;
  else {
    const ns = [...M.sel].map(mnode).filter(Boolean); const one = ns.length === 1 ? ns[0] : null;
    html = `${ns.some(n => n.type !== 'image' && n.type !== 'link') ? MCOL.map(x => `<button class="sw" style="--c:${x}" data-mact="color" data-c="${x}"></button>`).join('') + '<span class="mind-sep"></span>' : ''}
      ${ns.some(n => ['sticky', 'text', 'shape', 'frame'].includes(n.type)) ? [14, 18, 24, 36].map((v, i) => `<button data-mact="fs" data-v="${v}" class="fsb">${['S', 'M', 'L', 'XL'][i]}</button>`).join('') + `<button data-mact="bold"><b>B</b></button><span class="mind-sep"></span>` : ''}
      ${ns.some(n => n.type === 'shape') ? ['rect', 'pill', 'ellipse', 'diamond'].map(v => `<button data-mact="shape" data-v="${v}">${{ rect: '▭', pill: '⬭', ellipse: '◯', diamond: '◇' }[v]}</button>`).join('') + '<span class="mind-sep"></span>' : ''}
      ${one && one.ref ? `<button data-mact="openRef">${ic('arrowUp', 'sm')}${t('mind_open')}</button>` : ''}
      <button data-mact="front" title="${t('mind_front')}">⤒</button><button data-mact="back" title="${t('mind_back')}">⤓</button><button data-mact="dup" title="Ctrl+D">⧉</button><button data-mact="del">${ic('trash', 'sm')}</button>`;
  }
  c.innerHTML = html; c.classList.add('show');
  // position above selection
  let x0 = 1e9, y0 = 1e9, x1 = -1e9;
  if (M.selEdge) { const e = b.edges.find(x => x.id === M.selEdge); const A = e && mnode(e.from), B = e && mnode(e.to); if (A && B) { const a = center(A), bb = center(B); x0 = Math.min(a.x, bb.x); x1 = Math.max(a.x, bb.x); y0 = Math.min(a.y, bb.y); } }
  let y1 = M.selEdge ? y0 : -1e9;
  if (!M.selEdge) M.sel.forEach(id => { const n = mnode(id); if (n) { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x + n.w); y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y + nodeH(n)); } });
  if (x0 > 1e8) { c.classList.remove('show'); return; }
  const r = vpRect(); const sx = (x0 + x1) / 2 * M.view.k + M.view.x, sy = y0 * M.view.k + M.view.y;
  if (window.innerWidth < 760) { c.style.left = ''; c.style.top = ''; c.classList.add('dock'); return; }
  c.classList.remove('dock'); c.style.left = clamp(sx - c.offsetWidth / 2, 8, r.width - c.offsetWidth - 8) + 'px';
  const ch = Math.max(c.offsetHeight, 44); let top = sy - ch - 46; if (top < 70) top = y1 * M.view.k + M.view.y + 46; c.style.top = clamp(top, 70, r.height - c.offsetHeight - 90) + 'px';
}

/* ---------- create / edit ---------- */
function addNode(type, x, y, extra = {}) {
  const b = board(); const [w, h, fs] = DEF[type === 'ellipse' || type === 'diamond' ? 'shape' : type];
  const n = Object.assign({ id: uid(), type: type === 'ellipse' || type === 'diamond' ? 'shape' : type, x: Math.round(x - w / 2), y: Math.round(y - (h || 40) / 2), w, h: h || undefined, text: '', fs,
    color: type === 'sticky' ? MCOL[Math.floor(Math.random() * 6)] : type === 'frame' ? '#a8d8ff' : type === 'text' ? '' : '#d4c2ff' }, extra);
  if (type === 'ellipse') n.shape = 'ellipse'; else if (type === 'diamond') n.shape = 'diamond'; else if (n.type === 'shape') n.shape = n.shape || 'rect';
  snap(); b.nodes.push(n); M.sel = new Set([n.id]); M.selEdge = null; persist(); draw(); return n;
}
function startEdit(id) {
  const el = document.querySelector(`.mn[data-id="${id}"] .mn-text`); if (!el) return;
  const n = mnode(id); M.editing = id; el.contentEditable = 'true'; el.closest('.mn').classList.add('editing'); el.focus();
  const rng = document.createRange(); rng.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(rng);
  placeCtx();
  const end = () => { el.removeEventListener('blur', end); el.contentEditable = 'false'; const v = el.innerText.replace(/\n$/, ''); M.editing = null;
    if (v !== (n.text || '')) { snap(); n.text = v; persist(); } if (n.type === 'text' && !v.trim()) { board().nodes = board().nodes.filter(x => x !== n); persist(); } draw(); };
  el.addEventListener('blur', end);
  el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); el.blur(); } if (e.key === 'Tab') { e.preventDefault(); el.blur(); addChild(id); } e.stopPropagation(); });
  el.addEventListener('input', () => drawEdges());
}
function addChild(pid, sibling) {
  const b = board(); let p = mnode(pid); if (!p) return;
  if (sibling) { const inc = b.edges.find(e => e.to === pid); if (inc) { const par = mnode(inc.from); const kids = b.edges.filter(e => e.from === par.id).map(e => mnode(e.to)).filter(Boolean);
    const lowest = kids.reduce((m, k) => Math.max(m, k.y + nodeH(k)), 0); const n = addNode(p.type === 'frame' ? 'sticky' : p.type, p.x + p.w / 2, lowest + 30 + (p.h || 60) / 2, { color: p.color, shape: p.shape, fs: p.fs, w: p.w, h: p.h });
    snap(); b.edges.push({ id: uid(), from: par.id, to: n.id }); persist(); draw(); setTimeout(() => startEdit(n.id), 20); return; } }
  const rtl = document.documentElement.dir === 'rtl'; const kids = b.edges.filter(e => e.from === pid).map(e => mnode(e.to)).filter(Boolean);
  const w = p.type === 'frame' ? 200 : Math.min(p.w, 220), h = p.type === 'frame' || p.type === 'text' ? 120 : (p.h || 100);
  const x = rtl ? p.x - 100 - w / 2 : p.x + p.w + 100 + w / 2; const y = kids.length ? kids.reduce((m, k) => Math.max(m, k.y + nodeH(k)), 0) + 30 + h / 2 : p.y + nodeH(p) / 2;
  const n = addNode(p.type === 'frame' || p.type === 'image' || p.type === 'link' ? 'sticky' : p.type, x, y, { w, h: p.type === 'text' ? undefined : h, color: p.type === 'frame' ? MCOL[kids.length % 6] : p.color, shape: p.shape, fs: p.type === 'text' ? 16 : p.fs });
  b.edges.push({ id: uid(), from: pid, to: n.id }); persist(); draw(); setTimeout(() => startEdit(n.id), 20);
}
function delSel() {
  const b = board(); snap();
  if (M.selEdge) { b.edges = b.edges.filter(e => e.id !== M.selEdge); M.selEdge = null; }
  else { b.nodes = b.nodes.filter(n => !M.sel.has(n.id)); b.edges = b.edges.filter(e => !M.sel.has(e.from) && !M.sel.has(e.to)); M.sel.clear(); }
  persist(); draw();
}
function duplicate(src) {
  const b = board(); const ns = src || [...M.sel].map(mnode).filter(Boolean); if (!ns.length) return; snap();
  const map = {}; const copies = ns.map(n => { const c = JSON.parse(JSON.stringify(n)); c.id = uid(); map[n.id] = c.id; c.x += 30; c.y += 30; return c; });
  const es = b.edges.filter(e => map[e.from] && map[e.to]).map(e => ({ ...e, id: uid(), from: map[e.from], to: map[e.to] }));
  (src ? M.clip.edges : []).forEach(e => { if (map[e.from] && map[e.to]) es.push({ ...e, id: uid(), from: map[e.from], to: map[e.to] }); });
  b.nodes.push(...copies); b.edges.push(...es); M.sel = new Set(copies.map(c => c.id)); persist(); draw();
}
function editEdgeLabel(eid) {
  const e = board().edges.find(x => x.id === eid); if (!e) return;
  const o = openModal(`<div class="modal-h"><h2>${t('mind_label')}</h2><button class="icon-btn" data-close>${ic('x')}</button></div><input class="input" id="elIn" value="${esc(e.label || '')}"><div class="modal-f" style="margin-top:14px"><span class="sp"></span><button class="btn primary" id="elOk">${t('save')}</button></div>`);
  o.querySelector('[data-close]').onclick = closeModal; const ok = () => { snap(); e.label = $('#elIn').value.trim(); closeModal(); persist(); draw(); };
  o.querySelector('#elOk').onclick = ok; $('#elIn').addEventListener('keydown', ev => { if (ev.key === 'Enter') ok(); });
}
function addImage(file, at) {
  const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => {
    const mx = 1200, sc = Math.min(1, mx / Math.max(im.width, im.height)); const cv = document.createElement('canvas'); cv.width = im.width * sc; cv.height = im.height * sc;
    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); const url = cv.toDataURL('image/jpeg', .82);
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

/* ---------- pointer interactions ---------- */
function onDown(e) {
  if (M.editing && e.target.closest('.mn-text[contenteditable=true]')) return;
  const vp = $('#mvp'); M.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (M.ptrs.size === 2) { const [a, b] = [...M.ptrs.values()]; M.drag = { kind: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; return; }
  if (M.editing) document.activeElement?.blur();
  const w = toWorld(e.clientX, e.clientY); const nodeEl = e.target.closest('.mn'); const edgeEl = e.target.closest('.me');
  vp.setPointerCapture(e.pointerId);
  if (e.button === 1 || M.space || M.tool === 'hand' || (e.pointerType === 'touch' && !nodeEl && !edgeEl && M.tool === 'select')) { M.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: M.view.x, vy: M.view.y }; vp.classList.add('panning'); return; }
  if (e.target.classList.contains('mn-rs')) { const n = mnode(nodeEl.dataset.id); snap(); M.drag = { kind: 'resize', n, sx: w.x, sy: w.y, w: n.w, h: n.h || nodeEl.offsetHeight }; return; }
  if (e.target.classList.contains('mn-dot')) { M.drag = { kind: 'link', from: nodeEl.dataset.id }; return; }
  if (edgeEl && !nodeEl) { M.selEdge = edgeEl.dataset.eid; M.sel.clear(); draw(); return; }
  if (nodeEl) {
    const id = nodeEl.dataset.id;
    if (M.tool === 'connector') { if (!M.connFrom) { M.connFrom = id; draw(); } else if (M.connFrom !== id) { snap(); board().edges.push({ id: uid(), from: M.connFrom, to: id }); M.connFrom = null; persist(); draw(); } return; }
    if (e.shiftKey) { M.sel.has(id) ? M.sel.delete(id) : M.sel.add(id); } else if (!M.sel.has(id)) M.sel = new Set([id]);
    M.selEdge = null;
    // dragging a frame also moves nodes inside it
    const moving = new Set(M.sel); [...M.sel].map(mnode).filter(n => n && n.type === 'frame').forEach(f => board().nodes.forEach(n => { if (n.type !== 'frame' && n.x >= f.x && n.y >= f.y && n.x + n.w <= f.x + f.w && n.y + nodeH(n) <= f.y + f.h) moving.add(n.id); }));
    M.drag = { kind: 'move', sx: w.x, sy: w.y, start: [...moving].map(id => { const n = mnode(id); return [n, n.x, n.y]; }), snapped: false };
    draw(); return;
  }
  // empty canvas
  M.selEdge = null;
  if (['sticky', 'text', 'shape', 'ellipse', 'diamond', 'frame'].includes(M.tool)) { const tool = M.tool; const n = addNode(tool, w.x, w.y); setTool('select'); if (tool !== 'frame') setTimeout(() => startEdit(n.id), 20); else setTimeout(() => startEdit(n.id), 20); return; }
  if (M.tool === 'connector') { M.connFrom = null; draw(); return; }
  if (!e.shiftKey) M.sel.clear();
  M.drag = { kind: 'marq', sx: w.x, sy: w.y, cx: e.clientX, cy: e.clientY }; draw();
}
window.addEventListener('pointermove', e => {
  if (!M.drag || !$('#mind')) return;
  if (M.ptrs.has(e.pointerId)) M.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const d = M.drag;
  if (d.kind === 'pinch' && M.ptrs.size >= 2) { const [a, b] = [...M.ptrs.values()]; const nd = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    M.view.x += mx - d.mx; M.view.y += my - d.my; zoomAt(nd / d.d, mx, my); d.d = nd; d.mx = mx; d.my = my; return; }
  if (d.kind === 'pan') { M.view.x = d.vx + e.clientX - d.sx; M.view.y = d.vy + e.clientY - d.sy; delete M.view.fit; applyView(); return; }
  const w = toWorld(e.clientX, e.clientY);
  if (d.kind === 'move') { if (!d.snapped) { if (Math.hypot(w.x - d.sx, w.y - d.sy) * M.view.k < 3) return; snap(); d.snapped = true; $('#mctx').classList.remove('show'); }
    d.start.forEach(([n, x, y]) => { n.x = Math.round(x + w.x - d.sx); n.y = Math.round(y + w.y - d.sy); const el = document.querySelector(`.mn[data-id="${n.id}"]`); if (el) { el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; } }); drawEdges(); return; }
  if (d.kind === 'resize') { const n = d.n; n.w = Math.max(60, Math.round(d.w + w.x - d.sx)); if (n.type !== 'text') n.h = Math.max(40, Math.round(d.h + w.y - d.sy));
    if (e.shiftKey && n.type === 'image') n.h = Math.round(n.w * d.h / d.w);
    const el = document.querySelector(`.mn[data-id="${n.id}"]`); if (el) { el.style.width = n.w + 'px'; if (n.h && n.type !== 'text') el.style.height = n.h + 'px'; } drawEdges(); return; }
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
    else if (!el) { const A = mnode(d.from); const n = addNode(A.type === 'frame' || A.type === 'image' || A.type === 'link' ? 'sticky' : A.type, w.x, w.y, { color: A.color, shape: A.shape, w: A.type === 'text' ? 220 : Math.min(A.w, 240), h: A.type === 'text' ? undefined : Math.min(A.h || 120, 200) }); board().edges.push({ id: uid(), from: d.from, to: n.id }); persist(); draw(); setTimeout(() => startEdit(n.id), 20); }
    return; }
  if (d.kind === 'marq') { $('#mmarq').style.display = 'none'; const w = toWorld(e.clientX, e.clientY); const x0 = Math.min(d.sx, w.x), x1 = Math.max(d.sx, w.x), y0 = Math.min(d.sy, w.y), y1 = Math.max(d.sy, w.y);
    if (x1 - x0 > 2 || y1 - y0 > 2) board().nodes.forEach(n => { if (n.x < x1 && n.x + n.w > x0 && n.y < y1 && n.y + nodeH(n) > y0) M.sel.add(n.id); }); draw(); }
});
function onWheel(e) {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * .01), e.clientX, e.clientY);
  else { M.view.x -= e.deltaX; M.view.y -= e.deltaY; delete M.view.fit; applyView(); clearTimeout(M.wt); M.wt = setTimeout(pkey, 300); }
}
function onDbl(e) {
  const nodeEl = e.target.closest('.mn'); const edgeEl = e.target.closest('.me');
  if (nodeEl) { const n = mnode(nodeEl.dataset.id); if (n.type === 'link') openRef(n.ref); else if (n.type !== 'image') startEdit(n.id); return; }
  if (edgeEl) { editEdgeLabel(edgeEl.dataset.eid); return; }
  const w = toWorld(e.clientX, e.clientY); const n = addNode('sticky', w.x, w.y); setTimeout(() => startEdit(n.id), 20);
}
document.addEventListener('keydown', e => {
  if (!$('#mind') || M.editing || $('#overlay') || $('#palette') || e.target.closest('input,textarea,[contenteditable=true]')) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (e.code === 'Space') { M.space = true; $('#mvp').classList.add('space'); e.preventDefault(); return; }
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? MACT.redo() : MACT.undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); MACT.redo(); return; }
  if (mod && k === 'd') { e.preventDefault(); duplicate(); return; }
  if (mod && k === 'a') { e.preventDefault(); M.sel = new Set(board().nodes.map(n => n.id)); draw(); return; }
  if (mod && k === 'c') { const ns = [...M.sel].map(mnode).filter(Boolean); if (ns.length) M.clip = { nodes: JSON.parse(JSON.stringify(ns)), edges: board().edges.filter(x => M.sel.has(x.from) && M.sel.has(x.to)) }; return; }
  if (mod && k === 'v' && M.clip) { e.preventDefault(); const tmp = M.clip.nodes.map(n => ({ ...n })); duplicate(tmp); return; }
  if (mod) return;
  if (k === 'delete' || k === 'backspace') { e.preventDefault(); delSel(); return; }
  if (k === 'escape') { M.sel.clear(); M.selEdge = null; M.connFrom = null; setTool('select'); draw(); return; }
  if (k === 'tab' && M.sel.size === 1) { e.preventDefault(); addChild([...M.sel][0]); return; }
  if (k === 'enter' && M.sel.size === 1) { e.preventDefault(); const id = [...M.sel][0]; if (e.shiftKey) addChild(id, true); else startEdit(id); return; }
  if (k.startsWith('arrow') && M.sel.size) { e.preventDefault(); const st = e.shiftKey ? 10 : 2; snap(); M.sel.forEach(id => { const n = mnode(id); if (k === 'arrowleft') n.x -= st; if (k === 'arrowright') n.x += st; if (k === 'arrowup') n.y -= st; if (k === 'arrowdown') n.y += st; }); persist(); draw(); return; }
  if (k === '+' || k === '=') { zoomAt(1.2); return; } if (k === '-') { zoomAt(1 / 1.2); return; } if (k === '0' || (e.shiftKey && k === '!')) { fit(); return; }
  const tk = TOOLS.find(([, key]) => key.toLowerCase() === k); if (tk) setTool(tk[0]);
});
document.addEventListener('keyup', e => { if (e.code === 'Space' && $('#mind')) { M.space = false; $('#mvp')?.classList.remove('space'); } });
document.addEventListener('paste', e => {
  if (!$('#mind') || M.editing || $('#overlay') || e.target.closest('input,textarea,[contenteditable=true]')) return;
  const items = [...(e.clipboardData?.items || [])]; const img = items.find(i => i.type.startsWith('image/'));
  if (img) { e.preventDefault(); addImage(img.getAsFile()); return; }
  const txt = e.clipboardData?.getData('text/plain'); if (txt && txt.trim()) { e.preventDefault(); const r = vpRect(); const p = toWorld(r.left + r.width / 2, r.top + r.height / 2); addNode('sticky', p.x, p.y, { text: txt.trim().slice(0, 2000) }); }
});
window.addEventListener('resize', () => { if ($('#mind')) placeCtx(); });
