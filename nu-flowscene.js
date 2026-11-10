/* NU FLOWSCENE — 그림에서 배운 장면 레시피로 살아 움직이는 배경을 만든다
   장면 = 바탕색 + 액체 무리(색마다 하나, 녹아 붙는 덩어리 NUL) + 장식(별·반짝이 등 NUO)
   액체 무리 = 화면을 가로지르는 흐름 띠(강) 몇 줄. 띠는 원 알갱이들이 곡선을 따라 흘러가며 만든다: 굵기가 출렁여 혹이 생기고, 끝으로 갈수록 가늘어져 꼬리 방울로 끊어진다.
   알갱이마다 속도가 조금씩 달라 늘어나고 끊어지고 다시 붙는다. 띠 둘레에는 방울이 흩어져 떠다닌다.
   필요: nu-objects.js(NUO), nu-liquid.js(NUL) */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const shade = (h, k) => { const c = hx(h); return toHex(c.map(x => k < 0 ? x * (1 + k) : x + (255 - x) * k)); };
  const lum = h => { const [r, g, b] = hx(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const sat = h => { const c = hx(h).map(v => v / 255), mx = Math.max(...c), mn = Math.min(...c); return mx ? (mx - mn) / mx : 0; };
  const hue = h => { const [r, g, b] = hx(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; let H = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (H * 60 + 360) % 360; };
  // 1차원 부드러운 잡음
  function nz(seed, x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), h = k => { let v = Math.imul(seed ^ Math.imul(k, 0x9E3779B1), 0x85EBCA77); v ^= v >>> 13; v = Math.imul(v, 0xC2B2AE35); v ^= v >>> 16; return (v >>> 0) / 4294967296 * 2 - 1; }; return h(i) * (1 - u) + h(i + 1) * u; }

  /** 액체 색 하나에서 그리는 색 다섯 벌과 성질(광택·얼룩)을 정한다 — 그림에서 본 규칙 */
  function liquidLook(c, ground, opt) {
    const L = lum(c), S = sat(c), H = hue(c), light = L > 205 && S < 0.18;
    const look = { base: c, core: shade(c, -0.24), hi: mix(c, '#ffffff', 0.62), spot: mix(c, '#ffffff', 0.32), line: null, gloss: false, spots: false, shade: 0.6 };
    if (light) { look.line = shade(ground, lum(ground) > 160 ? -0.22 : 0.35); look.core = shade(c, -0.07); look.shade = 0.35; }   // 흰 우유: 바탕 계열 진한 테두리 (노란 바탕 위 흰 액체엔 진노랑 테두리)
    else look.line = shade(c, -0.48);
    if (!light && S > 0.4 && (H < 25 || H > 300) && L > 60) look.gloss = true;           // 분홍·빨강 핏방울: 하이라이트 구슬
    else if (!light && L < 150) look.spots = true;                                       // 보라·남색 같은 어두운 액체: 안쪽 밝은 얼룩
    if (opt && opt.flat) { look.gloss = false; look.shade = 0; }
    return look; }

  /** 레시피(그림 하나에서 뽑은 값)로 장면을 만든다. W=1, H=aspect(세로/가로) 정규 좌표 */
  function create(recipe, seed, o) {
    o = Object.assign({ aspect: 1.25, density: 1, thick: 1, deco: 1, speed: 1, lumps: 1, breakup: 1, deco_kinds: null }, o || {});
    const R = mulberry32(seed * 2654435761 >>> 0), rr = (a, b) => a + (b - a) * R(), rg = () => { const u = 1 - R(), v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
    const S = { recipe, seed, o, R, rr, rg, W: 1, H: o.aspect, ground: recipe.ground, groups: [], deco: [], t: 0, decoClock: 0 };
    const longSide = Math.max(1, o.aspect);
    const pickW = (arr, n) => { const s = arr.reduce((a, b) => a + b, 0) || 1; let t = R() * s; for (let i = 0; i < arr.length; i++) { t -= arr[i]; if (t <= 0) return (i + R()) / n; } return R(); };
    recipe.L.forEach((L, gi) => {
      const look = liquidLook(L.c, recipe.ground, o), thick = Math.max(0.02, Math.min(0.16, L.th * 1.9)) * longSide * o.thick;
      const coh = L.coh || 0, grain = (L.g || 0) * Math.PI / 180, cover = L.cov * o.density;
      const nStreams = Math.max(1, Math.min(6, Math.round(cover / (thick * 0.75 / longSide))));
      const baseAng = grain + S.rg() * 0.1, par = coh > 0.55;   // 결이 고르면 나란한 띠들
      const G = { look, streams: [], drops: [], z: gi, thick };
      for (let s = 0; s < nStreams; s++) {
        const ang = par ? baseAng + rg() * 0.12 : grain + rg() * (1 - coh) * 1.1, len = rr(0.45, 1.05) * longSide;
        let cx = L.cx ? pickW(L.cx, 5) : R(), cy = (L.ry ? pickW(L.ry, 5) : R()) * S.H;
        if (par) { const k = (s + 0.5) / nStreams - 0.5 + rg() * 0.06, nx0 = -Math.sin(baseAng), ny0 = Math.cos(baseAng); cx = 0.5 + nx0 * k * 1.1 * longSide + rg() * 0.1; cy = S.H / 2 + ny0 * k * 1.1 * longSide + rg() * 0.1; }
        const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx, bend = (rr(0.1, 0.25) + (1 - coh) * 0.3) * (R() < 0.5 ? -1 : 1) * len;
        const P = [[cx - dx * len / 2, cy - dy * len / 2], [cx - dx * len / 6 + nx * bend, cy - dy * len / 6 + ny * bend], [cx + dx * len / 6 - nx * bend * rr(0.2, 1.2), cy + dy * len / 6 - ny * bend * rr(0.2, 1.2)], [cx + dx * len / 2, cy + dy * len / 2]];
        const w = thick * rr(0.6, 1.4), n = Math.max(8, Math.round(len / (w * 0.26))), sd = Math.floor(R() * 1e9);
        const st = { P, w, len, sd, speed: rr(0.02, 0.05) * (R() < 0.5 ? 1 : -1), parts: [] };
        for (let i = 0; i < n; i++) st.parts.push({ u: i / n * 1.3 - 0.15, k: rr(0.9, 1.1), off: rg() * 0.08, ph: R() * 100, spot: look.spots && R() < 0.22 });
        G.streams.push(st); }
      const nd = Math.round(Math.min(90, (L.d || 6) * 1.5 + 6) * o.density), dr = L.dr || [0.006, 0.012, 0.025];
      for (let i = 0; i < nd; i++) G.drops.push(newDrop(S, G, dr, true));
      S.groups.push(G); });
    S.groups.sort((a, b) => b.thick - a.thick);   // 굵은 액체를 먼저(뒤에) — 그림에서도 넓은 띠가 바닥에 깔린다
    S.decoCols = (recipe.stars && recipe.stars.length ? recipe.stars : []).concat(['#FAD805', '#FFFFFF']);
    for (let i = 0; i < Math.round(14 * o.deco); i++) spawnDeco(S, true);
    return S; }
  function bez(P, u) { const v = 1 - u; return [v * v * v * P[0][0] + 3 * v * v * u * P[1][0] + 3 * v * u * u * P[2][0] + u * u * u * P[3][0], v * v * v * P[0][1] + 3 * v * v * u * P[1][1] + 3 * v * u * u * P[2][1] + u * u * u * P[3][1]]; }
  function bezT(P, u) { const a = bez(P, Math.max(0, u - 0.01)), b = bez(P, Math.min(1, u + 0.01)), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; }
  function newDrop(S, G, dr, initial) { const { R, rr, rg } = S; const st = G.streams[Math.floor(R() * G.streams.length)], u = R(), p = bez(st.P, Math.min(1, Math.max(0, u))), t = bezT(st.P, u), side = R() < 0.5 ? -1 : 1, dist = st.w * (0.7 + Math.abs(rg()) * 2.2);
    const q = R(), r = q < 0.5 ? dr[0] + (dr[1] - dr[0]) * q * 2 : dr[1] + (dr[2] - dr[1]) * (q - 0.5) * 2;
    const big = R() < 0.1 ? rr(2, 3.5) : 1; return { x: p[0] - t[1] * dist * side, y: p[1] + t[0] * dist * side, r: r * 1.5 * big * Math.max(1, S.H) * rr(0.75, 1.25), vx: t[0] * st.speed * rr(0.3, 0.8), vy: t[1] * st.speed * rr(0.3, 0.8), born: initial ? S.t - rr(0, 6) : S.t, life: rr(6, 16), ph: R() * 100 }; }
  const DECO_DEF = [['star5', 3], ['glint', 4], ['crossStar', 2], ['burstStar', 1.2]];
  function spawnDeco(S, initial) { const { R, rr, rg } = S; if (!S.groups.length) return; const G = S.groups[Math.floor(R() * S.groups.length)], st = G.streams[Math.floor(R() * G.streams.length)];
    const ks = (S.o.deco_kinds || DECO_DEF).filter(k => k[1] > 0); let tot = ks.reduce((a, k) => a + k[1], 0) * R(), kind = ks[0][0]; for (const [k, w] of ks) { tot -= w; if (tot <= 0) { kind = k; break; } }
    const u = R(), p = bez(st.P, u), t = bezT(st.P, u), side = R() < 0.5 ? -1 : 1, dist = st.w * (0.6 + Math.abs(rg()) * 1.8);   // 띠 가장자리를 따라
    const big = R() < 0.18, r = (big ? rr(0.06, 0.13) : Math.pow(10, -1.6 + 0.3 * rg())) * Math.max(1, S.H);
    const cols = S.decoCols, col = cols[Math.floor(R() * Math.min(cols.length, 3))];
    S.deco.push({ kind, x: p[0] - t[1] * dist * side, y: p[1] + t[0] * dist * side, r, rot: rr(-0.4, 0.4), seed: Math.floor(R() * 1e6), col, born: initial ? S.t - rr(0, 4) : S.t, life: kind === 'glint' || kind === 'burstStar' ? rr(1.2, 3) : rr(5, 12), vx: t[0] * st.speed * 0.4, vy: t[1] * st.speed * 0.4, ph: R() }); }
  function step(S, dt) { const o = S.o; S.t += dt;
    for (const G of S.groups) {
      for (const st of G.streams) for (const p of st.parts) { p.u += st.speed * dt * p.k / Math.max(0.3, st.len); if (p.u > 1.15) p.u -= 1.3; if (p.u < -0.15) p.u += 1.3; }
      for (let i = 0; i < G.drops.length; i++) { const d = G.drops[i]; d.x += d.vx * dt; d.y += d.vy * dt; if (S.t - d.born > d.life || d.x < -0.2 || d.x > 1.2 || d.y < -0.2 || d.y > S.H + 0.2) G.drops[i] = newDrop(S, G, (S.recipe.L[0] && S.recipe.L[0].dr) || [0.006, 0.012, 0.025], false); } }
    for (const d of S.deco) { d.x += d.vx * dt; d.y += d.vy * dt; }
    S.deco = S.deco.filter(d => S.t - d.born < d.life);
    S.decoClock += dt * 14 * o.deco / 8; while (S.decoClock > 1) { S.decoClock -= 1; spawnDeco(S, false); } }
  /** 무리 하나의 원 알갱이들 (px) */
  function circlesOf(S, G, Wpx) { const o = S.o, out = [], spots = [], t = S.t;
    for (const st of G.streams) { for (const p of st.parts) { const u = p.u; if (u < -0.12 || u > 1.12) continue;
        const uc = Math.max(0, Math.min(1, u)), c = bez(st.P, uc), tg = bezT(st.P, uc), tail = Math.min(1, Math.max(0, Math.abs(u - 0.5) * 2 - 0.62) / 0.38);   // 0: 몸통, 1: 끝
        const lump = Math.max(0.25, 1 + 0.55 * o.lumps * nz(st.sd, u * 4.5 - t * 0.3) + 0.22 * o.lumps * nz(st.sd + 9, u * 13 + t * 0.5));
        let r = st.w * 0.5 * lump * (1 - 0.8 * tail * tail) * (0.92 + 0.08 * Math.sin(t * 1.3 + p.ph));
        const wob = p.off + 0.22 * nz(st.sd + 3, u * 3 + t * 0.3) + o.breakup * tail * 1.4 * nz(Math.floor(p.ph * 1000), t * 0.4 + p.ph);   // 끝으로 갈수록 옆으로 흩어져 꼬리 방울이 떨어져 나간다
        const x = c[0] - tg[1] * wob * st.w, y = c[1] + tg[0] * wob * st.w;
        if (tail > 0.6 && ((p.ph * 7) % 1) < 0.45 * o.breakup) r *= 0.35;   // 끝 쪽 일부 알갱이는 작게 → 구슬처럼 끊긴다
        if (r > 0.0008) { out.push({ x: x * Wpx, y: y * Wpx, r: r * Wpx }); if (p.spot && r > st.w * 0.25) spots.push({ x: (x + tg[1] * st.w * 0.12) * Wpx, y: (y - tg[0] * st.w * 0.12) * Wpx, r: r * 0.42 * Wpx }); } } }
    for (const d of G.drops) { const age = t - d.born; if (age < 0) continue; const bl = NUO.balloon(age, d.life, 1); const s = (bl[0] + bl[1]) / 2; if (s <= 0.02) continue; out.push({ x: d.x * Wpx, y: d.y * Wpx, r: d.r * s * Wpx }); }
    return { circles: out, spots }; }
  function render(ctx, S, Wpx, opt) { opt = opt || {}; const Hpx = Math.round(Wpx * S.H), cell = opt.cell || Math.max(2, Math.round(Wpx / 200));
    ctx.fillStyle = S.ground; ctx.fillRect(0, 0, Wpx, Hpx);
    const lw = (opt.lineW == null ? 2.6 : opt.lineW) * Wpx / 1200, light = opt.light == null ? -135 : opt.light;
    for (const G of S.groups) { const { circles, spots } = circlesOf(S, G, Wpx), lk = G.look;
      NUL.render(ctx, Wpx, Hpx, { circles, spots: lk.spots ? spots : [], col: lk, light, lineW: lw, shade: opt.shade === false ? 0 : lk.shade, gloss: opt.gloss === false ? false : lk.gloss, cell }); }
    for (const d of S.deco) { const age = S.t - d.born; if (age < 0) continue; const c = NUO.trio(d.col, lum(d.col) > 200 && sat(d.col) < 0.2 ? shade(S.ground, -0.3) : shade(d.col, -0.4), lum(d.col) > 200 ? '#ffffff' : null);
      NUO.draw(ctx, d.kind, { x: d.x * Wpx, y: d.y * Wpx, r: d.r * Wpx, rot: d.rot, seed: d.seed, col: c, light, line: lw, t: age, life: d.life, pop: 1, phase: d.ph, vary: 0.8, jag: 0.6, gloss: opt.gloss !== false }); } }
  root.NUFS = { create, step, render, liquidLook, mix, shade, lum, sat };
})(typeof window !== 'undefined' ? window : globalThis);
