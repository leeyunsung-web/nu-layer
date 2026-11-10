/* NU LEARNED — 윤성 그림에서 하나씩 재서 만든 모양들. NUO 에 새 이름으로 붙는다 (뉴 플로우 원래 모양은 그대로).
   ① ysStar5 오각별 — 그림 속 오각별 40개 측정 (data/stars.json, star_mine.py)
      안쪽 반지름/바깥 = 0.55 (0.48~0.57), 끝 길이 흔들림 2% (1~6%), 끝 사이 각 흔들림 4% (2~11%), 변은 거의 곧음(+1%), 끝은 살짝 둥글게
      칠: 테두리 없는 단색 45% · 콩 모양 하이라이트 30% (면적 4~5%) · 진한 테두리 25% (노랑이면 주황 선, 밝은 바탕에선 검은 선)
   o = { x, y, r, rot, seed, col:{f,l,h}, style:'flat'|'hi'|'line'(없으면 seed 로 뽑음), light(도), lineW } */
(function (root) {
  'use strict';
  const NUO = root.NUO, TAU = Math.PI * 2;
  function rng(seed) { let a = (seed * 2654435761) >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const gauss = R => { const u = 1 - R(), v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const STAR5 = { inner: [0.548, 0.03, 0.48, 0.6], tip: 0.03, gap: 0.04, bend: [0.009, 0.01], styles: [['flat', 0.45], ['hi', 0.30], ['line', 0.25]] };
  function pickW(R, list) { let t = R() * list.reduce((a, b) => a + b[1], 0); for (const [k, w] of list) { t -= w; if (t <= 0) return k; } return list[0][0]; }
  /** 모서리를 둥글린 다각형 경로 (각 꼭짓점마다 둥근 정도 rr[i]) */
  function roundPoly(ctx, P, rr) { const n = P.length, cut = (p, q, d) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, t = Math.min(0.45, d / L); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
    for (let i = 0; i < n; i++) { const p = P[(i + n - 1) % n], c = P[i], q = P[(i + 1) % n], a = cut(c, p, rr[i]), b = cut(c, q, rr[i]); if (i === 0) ctx.moveTo(a[0], a[1]); else ctx.lineTo(a[0], a[1]); ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]); } ctx.closePath(); }
  /** 렌즈(양끝 뾰족, 살짝 휜) 하이라이트 */
  function lens(ctx, x, y, len, wid, ang, bend) { const c = Math.cos(ang), s = Math.sin(ang), P = (u, v) => [x + u * c - v * s, y + u * s + v * c], n = 20;   // 콩 모양: 가운데가 bend 만큼 휜 타원
    for (let i = 0; i <= n; i++) { const t = i / n * TAU, u = Math.cos(t) * len / 2, v = Math.sin(t) * wid / 2 + bend * (1 - (2 * u / len) ** 2), p = P(u, v); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.closePath(); }
  function starShape(o) { const R = rng((o.seed || 1) * 7 + 3), S = STAR5, inner = clamp(S.inner[0] + gauss(R) * S.inner[1], S.inner[2], S.inner[3]);
    const Ro = o.r, a0 = (o.rot || 0) - Math.PI / 2, P = [], rr = [];
    for (let k = 0; k < 10; k++) { const tip = !(k & 1), len = tip ? Ro * (1 + gauss(R) * S.tip) : Ro * inner * (1 + gauss(R) * S.tip * 0.6), a = a0 + k * Math.PI / 5 + gauss(R) * S.gap * Math.PI / 5;
      P.push([o.x + Math.cos(a) * len, o.y + Math.sin(a) * len]); rr.push(tip ? Ro * 0.075 : Ro * 0.03); }
    const style = o.style || pickW(R, S.styles);
    // 렌즈 하이라이트: 빛 쪽 팔 하나에 큰 것, 다른 팔에 작은 것 0~2개
    const la = (o.light == null ? -135 : o.light) * Math.PI / 180, hl = [];
    let best = 0, bd = -9; for (let k = 0; k < 5; k++) { const a = a0 + k * TAU / 5, d = Math.cos(a - la); if (d > bd) { bd = d; best = k; } }
    const aB = a0 + best * TAU / 5 + gauss(R) * 0.15; hl.push([o.x + Math.cos(aB) * Ro * 0.3, o.y + Math.sin(aB) * Ro * 0.3, Ro * (0.4 + R() * 0.14), Ro * (0.15 + R() * 0.05), aB + gauss(R) * 0.35, Ro * 0.04 * (R() < 0.5 ? -1 : 1)]);
    const nS = R() < 0.6 ? 1 : R() < 0.5 ? 2 : 0;
    for (let i = 0; i < nS; i++) { const k = (best + (R() < 0.5 ? 1 : 4) + i * 3) % 5, a = a0 + k * TAU / 5; hl.push([o.x + Math.cos(a) * Ro * 0.5, o.y + Math.sin(a) * Ro * 0.5, Ro * (0.1 + R() * 0.07), Ro * (0.07 + R() * 0.03), a + gauss(R) * 0.3, 0]); }
    const lineCol = R() < 0.3 ? NUO.mixc(o.col ? o.col.f : '#FCCB06', '#e07400', 0.85) : NUO.mixc(o.col ? o.col.f : '#FCCB06', '#3a2808', 0.88);   // 진한 테두리: 주황 3 : 진한 갈색 7 (그림 10개 측정)
    return { P, rr, style, hl, lineCol }; }
  function ysStar5(ctx, o) { const sh = starShape(o), c = o.col || NUO.trio('#FCCB06');
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); roundPoly(ctx, sh.P, sh.rr); ctx.fillStyle = c.f; ctx.fill();
    if (sh.style === 'hi' && o.gloss !== false) { ctx.beginPath(); for (const h of sh.hl) lens(ctx, ...h); ctx.fillStyle = NUO.mixc(c.f, '#ffffff', 0.45); ctx.fill(); }
    if (sh.style === 'line' || o.forceLine) { const lw = o.lineW != null ? o.lineW : Math.max(1, o.r * 0.045); if (lw > 0) { ctx.beginPath(); roundPoly(ctx, sh.P, sh.rr); ctx.strokeStyle = o.lineCol || sh.lineCol; ctx.lineWidth = lw; ctx.stroke(); } } }
  NUO.register('ysStar5', ysStar5, 'balloon', '윤성 오각별');
  root.NUY = { STAR5, starShape, rng };
})(typeof window !== 'undefined' ? window : globalThis);
