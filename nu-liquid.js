/* NU LIQUID — 녹아 붙는 액체 (뉴 플로우 액체와 같은 방식: 농도 장 → 등고선 → 바탕·어두운 면·하이라이트·안쪽 얼룩·테두리 층)
   원들을 하나의 농도 장으로 더하고, 문턱 등고선을 따서 한 덩어리 실루엣으로 그린다. 가까운 원은 녹아 붙고, 멀어지면 목이 가늘어지다 끊어진다.
   그늘·하이라이트도 같은 원들을 빛 쪽으로 옮기고 줄인 장의 등고선이라, 덩어리 모양을 따라 흐른다.
   NUL.render(ctx, W, H, grp)
     grp = { circles:[{x,y,r, gloss?}], spots:[{x,y,r}], col:{base, core, hi, line, spot}, light(도), lineW(px), shade(0~1), gloss(bool), cell(px) } — 좌표·반지름은 px */
(function (root) {
  'use strict';
  const TH = 0.5625;   // 원 하나일 때 등고선이 반지름 r 에 오도록: (1-(r/2r)^2)^2
  function fieldOf(circles, gw, gh, cell, ox, oy, tf) {
    const F = new Float32Array(gw * gh);
    for (const c0 of circles) { const c = tf ? tf(c0) : c0; if (!c || c.r <= 0.3) continue; const R = c.r * 2, R2 = R * R, w = c.w == null ? 1 : c.w;
      const x0 = Math.max(0, Math.floor((c.x - R - ox) / cell)), x1 = Math.min(gw - 1, Math.ceil((c.x + R - ox) / cell)), y0 = Math.max(0, Math.floor((c.y - R - oy) / cell)), y1 = Math.min(gh - 1, Math.ceil((c.y + R - oy) / cell));
      for (let j = y0; j <= y1; j++) { const dy = oy + j * cell - c.y, dy2 = dy * dy; if (dy2 >= R2) continue; let k = j * gw + x0;
        for (let i = x0; i <= x1; i++, k++) { const dx = ox + i * cell - c.x, q = (dx * dx + dy2) / R2; if (q < 1) { const u = 1 - q; F[k] += u * u * w; } } } }
    return F; }
  // 마칭 스퀘어 → 닫힌 고리들 (px 좌표). 칸마다 선분을 만들고, 교차점마다 이웃 두 개를 이어 고리를 딴다 (방향 표 없이)
  function contours(F0, gw, gh, cell, ox, oy, th) {
    const F = Float32Array.from(F0); for (let i = 0; i < gw; i++) { F[i] = 0; F[(gh - 1) * gw + i] = 0; } for (let j = 0; j < gh; j++) { F[j * gw] = 0; F[j * gw + gw - 1] = 0; }   // 가장자리는 바깥 → 고리가 항상 닫힌다
    const P = [], vid = new Map(), adj = [];
    function vert(i, j, horiz) { const id = horiz ? (j * gw + i) * 2 : (j * gw + i) * 2 + 1; let v = vid.get(id); if (v !== undefined) return v;
      const f0 = F[j * gw + i], f1 = horiz ? F[j * gw + i + 1] : F[(j + 1) * gw + i], t = (th - f0) / (f1 - f0 || 1e-9);
      v = P.length; P.push([ox + (i + (horiz ? t : 0)) * cell, oy + (j + (horiz ? 0 : t)) * cell]); adj.push([]); vid.set(id, v); return v; }
    const seg = (p, q) => { adj[p].push(q); adj[q].push(p); };
    for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++) {
      const fa = F[j * gw + i], fb = F[j * gw + i + 1], fc = F[(j + 1) * gw + i + 1], fd = F[(j + 1) * gw + i];
      const idx = (fa > th ? 1 : 0) | (fb > th ? 2 : 0) | (fc > th ? 4 : 0) | (fd > th ? 8 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = () => vert(i, j, true), Rr = () => vert(i + 1, j, false), B = () => vert(i, j + 1, true), L = () => vert(i, j, false);
      switch (idx) {
        case 1: case 14: seg(L(), T()); break;
        case 2: case 13: seg(T(), Rr()); break;
        case 3: case 12: seg(L(), Rr()); break;
        case 4: case 11: seg(Rr(), B()); break;
        case 6: case 9: seg(T(), B()); break;
        case 7: case 8: seg(L(), B()); break;
        case 5: case 10: { const mid = (fa + fb + fc + fd) / 4 > th; const inA = idx === 5;   // 안장점: 가운데가 안쪽이면 대각선 두 꼭짓점이 이어진다
          if (mid === inA) { seg(L(), B()); seg(T(), Rr()); } else { seg(L(), T()); seg(Rr(), B()); } break; } } }
    const loops = [], seen = new Uint8Array(P.length);
    for (let s = 0; s < P.length; s++) { if (seen[s] || adj[s].length < 2) continue; const loop = []; let prev = -1, cur = s, n = 0;
      while (n < 200000) { seen[cur] = 1; loop.push(P[cur]); const a = adj[cur]; let nx = a[0] === prev ? a[1] : a[0]; if (nx === undefined || nx === prev && a.length < 2) break; prev = cur; cur = nx; n++; if (cur === s || seen[cur]) break; }
      if (loop.length >= 3) loops.push(loop); }
    return loops; }
  // 중점을 지나는 2차 곡선으로 매끈하게 (뉴 플로우 loopPath 와 같음)
  function pathLoops(ctx, loops) { for (const L of loops) { const n = L.length; ctx.moveTo((L[n - 1][0] + L[0][0]) / 2, (L[n - 1][1] + L[0][1]) / 2);
      for (let i = 0; i < n; i++) { const p = L[i], q = L[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } ctx.closePath(); } }
  function grid(circles, W, H, cell) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const c of circles) { const R = c.r * 2 + cell * 2; x0 = Math.min(x0, c.x - R); y0 = Math.min(y0, c.y - R); x1 = Math.max(x1, c.x + R); y1 = Math.max(y1, c.y + R); }
    x0 = Math.max(-cell * 4, x0); y0 = Math.max(-cell * 4, y0); x1 = Math.min(W + cell * 4, x1); y1 = Math.min(H + cell * 4, y1); if (x1 <= x0 || y1 <= y0) return null;
    const ox = Math.floor(x0 / cell) * cell, oy = Math.floor(y0 / cell) * cell; return { ox, oy, gw: Math.ceil((x1 - ox) / cell) + 2, gh: Math.ceil((y1 - oy) / cell) + 2 }; }
  function render(ctx, W, H, g) {
    const cs = g.circles.filter(c => c.r > 0.4); if (!cs.length) return 0; const cell = g.cell || Math.max(2, Math.round(Math.min(W, H) / 220)); const G = grid(cs, W, H, cell); if (!G) return 0;
    const { ox, oy, gw, gh } = G, la = (g.light == null ? -135 : g.light) * Math.PI / 180, lx = Math.cos(la), ly = Math.sin(la), col = g.col;
    const body = contours(fieldOf(cs, gw, gh, cell, ox, oy), gw, gh, cell, ox, oy, TH); if (!body.length) return 0;
    const bp = () => { ctx.beginPath(); pathLoops(ctx, body); };
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (g.lineW > 0 && col.line) { bp(); ctx.strokeStyle = col.line; ctx.lineWidth = g.lineW * 2; ctx.stroke(); }   // 바깥 테두리 (안쪽은 바탕이 덮는다)
    bp(); ctx.fillStyle = col.base; ctx.fill('evenodd');
    ctx.save(); bp(); ctx.clip('evenodd');
    if (g.shade > 0 && col.core) { // 어두운 면: 덩어리 전체를 그늘색으로 → 빛 쪽으로 옮기고 줄인 덩어리를 바탕색으로 덮으면 빛 반대쪽 가장자리를 따라 그늘 띠가 남는다
      const k = 0.1 + 0.12 * g.shade, sh = contours(fieldOf(cs, gw, gh, cell, ox, oy, c => ({ x: c.x + lx * c.r * k * 1.4, y: c.y + ly * c.r * k * 1.4, r: c.r * (1 - k * 0.6), w: c.w })), gw, gh, cell, ox, oy, TH);
      bp(); ctx.fillStyle = col.core; ctx.fill('evenodd'); ctx.beginPath(); pathLoops(ctx, sh); ctx.fillStyle = col.base; ctx.fill('evenodd'); }
    if (g.spots && g.spots.length && col.spot) { const sp = contours(fieldOf(g.spots, gw, gh, cell, ox, oy), gw, gh, cell, ox, oy, TH); ctx.beginPath(); pathLoops(ctx, sp); ctx.fillStyle = col.spot; ctx.fill('evenodd'); }
    if (g.gloss && col.hi) { // 하이라이트: 큰 원만, 빛 쪽으로 옮긴 작은 덩이 + 작은 점
      const big = cs.filter(c => c.gloss !== false && c.r > cell * 1.6);
      if (big.length) { const hl = contours(fieldOf(big, gw, gh, cell, ox, oy, c => ({ x: c.x + lx * c.r * 0.42, y: c.y + ly * c.r * 0.42, r: c.r * 0.3 })), gw, gh, cell, ox, oy, TH);
        ctx.beginPath(); pathLoops(ctx, hl); ctx.fillStyle = col.hi; ctx.fill('evenodd');
        ctx.beginPath(); for (const c of big) { if (c.r < cell * 3) continue; const x = c.x + lx * c.r * 0.62 - ly * c.r * 0.2, y = c.y + ly * c.r * 0.62 + lx * c.r * 0.2, r = c.r * 0.07; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); } ctx.fill(); } }
    ctx.restore();
    if (g.lineW > 0 && col.line && g.innerLine) { bp(); ctx.strokeStyle = col.line; ctx.lineWidth = g.lineW; ctx.stroke(); }
    ctx.restore(); return body.length; }
  root.NUL = { render, fieldOf, contours, pathLoops, TH };
})(typeof window !== 'undefined' ? window : globalThis);
