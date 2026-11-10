/* NU OBJECTS — 윤성의 그림 배경 모양 모음 (벡터, 정지 화면용)
   뉴 플로우(nu-flow.html)에서 다듬은 모양들을 전역 설정 없이 쓸 수 있게 옮겼다. 모든 모양은 (ctx, o) 로 그린다.
   o = { x, y, r: 크기(반지름 기준), rot: 회전, seed: 정수, col:{f:면, l:테두리, h:하이라이트}, line: 테두리 굵기(px), light: 빛 각도(도), ...종류별 값 }
   ctx 는 CanvasRenderingContext2D 이거나 NUO.svgRecorder() 가 만든 기록기(SVG 내보내기용).  */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, HY = Math.hypot;
  // ── 해시 난수 (뉴 플로우 h/hh 와 같은 식) ──
  function h(seed, a, b) { let x = (seed ^ Math.imul(a + 1, 0x9E3779B1) ^ Math.imul(b + 1, 0x85EBCA77)) >>> 0; x = Math.imul(x ^ x >>> 15, 0x2C1B3C6D); x = Math.imul(x ^ x >>> 12, 0x297A2D39); return ((x ^ x >>> 15) >>> 0) / 4294967296; }
  const nz = (seed, a) => { const i = Math.floor(a), f = a - i, u = f * f * (3 - 2 * f); return (h(seed, i, 7) * 2 - 1) * (1 - u) + (h(seed, i + 1, 7) * 2 - 1) * u; };   // 1차원 부드러운 잡음 (-1~1)
  // ── 색 ──
  function hex(c) { c = String(c || '#000'); if (c[0] === '#') { if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; const v = parseInt(c.slice(1, 7), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; } const m = c.match(/\d+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]]; }
  const rgb = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  function mixc(a, b, t) { const A = hex(a), B = hex(b); return rgb([0, 1, 2].map(i => A[i] + (B[i] - A[i]) * t)); }
  function shadeH(hx, k) { const c = hex(hx); return rgb(c.map(x => k < 0 ? x * (1 + k) : x + (255 - x) * k)); }   // k<0 진하게, k>0 밝게
  /** 면색 하나로 테두리·하이라이트 세 벌 만들기 (뉴 플로우 '여러 색 섞기'와 같은 비율) */
  function trio(f, l, hh_) { return { f, l: l || shadeH(f, -0.38), h: hh_ || shadeH(f, 0.55) }; }
  // ── 공통 ──
  function setup(ctx, o) { const c = o.col || trio('#FAD805'); ctx.lineJoin = o.join || 'round'; ctx.lineCap = 'round'; ctx.miterLimit = 8; ctx.lineWidth = o.line == null ? Math.min(2.6, Math.max(1, o.r * 0.06)) : o.line; return c; }
  function fillStroke(ctx, c, o, fillCol) { ctx.fillStyle = fillCol || c.f; ctx.fill(); if (ctx.lineWidth > 0 && (o.line == null || o.line > 0)) { ctx.strokeStyle = c.l; ctx.stroke(); } }
  function lightDir(o) { const la = (o.light == null ? -135 : o.light) * Math.PI / 180; return [Math.cos(la), Math.sin(la), la]; }
  /** 둥근 몸통에 그늘 초승달 + 하이라이트 덩이 + 작은 점 (핏방울·소용돌이·오각별 공통 명암) */
  function shadeRound(ctx, o, c, pathFn, R) { const [lx, ly, la] = lightDir(o); ctx.save(); pathFn(); ctx.clip();
    ctx.beginPath(); ctx.arc(o.x + lx * R * 0.3, o.y + ly * R * 0.3, R * 0.86, 0, TAU); ctx.rect(o.x - R * 3, o.y - R * 3, R * 6, R * 6); ctx.fillStyle = mixc(c.f, c.l, 0.45); ctx.fill('evenodd');
    ctx.beginPath(); ctx.ellipse(o.x + lx * R * 0.32, o.y + ly * R * 0.32, R * 0.3, R * 0.17, la + Math.PI / 2, 0, TAU); ctx.fillStyle = c.h; ctx.fill();
    ctx.beginPath(); ctx.arc(o.x + lx * R * 0.62 - ly * R * 0.18, o.y + ly * R * 0.62 + lx * R * 0.18, R * 0.065, 0, TAU); ctx.fill(); ctx.restore(); }
  /** 계단 꺾임 쐐기 (번개·광선의 공통 모양) — 뉴 플로우 notchSpike */
  function notchSpike(ctx, x0, y0, a, L, W, steps, sg, point, c, lineW, fc, cut, grow) { const ca = Math.cos(a), sa = Math.sin(a), s0 = Math.min(cut || 0, 0.98), uE = Math.min(1, grow == null ? 1 : grow), sp = uE - s0; if (sp * L < 3) return;
    const tb = point ? 0.3 : 0.24, wd = v => { const b = Math.min(1, v / tb), e = b * b * (3 - 2 * b); return W * 0.5 * e * Math.pow(Math.max(0, 1 - v), 0.8); }, P = (v, o) => { const u = s0 + sp * v; return [x0 + ca * u * L - sa * o, y0 + sa * u * L + ca * o]; };
    const top = [P(0, 0)], bot = [P(0, 0)]; let Y = 0; const vs = [0.06, 0.13, 0.21, 0.3, ...steps.map(x => -x), 0.82, 0.92].sort((p, q) => Math.abs(p) - Math.abs(q));
    for (const v0 of vs) { if (v0 >= 0) { const w = wd(v0); top.push(P(v0, Y - w)); bot.push(P(v0, Y + w)); continue; }
      const st = -v0, w = wd(st), jj = w * 1.15 * sg, f = w * 1.5 / (L * sp), b = w * 0.25 / (L * sp);
      if (sg > 0) { top.push(P(st + f, Y - w)); top.push(P(st - b, Y + jj - w)); bot.push(P(st + b, Y + w)); bot.push(P(st - f, Y + jj + w)); }
      else { top.push(P(st + b, Y - w)); top.push(P(st - f, Y + jj - w)); bot.push(P(st + f, Y + w)); bot.push(P(st - b, Y + jj + w)); }
      Y += jj; }
    const tip = P(1, Y); ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (let q = 1; q < top.length; q++) ctx.lineTo(top[q][0], top[q][1]); ctx.lineTo(tip[0], tip[1]);
    for (let q = bot.length - 1; q >= 1; q--) ctx.lineTo(bot[q][0], bot[q][1]); ctx.closePath(); ctx.fillStyle = fc || c.f; ctx.fill(); if (lineW > 0) { ctx.strokeStyle = c.l; ctx.lineWidth = lineW; ctx.stroke(); } }


  // ── 생애 (뉴 플로우의 팡·풍선·빨려 들어가기) ──
  /** t: 태어난 뒤 지난 시간(초), life: 수명(초), pop: 팡 세기(0~3). 반환 {s 전체 배율, bx,by 풍선 가로세로, grow 뻗은 비율, cut 뿌리부터 사라진 비율, flash 첫 섬광, alive} */
  function skPop(t, life, pop, d) { t -= d || 0; if (t <= 0) return 0; const a = 0.16; let s = 1; if (t < a) { const u = t / a - 1, c1 = 1.70158 * pop, c3 = c1 + 1; s = 1 + c3 * u * u * u + c1 * u * u; } const out = Math.min(0.38, life * 0.4); if (t > life - out) { const u = Math.max(0, (life - t) / out); s *= u * u * (3 - 2 * u); } return Math.max(0, s); }
  function balloon(t, life, pop) { const k = Math.max(0, t); let s = 1 - Math.exp(-k * 9) * Math.cos(k * 20) * (1 + 0.35 * pop); s = Math.max(0, Math.min(1.25, s)); const out = Math.min(0.38, life * 0.4); if (t > life - out) { const u = Math.max(0, (life - t) / out); s *= u * u * (3 - 2 * u); } const wob = 0.12 * pop * Math.exp(-k * 5) * Math.sin(k * 24); return [s * (1 + wob), s * (1 - wob)]; }
  const ease3 = (t, d) => { const u = Math.min(1, Math.max(0, t / d)); return 1 - Math.pow(1 - u, 3); };
  const LIFE_MODE = { burstStar: 'pop', spiky: 'pop', glint: 'twinkle', crossStar: 'twinkle', star5: 'balloon', drop: 'balloon', jelly: 'balloon', heart: 'balloon', cloud: 'balloon', puff: 'balloon', ring: 'balloon', inkSplat: 'pop',
    bolt: 'strike', rayFan: 'shoot', needle: 'shoot', paintStreak: 'shoot', band: 'sweep', zig: 'shoot', wave: 'sweep', wedge: 'sweep' };
  function life(kind, t, lf, pop, seedPhase) { pop = pop == null ? 1 : pop; const m = LIFE_MODE[kind] || 'pop', L = { s: 1, bx: 1, by: 1, grow: 1, cut: 0, flash: false, alive: t >= 0 && t <= lf };
    if (!L.alive) return L; const out = Math.min(0.5, lf * 0.35), fin = t > lf - out ? Math.min(1, (t - (lf - out)) / out) : 0;
    if (m === 'pop') { L.s = skPop(t, lf, pop); L.flash = t < 0.08; }
    else if (m === 'balloon') { const [bx, by] = balloon(t, lf, pop); L.bx = bx; L.by = by; L.s = 1; }
    else if (m === 'twinkle') { const ph = (seedPhase || 0) * TAU; L.s = skPop(t, lf, pop * 0.5) * (0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 5.5 + ph))); }
    else if (m === 'strike') { L.grow = ease3(t, 0.15); L.flash = t < 0.095; if (fin > 0) { if (Math.floor((1 - fin) * out / 0.045) % 2 === 1) L.alive = false; L.s = 0.7 + 0.3 * (1 - fin); } }
    else if (m === 'shoot') { L.grow = ease3(t, 0.2); const rt = Math.max(0, (t - lf * 0.5) / (lf * 0.5)); L.cut = rt * rt; }
    else if (m === 'sweep') { L.grow = ease3(t, 0.35); L.cut = fin * fin; L.s = 1; }
    return L; }

  const K = {};   // 종류별 그리기

  /** 터지는 별 (노란 스파크): spikes 가시 수, jag 들쭉날쭉(0~1.5), vary 다양함(0~1.5) */
  K.burstStar = (ctx, o) => { const c = setup(ctx, o); ctx.lineJoin = 'miter'; const sd = o.seed | 0, hh = n => h(sd * 31, n, 5), R = o.r, V = o.vary == null ? 0.8 : o.vary, J = o.jag == null ? 0.6 : o.jag;
    const n = Math.max(4, Math.round((o.spikes || 9) * (1 + (hh(2) - 0.5) * 1.1 * V) + (hh(9) - 0.5) * 2)), lg = Math.floor(hh(3) * n), bf = 0.36 * (1 + (hh(4) - 0.5) * 0.9 * V), st = 1 + (hh(5) - 0.5) * 0.7 * V, sa = hh(6) * TAU, cs = Math.cos(sa), ss = Math.sin(sa), sp = o.rot || 0;
    ctx.beginPath();
    for (let k = 0; k < n * 2; k++) { const tip = !(k & 1), q = k >> 1, a = sp + k * Math.PI / n + (tip ? (hh(10 + q) - 0.5) * J * 0.6 : (hh(70 + q) - 0.5) * 0.5 * V), base = R * bf * (1 + (hh(80 + q) - 0.5) * 0.5 * V);
      const lng = (q === lg ? 0.65 : 0) + (hh(60 + q) < 0.18 * V ? 0.4 + 0.4 * hh(61 + q) : 0), rr = tip ? R * (0.55 + 0.55 * J * hh(30 + q) + V * 0.45 * (hh(50 + q) - 0.35) + lng) : base;
      let dx = Math.cos(a) * rr, dy = Math.sin(a) * rr; const pa = dx * cs + dy * ss, pp = -dx * ss + dy * cs; dx = pa * st * cs - pp * ss / st; dy = pa * st * ss + pp * cs / st; k ? ctx.lineTo(o.x + dx, o.y + dy) : ctx.moveTo(o.x + dx, o.y + dy); }
    ctx.closePath(); fillStroke(ctx, c, o); if (o.flash) { ctx.beginPath(); ctx.arc(o.x, o.y, R * 0.55, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); } };

  /** 번개 갈래: dir 방향, len 길이배(1.5~2.1), n 갈래 수 */
  K.bolt = (ctx, o) => { const c = setup(ctx, o); ctx.lineJoin = 'miter'; const sd = o.seed | 0, hh = n => h(sd * 31, n, 5), R = o.r, m = o.n || 1, dir = o.rot || 0, lw = ctx.lineWidth;
    for (let j = 0; j < m; j++) { const a = dir + (j - (m - 1) / 2) * 0.6 + (hh(20 + j) - 0.5) * 0.25, L = R * (o.len || 1.5 + 0.6 * hh(25 + j)), W = R * (0.42 + 0.1 * hh(26 + j));
      const ox = (j - (m - 1) / 2) * Math.sin(a) * W * 2.6, oy = -(j - (m - 1) / 2) * Math.cos(a) * W * 2.6;
      notchSpike(ctx, o.x + Math.cos(a) * R * 0.25 + ox, o.y + Math.sin(a) * R * 0.25 + oy, a, L, W, [0.36 + (hh(3) - 0.5) * 0.1, 0.66 + (hh(4) - 0.5) * 0.1], hh(28 + j) < 0.5 ? 1 : -1, true, c, lw, o.flash ? '#FFFFFF' : null, o.cut, o.grow); } };

  /** 뻗는 광선: 같은 계단 꺾임의 긴 쐐기가 부채꼴로 나란히 (3~5개) */
  K.rayFan = (ctx, o) => { const c = setup(ctx, o); ctx.lineJoin = 'miter'; const sd = o.seed | 0, hh = n => h(sd * 31, n, 5), R = o.r, m = o.n || 3 + Math.floor(hh(2) * 3), dir = o.rot || 0, nx = -Math.sin(dir), ny = Math.cos(dir), lw = ctx.lineWidth;
    for (let j = 0; j < m; j++) { const off = (j - (m - 1) / 2) * R * 0.55 * (1 + 0.3 * hh(30 + j)), a = dir + (j - (m - 1) / 2) * 0.07 + (hh(20 + j) - 0.5) * 0.06, L = R * (o.len || 3.5 + 3 * hh(25 + j)), W = R * (0.32 + 0.22 * hh(27 + j));
      notchSpike(ctx, o.x + nx * off, o.y + ny * off, a, L, W, hh(29 + j) < 0.5 ? [0.42] : [0.32, 0.62], hh(28 + j) < 0.5 ? 1 : -1, false, c, lw, null, o.cut, o.grow); } };

  /** 오각별: 변이 살짝 볼록하고 꼭짓점은 조금 둥글며, 별 모양을 따라 흐르는 그늘·하이라이트 띠 */
  K.star5 = (ctx, o) => { const c = setup(ctx, o); const Ro = o.r * 0.95, Ri = Ro * (o.inner || 0.47), a0 = (o.rot || 0) - Math.PI / 2, [lx0, ly0] = lightDir(o), lx = lx0 * Ro, ly = ly0 * Ro;
    const pts = []; for (let k = 0; k < 10; k++) { const rr = k & 1 ? Ri : Ro, a = a0 + k * Math.PI / 5; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    const path = (kk = 1, ox = 0, oy = 0) => { ctx.beginPath(); const X = v => o.x + ox + v[0] * kk, Y = v => o.y + oy + v[1] * kk, mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      for (let k = 0; k < 10; k++) { const p = pts[k], q = pts[(k + 1) % 10], n = pts[(k + 2) % 10], a1 = mix(p, q, 0.06), b1 = mix(p, q, 0.94), c2 = mix(q, n, 0.06), mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ml = HY(mx, my) || 1, cx = mx + mx / ml * Ro * 0.045, cy = my + my / ml * Ro * 0.045;
        if (k === 0) ctx.moveTo(X(a1), Y(a1)); ctx.quadraticCurveTo(o.x + ox + cx * kk, o.y + oy + cy * kk, X(b1), Y(b1)); ctx.quadraticCurveTo(X(q), Y(q), X(c2), Y(c2)); } ctx.closePath(); };
    path(); ctx.fillStyle = o.flat ? c.f : mixc(c.f, c.l, 0.45); ctx.fill();
    if (!o.flat) { path(0.88, lx * 0.07, ly * 0.07); ctx.fillStyle = c.f; ctx.fill(); path(0.6, lx * 0.17, ly * 0.17); ctx.fillStyle = c.h; ctx.fill(); path(0.5, lx * 0.1, ly * 0.1); ctx.fillStyle = c.f; ctx.fill(); ctx.beginPath(); ctx.arc(o.x + lx * 0.5, o.y + ly * 0.5, Ro * 0.05, 0, TAU); ctx.fillStyle = c.h; ctx.fill(); }
    path(); if (ctx.lineWidth > 0 && (o.line == null || o.line > 0)) { ctx.strokeStyle = c.l; ctx.stroke(); } };

  /** 작은 반짝이: 오목한 네 변의 마름모 별 */
  K.glint = (ctx, o) => { const c = setup(ctx, o); const r = o.r, w = r * (o.waist || 0.16), rot = o.rot || 0, cs = Math.cos(rot), sn = Math.sin(rot), P = (u, v) => [o.x + u * cs - v * sn, o.y + u * sn + v * cs];
    ctx.beginPath(); let p = P(0, -r); ctx.moveTo(p[0], p[1]); let q = P(w, -w), e = P(r * (o.wide || 0.8), 0); ctx.quadraticCurveTo(q[0], q[1], e[0], e[1]); q = P(w, w); e = P(0, r); ctx.quadraticCurveTo(q[0], q[1], e[0], e[1]); q = P(-w, w); e = P(-r * (o.wide || 0.8), 0); ctx.quadraticCurveTo(q[0], q[1], e[0], e[1]); q = P(-w, -w); e = P(0, -r); ctx.quadraticCurveTo(q[0], q[1], e[0], e[1]); ctx.closePath(); ctx.fillStyle = c.f; ctx.fill(); };

  /** 십자별: 둥근 몸통 + 뿌리에서 끝으로 오목하게 가늘어지는 네 바늘 팔. body 몸통비, armW 팔 뿌리 굵기, len 팔 길이배, hv 가로팔/세로팔 비 */
  K.crossStar = (ctx, o) => { const c = setup(ctx, o); const r = o.r, b = r * (o.body == null ? 0.22 : o.body), aw = Math.max(0.6, r * (o.armW == null ? 0.35 : o.armW) * 0.35), v = b + r * (o.len == null ? 1 : o.len), hh_ = b + r * (o.len == null ? 1 : o.len) * (o.hv == null ? 0.8 : o.hv), th = o.rot || 0, cr = Math.cos(th), sr = Math.sin(th);
    const AP = new Path2D ? new Path2D() : null; const arms = AP || ctx; if (!AP) ctx.beginPath();
    for (let q = 0; q < 4; q++) { const L = q % 2 ? hh_ : v, c0 = [0, 1, 0, -1][q], s0 = [-1, 0, 1, 0][q], ca = c0 * cr - s0 * sr, sa = c0 * sr + s0 * cr, px = -sa, py = ca, b0 = b * 0.55;
      const bx = o.x + ca * b0, by = o.y + sa * b0, tx = o.x + ca * L, ty = o.y + sa * L, m = b0 + (L - b0) * 0.3;
      arms.moveTo(bx + px * aw, by + py * aw); arms.quadraticCurveTo(o.x + ca * m + px * aw * 0.22, o.y + sa * m + py * aw * 0.22, tx, ty); arms.quadraticCurveTo(o.x + ca * m - px * aw * 0.22, o.y + sa * m - py * aw * 0.22, bx - px * aw, by - py * aw); arms.closePath(); }
    const strokeOn = o.line > 0 && r > 5;
    if (ctx.isRecorder) { // SVG 기록기: Path2D 대신 직접
      if (strokeOn) { ctx.strokeStyle = c.l; ctx.lineWidth = Math.min(3.2, r * 0.16); ctx.beginPath(); ctx.arc(o.x, o.y, b, 0, TAU); ctx.stroke(); ctx.replay(arms); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(o.x, o.y, b, 0, TAU); ctx.fillStyle = c.f; ctx.fill(); ctx.replay(arms); ctx.fill(); return; }
    const BP = new Path2D(); BP.arc(o.x, o.y, b, 0, TAU); if (strokeOn) { ctx.strokeStyle = c.l; ctx.lineWidth = Math.min(3.2, r * 0.16); ctx.stroke(BP); ctx.stroke(AP); } ctx.fillStyle = c.f; ctx.fill(BP); ctx.fill(AP, 'nonzero'); };

  /** 핏방울·구슬: 둥근 방울, 테두리, 그늘 초승달과 하이라이트. asp 가로세로비, gloss false 면 단순 하이라이트만 */
  K.drop = (ctx, o) => { const c = setup(ctx, o); const r = o.r, asp = o.asp || 1, rot = o.rot || 0; const path = () => { ctx.beginPath(); ctx.ellipse(o.x, o.y, r, r * asp, rot, 0, TAU); };
    path(); ctx.fillStyle = c.f; ctx.fill(); if (o.gloss !== false && r > 3) shadeRound(ctx, o, c, path, r); else if (r > 2.5) { const [lx, ly] = lightDir(o); ctx.beginPath(); ctx.arc(o.x + lx * r * 0.38, o.y + ly * r * 0.38, r * 0.28, 0, TAU); ctx.fillStyle = c.h; ctx.fill(); }
    path(); if (ctx.lineWidth > 0 && (o.line == null || o.line > 0)) { ctx.strokeStyle = c.l; ctx.stroke(); } };

  /** 젤리 덩어리: 둥글둥글 울퉁불퉁한 덩이 (lobes 울퉁 정도 0~0.6) + 같은 명암 */
  K.jelly = (ctx, o) => { const c = setup(ctx, o); const r = o.r, sd = o.seed | 0, lob = o.lobes == null ? 0.2 : o.lobes, n = 40, rot = o.rot || 0, asp = o.asp || 1;
    const path = () => { ctx.beginPath(); for (let i = 0; i <= n; i++) { const a = i / n * TAU, rr = r * (1 + lob * nz(sd, a / TAU * 3.2) + lob * 0.5 * nz(sd + 3, a / TAU * 7)); const X = Math.cos(a) * rr, Y = Math.sin(a) * rr * asp; const px = o.x + X * Math.cos(rot) - Y * Math.sin(rot), py = o.y + X * Math.sin(rot) + Y * Math.cos(rot); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); };
    path(); ctx.fillStyle = c.f; ctx.fill(); if (o.gloss !== false && r > 4) shadeRound(ctx, o, c, path, r); path(); if (ctx.lineWidth > 0 && (o.line == null || o.line > 0)) { ctx.strokeStyle = c.l; ctx.stroke(); } };

  /** 하트 방울 (볼록한 하트) */
  K.heart = (ctx, o) => { const c = setup(ctx, o); const r = o.r, rot = o.rot || 0, cs = Math.cos(rot), sn = Math.sin(rot), P = (u, v) => [o.x + (u * cs - v * sn) * r, o.y + (u * sn + v * cs) * r];
    const path = () => { ctx.beginPath(); let p = P(0, 0.95); ctx.moveTo(p[0], p[1]); const C = (a, b, c2, d, e, f) => { const A = P(a, b), B = P(c2, d), D = P(e, f); ctx.bezierCurveTo(A[0], A[1], B[0], B[1], D[0], D[1]); };
      C(-0.35, 0.62, -1.05, 0.25, -1.0, -0.25); C(-0.95, -0.78, -0.25, -0.95, 0, -0.48); C(0.25, -0.95, 0.95, -0.78, 1.0, -0.25); C(1.05, 0.25, 0.35, 0.62, 0, 0.95); ctx.closePath(); };
    path(); ctx.fillStyle = c.f; ctx.fill(); if (o.gloss !== false && r > 4) shadeRound(ctx, o, c, path, r); path(); if (ctx.lineWidth > 0 && (o.line == null || o.line > 0)) { ctx.strokeStyle = c.l; ctx.stroke(); } };

  /** 잉크 튀김: 울퉁한 덩이 + 한 방향으로 떨어져 나간 점 4개 (토르소 4 검은 잉크) */
  K.inkSplat = (ctx, o) => { const c = setup(ctx, o); const r = o.r, sd = o.seed | 0, a = o.rot || 0;
    ctx.beginPath(); for (let k = 0; k <= 24; k++) { const an = k / 24 * TAU, rr = r * (1 + 0.25 * Math.sin(an * 3 + sd) + 0.15 * Math.sin(an * 7 + sd * 2)); k ? ctx.lineTo(o.x + Math.cos(an) * rr, o.y + Math.sin(an) * rr) : ctx.moveTo(o.x + Math.cos(an) * rr, o.y + Math.sin(an) * rr); } ctx.closePath(); ctx.fillStyle = c.f; ctx.fill();
    const nd = o.dots == null ? 4 : o.dots; for (let q = 0; q < nd; q++) { const d = r * (1.5 + q * 0.6), rr = r * (0.28 - 0.05 * q); ctx.beginPath(); ctx.arc(o.x + Math.cos(a + q * 0.3) * d, o.y + Math.sin(a + q * 0.3) * d, Math.max(0.5, rr), 0, TAU); ctx.fill(); } };

  /** 페인트 튀김 줄: 뿌리가 굵고 끝이 가는 획 + 끝에 튄 점들 (len 길이, w 굵기, dots 점 수) */
  K.paintStreak = (ctx, o) => { const c = setup(ctx, o); const a = o.rot || 0, L = (o.len || o.r * 4) * (o.grow == null ? 1 : o.grow), w = (o.w || o.r * 0.5) * (1 - (o.cut || 0)), ca = Math.cos(a), sa = Math.sin(a), sd = o.seed | 0; if (L < 1 || w < 0.3) return;
    ctx.beginPath(); const n = 16; for (let i = 0; i <= n; i++) { const u = i / n, ww = w * Math.pow(1 - u, 0.7) * (1 + 0.15 * nz(sd, u * 4)), bx = o.x + ca * L * u, by = o.y + sa * L * u; i ? ctx.lineTo(bx - sa * ww, by + ca * ww) : ctx.moveTo(bx - sa * ww, by + ca * ww); }
    for (let i = n; i >= 0; i--) { const u = i / n, ww = w * Math.pow(1 - u, 0.7) * (1 + 0.15 * nz(sd + 1, u * 4)), bx = o.x + ca * L * u, by = o.y + sa * L * u; ctx.lineTo(bx + sa * ww, by - ca * ww); } ctx.closePath(); ctx.fillStyle = c.f; ctx.fill();
    const nd = o.dots == null ? 3 : o.dots; for (let q = 0; q < nd; q++) { const d = L * (1.08 + q * 0.1), rr = w * (0.9 - 0.18 * q); ctx.beginPath(); ctx.arc(o.x + ca * d, o.y + sa * d, Math.max(0.5, rr), 0, TAU); ctx.fill(); } };

  /** 쓸린 띠 (얼룩말 줄·찢긴 결): 굵기가 출렁이는 긴 띠 조각. len 길이, w 굵기, curve 휨, taper 끝 가늘기(0~1) */
  K.band = (ctx, o) => { const c = setup(ctx, o); const a = o.rot || 0, L = o.len || o.r * 5, w = o.w || o.r * 0.5, cv = o.curve || 0, tp = o.taper == null ? 0.6 : o.taper, sd = o.seed | 0, ca = Math.cos(a), sa = Math.sin(a), n = 20, u0 = o.cut || 0, u1 = o.grow == null ? 1 : o.grow; if (u1 - u0 < 0.03) return;
    const spine = v => { const u = u0 + (u1 - u0) * v; const x = (u - 0.5) * L, y = cv * L * 0.5 * (4 * u * (1 - u) - 1) ; return [o.x + ca * x - sa * y, o.y + sa * x + ca * y]; };
    const wid = (v, s) => { const u = u0 + (u1 - u0) * v; return w * (1 - tp * Math.pow(Math.abs(u * 2 - 1), 1.6)) * (1 + 0.35 * nz(sd + s, u * 5)) * (v < 0.04 || v > 0.96 ? 0.35 : 1); };
    ctx.beginPath(); for (let i = 0; i <= n; i++) { const u = i / n, [x, y] = spine(u), ww = wid(u, 0); i ? ctx.lineTo(x - sa * ww, y + ca * ww) : ctx.moveTo(x - sa * ww, y + ca * ww); }
    for (let i = n; i >= 0; i--) { const u = i / n, [x, y] = spine(u), ww = wid(u, 9); ctx.lineTo(x + sa * ww, y - ca * ww); } ctx.closePath(); fillStroke(ctx, c, o); };

  /** 침·집중선: 뿌리에서 끝으로 가늘어지는 긴 바늘 (len 길이, w 뿌리 굵기, bend 휨) */
  K.needle = (ctx, o) => { const c = setup(ctx, o); const a = o.rot || 0, L = o.len || o.r * 6, w = o.w || o.r * 0.18, ca = Math.cos(a), sa = Math.sin(a), bd = (o.bend || 0) * L, u0 = o.cut || 0, u1 = o.grow == null ? 1 : o.grow; if (u1 - u0 < 0.02) return;
    const P = (v, s) => { const u = u0 + (u1 - u0) * v, x = u * L, y = bd * u * u + s; return [o.x + ca * x - sa * y, o.y + sa * x + ca * y]; };
    ctx.beginPath(); let p = P(0, -w * 0.5); ctx.moveTo(p[0], p[1]); p = P(o.k || 0.35, -w * 0.5); ctx.lineTo(p[0], p[1]); p = P(1, 0); ctx.lineTo(p[0], p[1]); p = P(o.k || 0.35, w * 0.5); ctx.lineTo(p[0], p[1]); p = P(0, w * 0.5); ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fillStyle = c.f; ctx.fill(); if (o.line > 0) { ctx.strokeStyle = c.l; ctx.stroke(); } };

  /** 가시 별 (찢긴 결의 가운데 별): 짧은 가시와 긴 가시가 섞인 날카로운 별. spikes 가시 수, nLong 긴 가시 수 */
  K.spiky = (ctx, o) => { const c = setup(ctx, o); ctx.lineJoin = 'miter'; const sd = o.seed | 0, hr = (s, k) => h(s, k, 11), n = o.spikes || 12, R0 = o.r, R = R0 * 0.45, nL = o.nLong == null ? 3 : o.nLong;
    const longSet = new Set([...Array(n).keys()].sort((a, b) => hr(sd, a + 100) - hr(sd, b + 100)).slice(0, Math.min(n, nL))); ctx.beginPath(); let first = true; const put = (x, y) => { first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; };
    for (let i = 0; i < n; i++) { const gap = TAU / n, a = i * gap + (hr(sd, i) - 0.5) * gap * 0.55 + (o.rot || 0), lg = longSet.has(i), len = R0 * (lg ? 0.55 * (0.65 + 0.35 * hr(sd, i + 7)) : 0.3 * (0.3 + 0.7 * hr(sd, i + 9))), wv = lg ? 0.34 : 0.42;
      const v1 = a - gap * wv, v2 = a + gap * wv, rv = R * (0.85 + 0.25 * hr(sd, i + 30)); put(o.x + Math.cos(v1) * rv, o.y + Math.sin(v1) * rv);
      if (lg) { const mr = R + len * 0.45, ma = a + (hr(sd, i + 40) - 0.5) * 0.12; put(o.x + Math.cos(ma - 0.05) * mr, o.y + Math.sin(ma - 0.05) * mr); }
      const ta = a + (hr(sd, i + 50) - 0.5) * 0.1; put(o.x + Math.cos(ta) * (R + len), o.y + Math.sin(ta) * (R + len)); put(o.x + Math.cos(v2) * rv, o.y + Math.sin(v2) * rv); }
    ctx.closePath(); fillStroke(ctx, c, o); };

  /** 한 번 꺾인 가는 가시 (찢긴 결 파편) */
  K.zig = (ctx, o) => { const c = setup(ctx, o); const a = o.rot || 0, len = o.len || o.r * 4, wd = o.w || o.r * 0.35, sd = o.seed | 0, hr = k => h(sd, k, 3), cs = Math.cos(a), sn = Math.sin(a), f = 0.35 + 0.3 * hr(1), jog = (hr(2) < 0.5 ? -1 : 1) * wd * (1.2 + hr(3));
    const x0 = o.x - cs * len * 0.5, y0 = o.y - sn * len * 0.5, xk = x0 + cs * len * f, yk = y0 + sn * len * f, x1 = o.x + cs * len * 0.5 - sn * jog, y1 = o.y + sn * len * 0.5 + cs * jog;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(xk - sn * wd * 0.5, yk + cs * wd * 0.5); ctx.lineTo(xk - sn * jog * 0.5 - sn * wd * 0.5, yk + cs * jog * 0.5 + cs * wd * 0.5); ctx.lineTo(x1, y1); ctx.lineTo(xk - sn * jog * 0.5 + sn * wd * 0.5, yk + cs * jog * 0.5 - cs * wd * 0.5); ctx.lineTo(xk + sn * wd * 0.5, yk - cs * wd * 0.5); ctx.closePath(); ctx.fillStyle = c.f; ctx.fill(); };

  /** 거품 구름: 동그라미 여섯이 뭉친 구름, 테두리색 뒤판 */
  K.cloud = (ctx, o) => { const c = setup(ctx, o); const sd = o.seed | 0, sc = o.r / 60, hh = (a, b) => h(sd, a, b), bl = []; const n = o.n || 6;
    for (let q = 0; q < n; q++) bl.push([o.x + (q - (n - 1) / 2) * 26 * sc + (hh(10 + q, 1) - 0.5) * 14 * sc, o.y + (hh(20 + q, 1) - 0.5) * 22 * sc - (q === Math.floor(n / 2) - 1 || q === Math.floor(n / 2) ? 12 * sc : 0), (20 + 14 * hh(30 + q, 1)) * sc]);
    const ow = o.line == null ? 3 * sc : o.line; if (ow > 0) { ctx.fillStyle = c.l; for (const [x, y, r] of bl) { ctx.beginPath(); ctx.arc(x, y, r + ow, 0, TAU); ctx.fill(); } }
    ctx.fillStyle = c.f; for (const [x, y, r] of bl) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    if (o.gloss) { const [lx, ly] = lightDir(o); ctx.fillStyle = c.h; for (const [x, y, r] of bl) { ctx.beginPath(); ctx.arc(x + lx * r * 0.35, y + ly * r * 0.35, r * 0.22, 0, TAU); ctx.fill(); } } };

  /** 뭉게 윤곽 구름 (패턴소품 09·10의 선 구름): 둥근 혹이 이어진 윤곽, 면색 채우고 테두리 */
  K.puff = (ctx, o) => { const c = setup(ctx, o); const sd = o.seed | 0, r = o.r, n = o.n || 9, asp = o.asp || 0.7, rot = o.rot || 0, cs = Math.cos(rot), sn = Math.sin(rot);
    const T = (x, y) => [o.x + x * cs - y * sn, o.y + x * sn + y * cs]; ctx.beginPath(); let start = null;
    for (let i = 0; i < n; i++) { const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, R0 = r * (0.8 + 0.3 * h(sd, i, 2)), R1 = r * (0.8 + 0.3 * h(sd, i + 1, 2)); const p0 = [Math.cos(a0) * R0, Math.sin(a0) * R0 * asp], p1 = [Math.cos(a1) * R1, Math.sin(a1) * R1 * asp];
      const am = (a0 + a1) / 2, bulge = r * (1.15 + 0.25 * h(sd, i, 5)), cp = [Math.cos(am) * bulge, Math.sin(am) * bulge * asp]; const A = T(p0[0], p0[1]), C = T(cp[0], cp[1]), B = T(p1[0], p1[1]);
      if (i === 0) { ctx.moveTo(A[0], A[1]); start = A; } ctx.quadraticCurveTo(C[0], C[1], B[0], B[1]); } ctx.closePath(); fillStroke(ctx, c, o); };

  /** 물결 띠 조각: 윗면이 출렁이는 가로 띠 (len 길이, amp 진폭, w 두께) */
  K.wave = (ctx, o) => { const c = setup(ctx, o); const a = o.rot || 0, L = o.len || o.r * 6, amp = o.amp || o.r * 0.3, w = o.w || o.r, sd = o.seed | 0, ca = Math.cos(a), sa = Math.sin(a), k = (o.k || 2.2) * TAU / L, ph = h(sd, 1, 1) * TAU;
    const P = (x, y) => [o.x + ca * x - sa * y, o.y + sa * x + ca * y]; ctx.beginPath(); const n = 24;
    for (let i = 0; i <= n; i++) { const x = (i / n - 0.5) * L, y = Math.sin(x * k + ph) * amp + Math.sin(x * k * 2.3 + ph * 1.7) * amp * 0.3; const p = P(x, y); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    for (let i = n; i >= 0; i--) { const x = (i / n - 0.5) * L, y = Math.sin(x * k + ph + 0.6) * amp * 0.8 + w; const p = P(x, y); ctx.lineTo(p[0], p[1]); } ctx.closePath(); fillStroke(ctx, c, o); };

  /** 방사 쐐기 (방사 집중선 한 조각): 중심에서 바깥으로 벌어지는 삼각 쐐기. span 각폭, len 길이 */
  K.wedge = (ctx, o) => { const c = setup(ctx, o); const a0 = (o.rot || 0) - (o.span || 0.12) / 2, a1 = a0 + (o.span || 0.12), L = o.len || o.r * 10, r0 = o.r0 || 0;
    ctx.beginPath(); ctx.moveTo(o.x + Math.cos((a0 + a1) / 2) * r0, o.y + Math.sin((a0 + a1) / 2) * r0); ctx.lineTo(o.x + Math.cos(a0) * L, o.y + Math.sin(a0) * L); ctx.lineTo(o.x + Math.cos(a1) * L, o.y + Math.sin(a1) * L); ctx.closePath(); ctx.fillStyle = c.f; ctx.fill(); };

  /** 고리·거품막: 속이 빈 둥근 고리 (line 굵기, gap 터진 각도 0~1) */
  K.ring = (ctx, o) => { const c = setup(ctx, o); const r = o.r, sd = o.seed | 0, gap = o.gap || 0, a0 = (o.rot || 0) + gap * Math.PI, a1 = a0 + TAU - gap * TAU * 0.6, n = 36; ctx.beginPath();
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, rr = r * (1 + 0.08 * nz(sd, i / n * 4)); i ? ctx.lineTo(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr) : ctx.moveTo(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr); }
    if (gap <= 0) ctx.closePath(); ctx.strokeStyle = c.f; ctx.lineWidth = o.w || Math.max(1.2, r * 0.14); ctx.stroke(); };

  // ── SVG 기록기: 캔버스 명령을 받아 <path> 로 쌓는다 ──
  function svgRecorder(W, H) { const out = []; let d = '', sub = []; const f = v => (+v).toFixed(1);
    const R = { isRecorder: true, lineWidth: 1, fillStyle: '#000', strokeStyle: '#000', lineJoin: 'round', lineCap: 'round', miterLimit: 8, globalAlpha: 1,
      beginPath() { d = ''; }, closePath() { d += 'Z'; }, moveTo(x, y) { d += `M${f(x)} ${f(y)}`; }, lineTo(x, y) { d += `L${f(x)} ${f(y)}`; },
      quadraticCurveTo(a, b, x, y) { d += `Q${f(a)} ${f(b)} ${f(x)} ${f(y)}`; }, bezierCurveTo(a, b, c2, e, x, y) { d += `C${f(a)} ${f(b)} ${f(c2)} ${f(e)} ${f(x)} ${f(y)}`; },
      arc(x, y, r, s, e) { const full = Math.abs(e - s) >= TAU - 1e-6; const x0 = x + Math.cos(s) * r, y0 = y + Math.sin(s) * r; d += `M${f(x0)} ${f(y0)}`; if (full) { d += `A${f(r)} ${f(r)} 0 1 1 ${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 1 1 ${f(x0)} ${f(y0)}`; } else { const x1 = x + Math.cos(e) * r, y1 = y + Math.sin(e) * r; d += `A${f(r)} ${f(r)} 0 ${Math.abs(e - s) > Math.PI ? 1 : 0} ${e > s ? 1 : 0} ${f(x1)} ${f(y1)}`; } },
      ellipse(x, y, rx, ry, rot, s, e) { const n = 24, cs = Math.cos(rot), sn = Math.sin(rot); for (let i = 0; i <= n; i++) { const a = s + (e - s) * i / n, X = Math.cos(a) * rx, Y = Math.sin(a) * ry; const px = x + X * cs - Y * sn, py = y + X * sn + Y * cs; d += (i ? 'L' : 'M') + f(px) + ' ' + f(py); } },
      rect(x, y, w, hh_) { d += `M${f(x)} ${f(y)}h${f(w)}v${f(hh_)}h${f(-w)}Z`; },
      fill(rule) { if (d) out.push(`<path d="${d}" fill="${R.fillStyle}"${rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}${R.globalAlpha < 1 ? ` opacity="${R.globalAlpha}"` : ''}${R._clip ? ` clip-path="url(#${R._clip})"` : ''}/>`); },
      stroke() { if (d) out.push(`<path d="${d}" fill="none" stroke="${R.strokeStyle}" stroke-width="${f(R.lineWidth)}" stroke-linejoin="${R.lineJoin}" stroke-linecap="${R.lineCap}"${R._clip ? ` clip-path="url(#${R._clip})"` : ''}/>`); },
      save() { sub.push({ clip: R._clip }); }, restore() { const s = sub.pop(); R._clip = s ? s.clip : null; },
      clip() { const id = 'c' + out.length + '_' + Math.floor(Math.random() * 1e6); out.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`); R._clip = id; },
      replay(p) { if (p && p._d) d = p._d; }, _clip: null,
      toSVG(bg) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n` + (bg ? `<rect width="100%" height="100%" fill="${bg}"/>\n` : '') + out.join('\n') + '\n</svg>'; } };
    return R; }
  // 기록기에서 Path2D 대용 (십자별): 명령을 문자열로 모은다
  if (typeof Path2D === 'undefined') { root.Path2D = function () { this._d = ''; }; }
  const P2 = root.Path2D && root.Path2D.prototype; if (P2 && !P2._nuoPatched) { P2._nuoPatched = true; const f = v => (+v).toFixed(1); for (const [k, fn] of [['moveTo', (x, y) => `M${f(x)} ${f(y)}`], ['lineTo', (x, y) => `L${f(x)} ${f(y)}`], ['quadraticCurveTo', (a, b, x, y) => `Q${f(a)} ${f(b)} ${f(x)} ${f(y)}`], ['closePath', () => 'Z']]) { const orig = P2[k]; P2[k] = function (...a) { this._d = (this._d || '') + fn(...a); return orig ? orig.apply(this, a) : undefined; }; } }

  root.NUO = { kinds: Object.keys(K), LIFE_MODE, life, skPop, balloon,
    /** o.t(지난 시간)·o.life(수명)가 있으면 생애를 적용해 그린다. 반환: 그렸으면 true */
    draw(ctx, kind, o) { const fn = K[kind]; if (!fn) throw new Error('모르는 모양: ' + kind); let q = o;
      if (o.t != null && o.life != null) { const L = life(kind, o.t, o.life, o.pop, o.phase); if (!L.alive || L.s <= 0.01) return false; q = Object.assign({}, o, { r: o.r * L.s, flash: L.flash, cut: L.cut, grow: L.grow });
        if (o.len != null) q.len = o.len * L.s; if (o.w != null) q.w = o.w * L.s;
        if (L.bx !== 1 || L.by !== 1) { ctx.save(); ctx.translate(o.x, o.y); ctx.scale(L.bx, L.by); ctx.translate(-o.x, -o.y); fn(ctx, q); ctx.restore(); return true; } }
      ctx.save(); fn(ctx, q); ctx.restore(); return true; }, K, h, nz, trio, mixc, shadeH, svgRecorder,
    KO: { burstStar: '터지는 별', bolt: '번개 갈래', rayFan: '뻗는 광선', star5: '오각별', glint: '작은 반짝이', crossStar: '십자별', drop: '방울·구슬', jelly: '젤리 덩어리', heart: '하트 방울', inkSplat: '잉크 튀김', paintStreak: '페인트 줄', band: '쓸린 띠', needle: '침·집중선', spiky: '가시 별', zig: '꺾인 가시', cloud: '거품 구름', puff: '뭉게 윤곽', wave: '물결 띠', wedge: '방사 쐐기', ring: '고리·거품막' } };
})(typeof window !== 'undefined' ? window : globalThis);
