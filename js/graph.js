/* Second Brain — life constellation (canvas) */
'use strict';
function drawGraph(cv, o = {}) {
  if (!cv) return;
  const ctx = cv.getContext('2d'); let W = 0, H = 0, dpr = 1;
  const cs = getComputedStyle(document.documentElement); const col = k => cs.getPropertyValue(k).trim() || '#5eead4';
  const light = S.settings.theme === 'light';
  const font = getComputedStyle(document.body).fontFamily;
  const mini = !!o.mini;
  let zoom = 1, panX = 0, panY = 0, hover = null, drag = null, moved = false;
  const nodes = [], links = [];
  const me = { id: 'me', type: 'me', label: t('me'), r: mini ? 15 : 24, c: col('--gold'), ang: 0, dist: 0, seed: 0 }; nodes.push(me);
  const as = sortedAreas();
  as.forEach((a, i) => {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / as.length * (L === 'fa' ? -1 : 1);
    const n = { id: a.id, type: 'area', ref: a, label: a.icon + ' ' + areaName(a), ang, dist: .52, r: mini ? 8 : 12, c: a.color, seed: i * 1.7 };
    nodes.push(n); links.push({ a: me, b: n, c: a.color, main: true });
    const kids = [...S.projects.filter(p => p.areaId === a.id && p.status !== 'archived').map(p => ({ type: 'project', ref: p, label: p.title, c: col('--violet') })),
      ...S.goals.filter(g => g.areaId === a.id).map(g => ({ type: 'goal', ref: g, label: g.title, c: col('--accent') }))];
    kids.forEach((k, j) => {
      const spread = Math.min(.9, .28 * (kids.length - 1));
      const ka = ang + (kids.length > 1 ? (j / (kids.length - 1) - .5) * spread : 0);
      const kn = Object.assign({ id: k.ref.id, ang: ka, dist: .8 + (j % 2) * .06, r: mini ? 4.5 : 7.5, seed: i + j * 3.1 }, k);
      nodes.push(kn); links.push({ a: n, b: kn, c: k.c });
      if (k.type === 'project') {
        const arr = S.tasks.filter(x => x.projectId === k.ref.id && x.status !== 'done').slice(0, 10);
        arr.forEach((tk, m) => { const tn = { id: tk.id, type: 'task', ref: tk, label: tk.title, ang: ka + (m - (arr.length - 1) / 2) * .055, dist: .97 + (m % 2) * .05, r: mini ? 1.8 : 3.2, c: col('--green'), seed: m * 2.3 + j };
          nodes.push(tn); links.push({ a: kn, b: tn, c: null }); });
      }
    });
    const loose = S.tasks.filter(x => x.areaId === a.id && !x.projectId && x.status !== 'done').slice(0, 12);
    loose.forEach((tk, m) => { const tn = { id: tk.id, type: 'task', ref: tk, label: tk.title, orbit: n, th: m * 2 * Math.PI / Math.max(loose.length, 1) + i, rr: mini ? 16 : 30, r: mini ? 1.6 : 2.8, c: col('--green'), seed: m * 1.3 };
      nodes.push(tn); links.push({ a: n, b: tn, c: null }); });
  });
  const stars = Array.from({ length: mini ? 50 : 140 }, (_, i) => ({ x: (Math.sin(i * 12.9898) * 43758.5453) % 1, y: (Math.sin(i * 78.233) * 12543.123) % 1, r: (i % 5) * .25 + .3 }));
  function size() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; }
  size();
  const ro = new ResizeObserver(size); ro.observe(cv);
  function pos(n, time) {
    const Rx = (mini ? W * .4 : Math.min(W * .44, H * .7)) * zoom, Ry = (mini ? H * .36 : H * .42) * zoom; const cx = W / 2 + panX, cy = H / 2 + panY + (mini ? 14 : 0);
    const fl = n.type === 'me' ? 0 : Math.sin(time * .0006 + n.seed) * (n.type === 'task' ? 2.5 : 3.5);
    if (n.orbit) { const p = n.orbit._p || pos(n.orbit, time); const th = n.th + time * .00012; return { x: p.x + Math.cos(th) * n.rr * zoom, y: p.y + Math.sin(th) * n.rr * zoom }; }
    return { x: cx + Math.cos(n.ang) * n.dist * Rx + fl, y: cy + Math.sin(n.ang) * n.dist * Ry + Math.cos(time * .0005 + n.seed) * 2.5 };
  }
  function sphere(x, y, r, c, glow) {
    ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = glow;
    const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.35, c); g.addColorStop(1, shade(c));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function shade(c) { if (c[0] !== '#' || c.length < 7) return c; const n = parseInt(c.slice(1, 7), 16); const f = v => Math.round(v * .35); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; }
  function alpha(c, a) { if (c[0] !== '#' || c.length < 7) return c; const n = parseInt(c.slice(1, 7), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function frame(time) {
    if (!cv.isConnected) { ro.disconnect(); return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    stars.forEach(s => { ctx.fillStyle = light ? 'rgba(10,60,50,.15)' : `rgba(200,255,240,${.15 + .15 * Math.sin(time * .001 + s.x * 20)})`; ctx.beginPath(); ctx.arc(Math.abs(s.x) * W, Math.abs(s.y) * H, s.r, 0, 7); ctx.fill(); });
    nodes.forEach(n => n._p = null); nodes.forEach(n => n._p = pos(n, time));
    // links
    links.forEach((l, i) => {
      const A = l.a._p, B = l.b._p; const hl = hover && (hover === l.a || hover === l.b);
      if (l.main) {
        const g = ctx.createLinearGradient(A.x, A.y, B.x, B.y); g.addColorStop(0, alpha(col('--gold'), .75)); g.addColorStop(1, alpha(l.c, .55));
        ctx.save(); ctx.strokeStyle = g; ctx.lineWidth = hl ? 3 : (mini ? 1.3 : 2); ctx.shadowColor = l.c; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.restore();
        const p = (time * .00018 + i * .17) % 1; const px = A.x + (B.x - A.x) * p, py = A.y + (B.y - A.y) * p;
        ctx.save(); ctx.fillStyle = '#fff'; ctx.shadowColor = l.c; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(px, py, mini ? 1.4 : 2, 0, 7); ctx.fill(); ctx.restore();
      } else {
        ctx.save(); ctx.strokeStyle = l.c ? alpha(l.c, hl ? .8 : .38) : (light ? 'rgba(10,60,50,.18)' : 'rgba(180,255,230,.16)'); ctx.lineWidth = hl ? 1.6 : 1;
        if (!l.c) ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.restore();
      }
    });
    // me rings
    const M = me._p;
    ctx.save(); ctx.translate(M.x, M.y);
    for (let k = 0; k < (mini ? 24 : 48); k++) { const a = k / (mini ? 24 : 48) * Math.PI * 2 + time * .0003; const rr = me.r * (1.45 + .25 * Math.sin(time * .002 + k)); ctx.fillStyle = alpha(col('--gold'), .5); ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 1.1, 0, 7); ctx.fill(); }
    ctx.strokeStyle = alpha(col('--accent'), .35); ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(0, 0, me.r * 2.1, time * .0002, time * .0002 + Math.PI * 1.6); ctx.stroke(); ctx.restore();
    // nodes
    ctx.direction = document.documentElement.dir; ctx.textBaseline = 'middle';
    nodes.forEach(n => {
      const p = n._p; const r = n.r * (hover === n ? 1.35 : 1) * (n.type === 'task' ? 1 : Math.sqrt(zoom));
      sphere(p.x, p.y, r, n.c, n.type === 'task' ? 6 : r * 2.2);
      if (n.type === 'area' && !mini) { ctx.strokeStyle = alpha(n.c, .35); ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, 7); ctx.stroke(); }
      const show = n.type === 'me' || n.type === 'area' || (!mini && (n.type === 'project' || n.type === 'goal')) || hover === n;
      if (show) {
        ctx.font = `${n.type === 'me' || n.type === 'area' ? 600 : 500} ${mini ? 11 : (n.type === 'area' ? 13.5 : 12)}px ${font}`;
        const label = n.type === 'me' ? t('me') + (S.settings.name ? ' · ' + S.settings.name : '') : (n.label.length > 26 ? n.label.slice(0, 25) + '…' : n.label);
        ctx.textAlign = 'center'; ctx.fillStyle = light ? '#0d2420' : 'rgba(231,243,240,.92)';
        ctx.save(); ctx.shadowColor = light ? 'transparent' : 'rgba(0,0,0,.8)'; ctx.shadowBlur = 6;
        ctx.fillText(label, p.x, p.y + r + (mini ? 10 : 14)); ctx.restore();
        if (n.type === 'area' && !mini) { const cnt = S.tasks.filter(x => x.areaId === n.id && x.status !== 'done').length; ctx.font = `500 11px ${font}`; ctx.fillStyle = alpha(n.c, .9); ctx.fillText((n.ref.score || 0) + '/10 · ' + cnt + ' ' + t('tasks_count'), p.x, p.y + r + 31); }
      }
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  const pick = (e) => { const r = cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; let best = null, bd = 1e9;
    nodes.forEach(n => { if (!n._p) return; const d = Math.hypot(n._p.x - x, n._p.y - y); if (d < Math.max(n.r + 8, 10) && d < bd) { bd = d; best = n; } }); return { n: best, x, y }; };
  cv.addEventListener('mousemove', e => {
    if (drag) { panX += e.clientX - drag.x; panY += e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY }; moved = true; return; }
    const { n, x, y } = pick(e); hover = n; cv.style.cursor = n ? 'pointer' : (mini ? 'pointer' : 'grab');
    if (o.tip) { if (n && n.type !== 'me') { const typ = { area: t('f_area'), project: t('f_project'), goal: t('nav_goals'), task: t('type_task') }[n.type];
      o.tip.innerHTML = `<div class="small muted">${typ}</div><b>${esc(n.label)}</b>`; o.tip.style.display = 'block'; o.tip.style.left = Math.min(x + 14, W - 250) + 'px'; o.tip.style.top = (y + 14) + 'px'; } else o.tip.style.display = 'none'; }
  });
  cv.addEventListener('mouseleave', () => { hover = null; drag = null; if (o.tip) o.tip.style.display = 'none'; });
  if (!mini) {
    cv.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY }; moved = false; cv.style.cursor = 'grabbing'; });
    window.addEventListener('mouseup', () => { drag = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); zoom = clamp(zoom * (e.deltaY < 0 ? 1.1 : .9), .5, 2.5); }, { passive: false });
  }
  cv.addEventListener('click', e => {
    if (moved) { moved = false; return; }
    const { n } = pick(e);
    if (!n) { if (mini) go('graph'); return; }
    if (n.type === 'area') go('areas', n.id); else if (n.type === 'project') go('projects', n.id);
    else if (n.type === 'goal') openForm('goals', n.ref); else if (n.type === 'task') openForm('tasks', n.ref); else go('areas');
  });
}
