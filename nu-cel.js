/* NU CEL — 뉴 플로우(nu-flow.html)의 '별 방울' 그리기를 따로 떼어 낸 모듈.
   뉴 플로우와 같은 순서·같은 식:
   ① 틀(mold): 오각별 다각형의 거리값 → 격자에 굽기 (starG · mkMold · moldPoly 그대로, 윤성이 저장한 값 msN 5 · msRi .62 · msInf .07)
   ② 부풀리기(inflate): 틀 안에서 ∇²Z = -S 를 풀어 풍선 같은 높낮이 → HT = √Z
   ③ 빛(light): 왼쪽 위 빛 + 안에서 흐르는 물결 무늬로 어두운 면(SD)·큰 하이라이트(SH)·곁 하이라이트·되비침(S2)
   ④ 알갱이(splat2): 틀 안에 알갱이(간격 9.2)를 깔고, 각 알갱이가 그 자리 빛 값을 받아 반지름 17로 번져 뭉친다 → 등고선
   ⑤ 그리기(drawDepth): 굵은 테두리 → 바탕 → 어두운 면 → 하이라이트 (색: 바탕 #FAD805 · 그늘 #EDA40E · 하이라이트 #FFF6AE · 선 #C57718)
   단위: 뉴 플로우 세계 단위(별 바깥 반지름 ≈ 110)로 계산하고, 그릴 때 o.r 에 맞춰 줄인다.
   NUO.draw(ctx, 'nfStar', { x, y, r, rot, seed, t, life?, light?(도), col?:{base,core,hi,line}, jelly?(0~1) }) */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, HY = Math.hypot;
  const MG = 112, MB = 1.7, MC = 2 * MB / MG;
  // ── ① 틀: nu-flow.html 그대로 ──
  function redist(F, L) { const P = []; for (let y = 0; y < MG; y++) for (let x = 0; x < MG; x++) { const i = y * MG + x, a = F[i] - L; if (x < MG - 1) { const b = F[i + 1] - L; if ((a < 0) !== (b < 0)) P.push(x + a / (a - b), y); } if (y < MG - 1) { const b = F[i + MG] - L; if ((a < 0) !== (b < 0)) P.push(x, y + a / (a - b)); } }
    const np = P.length, O = new Float32Array(MG * MG); if (!np) { for (let i = 0; i < O.length; i++) O[i] = F[i] - L; return O; }
    for (let y = 0; y < MG; y++) for (let x = 0; x < MG; x++) { let m = 1e9; for (let k = 0; k < np; k += 2) { const dx = P[k] - x, dy = P[k + 1] - y, d = dx * dx + dy * dy; if (d < m) m = d; } const i = y * MG + x; O[i] = Math.sqrt(m) * MC * (F[i] < L ? -1 : 1); } return O; }
  function sdPoly(pts, x, y) { const n = pts.length / 2; let d = 1e9, s = 1; for (let i = 0, j = n - 1; i < n; j = i++) { const ax = pts[2 * i], ay = pts[2 * i + 1], ex = pts[2 * j] - ax, ey = pts[2 * j + 1] - ay, wx = x - ax, wy = y - ay, h = Math.min(Math.max((wx * ex + wy * ey) / (ex * ex + ey * ey), 0), 1), qx = wx - ex * h, qy = wy - ey * h; d = Math.min(d, qx * qx + qy * qy); const c1 = y >= ay, c2 = y < ay + ey, c3 = ex * wy > ey * wx; if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s; } return s * Math.sqrt(d); }
  function tsamp(T, x, y) { const px = (x + MB) / MC, py = (y + MB) / MC, cx = px < 0 ? 0 : px > MG - 1.001 ? MG - 1.001 : px, cy = py < 0 ? 0 : py > MG - 1.001 ? MG - 1.001 : py, ix = cx | 0, iy = cy | 0, fx = cx - ix, fy = cy - iy, k = iy * MG + ix;
    return (T[k] * (1 - fx) + T[k + 1] * fx) * (1 - fy) + (T[k + MG] * (1 - fx) + T[k + MG + 1] * fx) * fy + HY(px - cx, py - cy) * MC; }
  function mkMold(g, close, open) { let F = new Float32Array(MG * MG); for (let y = 0; y < MG; y++) for (let x = 0; x < MG; x++) F[y * MG + x] = g(-MB + x * MC, -MB + y * MC); F = redist(F, 0);
    if (close > .004) { F = redist(redist(F, close), -close); } else if (close < -.004) { const C = redist(redist(F, -.1), .1), k = -close * 5; for (let i = 0; i < F.length; i++) F[i] += k * (F[i] - C[i]); F = redist(F, 0); }
    if (open > .004) { F = redist(redist(F, -open), open); } else if (open < -.004) { const O = redist(redist(F, .1), -.1), k = -open * 5; for (let i = 0; i < F.length; i++) F[i] -= k * (O[i] - F[i]); F = redist(F, 0); }
    let n = 0, cy = 0; for (let y = 0; y < MG; y++) for (let x = 0; x < MG; x++) if (F[y * MG + x] < 0) { n++; cy += -MB + y * MC; } const T = F; return { f: (x, y) => tsamp(T, x, y), area: Math.max(n, 1) * MC * MC, cy: n ? cy / n : 0, T }; }
  function starG(S) { const n = Math.round(S.msN), ri = S.msRi, w = S.msW, k = 1 / Math.max(1, w), t = S.msTilt * Math.PI / 180, P = []; for (let i = 0; i < 2 * n; i++) { const a = Math.PI / 2 + i * Math.PI / n, rr = i & 1 ? ri : 1; P.push(Math.cos(a) * rr * w * k, Math.sin(a) * rr * k); }
    const c = Math.cos(t), s = Math.sin(t); return (x, y) => sdPoly(P, x * c + y * s, -x * s + y * c) - S.msInf; }
  function moldPoly(MD) { const n = 360, P = new Float32Array(2 * n), Rm = MB * 1.2, TT = MD.T; for (let k = 0; k < n; k++) { const a = k / n * TAU, ca = Math.cos(a), sa = Math.sin(a); let lo = 0, hi = 0; for (let r = MC * .5; r < Rm; r += MC * .5) if (tsamp(TT, ca * r, MD.cy + sa * r) < 0) hi = r; lo = hi; let h2 = hi + MC * .5; for (let it = 0; it < 10; it++) { const m = (lo + h2) / 2; if (tsamp(TT, ca * m, MD.cy + sa * m) < 0) lo = m; else h2 = m; } P[2 * k] = ca * lo; P[2 * k + 1] = MD.cy + sa * lo; } return P; }
  /** 윤성이 뉴 플로우에 저장해 둔 별 모양 값 (swirl-flow-bd) */
  const STAR_SAVED = { msN: 5, msRi: 0.62, msInf: 0.07, msTip: 0, msIn: 0, msW: 1, msTilt: 0 };
  const CY = { base: '#FAD805', core: '#EDA40E', hi: '#FFF6AE', line: '#C57718' };
  // ── 공통: 세계 단위 ──
  const CELL = 4, SP0 = 9.2, RKS = 17, TH = .8, WR = 110;   // WR: 별 바깥 반지름(세계 단위)
  const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const nz = (x, y, t, k) => k ? .5 + .25 * (Math.sin(x * .052 + t * .5 + 1.7 * Math.sin(y * .041 - t * .23)) + Math.sin(y * .047 - t * .41 + 1.3 * Math.sin(x * .036 + t * .19) + 2.1))
    : .5 + .25 * (Math.sin(x * .083 - t * .33 + 1.5 * Math.sin(y * .067 + t * .27) + .7) + Math.sin(y * .079 + t * .37 + 1.4 * Math.sin(x * .058 - t * .21)));
  const hh = (k, j) => { let x = Math.sin(k * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };
  // ── ②: 틀 하나에 한 번만 (모든 별 방울이 같은 틀을 쓴다 — 뉴 플로우도 같다) ──
  const CACHE = new Map();
  function prep(shape) { const key = JSON.stringify(shape); let P = CACHE.get(key); if (P) return P;
    const MD = mkMold(starG(shape), shape.msIn, shape.msTip), poly = moldPoly(MD), s = WR / (1 + shape.msInf);   // 틀 1 = 세계 s
    // 지역 좌표(세계 단위, 위가 −y): u = s·x, v = s·(cy − y)
    const pts = new Float32Array(poly.length); for (let i = 0; i < poly.length; i += 2) { pts[i] = s * poly[i]; pts[i + 1] = s * (MD.cy - poly[i + 1]); }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
    const ox = Math.floor(x0 / CELL - 4) * CELL, oy = Math.floor(y0 / CELL - 4) * CELL, gw = Math.ceil((x1 - ox) / CELL) + 5, gh = Math.ceil((y1 - oy) / CELL) + 5, n = gw * gh;
    const D = new Float32Array(n);   // 테두리까지 깊이 (세계 단위, 안쪽 +)
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const u = ox + i * CELL, v = oy + j * CELL; D[j * gw + i] = -MD.f(u / s, MD.cy - v / s) * s; }
    // 알갱이 밀도 흉내: 테두리에서 TH, 안쪽 RK(21) 만큼 들어가면 꽉 참
    const Fd = new Float32Array(n); for (let k = 0; k < n; k++) Fd[k] = D[k] > 0 ? TH + 3.3 * sm(D[k] / 22) : 0;
    const Z = new Float32Array(n), AB = new Float32Array(n), S = 4 * CELL * CELL, OM = 1.72; for (let k = 0; k < n; k++) { const e = (Fd[k] - TH) / 1.7; AB[k] = Fd[k] > TH ? (e < 1 ? (1 - e) * 1.4 : 0) : 0; }
    for (let it = 0; it < 260; it++) { for (let y = 1; y < gh - 1; y++) for (let x = 1, k = y * gw + 1; x < gw - 1; x++, k++) if (Fd[k] > TH) Z[k] += OM * ((Z[k - 1] + Z[k + 1] + Z[k - gw] + Z[k + gw] + S) / (4 + AB[k]) - Z[k]);
      for (let y = gh - 2; y >= 1; y--) for (let x = gw - 2, k = y * gw + x; x >= 1; x--, k--) if (Fd[k] > TH) Z[k] += OM * ((Z[k - 1] + Z[k + 1] + Z[k - gw] + Z[k + gw] + S) / (4 + AB[k]) - Z[k]); }
    const HT = new Float32Array(n); for (let k = 0; k < n; k++) HT[k] = Z[k] > 0 ? Math.sqrt(Z[k]) : 0;
    // 알갱이 자리: 육각 격자 (간격 SP0), 틀 안쪽만
    const parts = []; for (let j = 0, v = y0 - SP0; v < y1 + SP0; j++, v += SP0 * .866) for (let u = x0 - SP0 + (j & 1 ? SP0 / 2 : 0); u < x1 + SP0; u += SP0) { if (-MD.f(u / s, MD.cy - v / s) * s > 1.5) parts.push(u, v); }
    P = { pts, ox, oy, gw, gh, Fd, HT, parts: Float32Array.from(parts), SD: new Float32Array(n), SH: new Float32Array(n), S2: new Float32Array(n), area: MD.area * s * s };
    CACHE.set(key, P); return P; }
  // ── 덩이마다 빛을 받는 성격 (styleLobe 그대로) ──
  function lobeStyle(k) { const az = (hh(k, 41) - .5) * .9, a2 = az + (hh(k, 44) < .5 ? -1 : 1) * (.85 + .6 * hh(k, 45));
    return { LAC: Math.cos(az), LAS: Math.sin(az), LEL: .42 + .42 * hh(k, 42), LSZ: .33 + .17 * hh(k, 43), L2C: Math.cos(a2), L2S: Math.sin(a2), L2Z: hh(k, 46) < .8 ? .2 + .1 * hh(k, 47) : 0, L3Z: hh(k, 48) < .75 ? .15 + .07 * hh(k, 49) : 0, L3A: (hh(k, 53) - .5) * .9 }; }
  // ── ③ 빛 (light 그대로, 덩이 사이 골·늘어남·작은 덩이 보정은 별 하나라 0) ──
  function light(P, st, la, tt, seedOff) { const { gw, gh, Fd, HT, SD, SH, S2 } = P, d = 1, tn = tt * d, LX = Math.cos(la), LY = Math.sin(la), i2 = 1 / (2 * CELL), LZ = .74, LXY = Math.sqrt(1 - LZ * LZ), gx0 = LX * LXY, gy0 = LY * LXY;
    for (let y = 1; y < gh - 1; y++) for (let x = 1, k = y * gw + 1; x < gw - 1; x++, k++) { const f = Fd[k]; if (f <= TH) { SD[k] = -1.2; SH[k] = -1; S2[k] = -1; continue; }
      let nx = -(HT[k + 1] - HT[k - 1]) * i2, ny = -(HT[k + gw] - HT[k - gw]) * i2; const il = 1 / Math.sqrt(nx * nx + ny * ny + 1); nx *= il; ny *= il; const nzz = il;
      const wx = P.ox + x * CELL + seedOff, wy = P.oy + y * CELL + seedOff * .7, ac = 1, ah = 1;
      const rw = 13 * Math.pow(nz(wx * 1.2 + tn * 6, wy * 1.2 - tn * 4, tn * .8, 1), 2) - 1.4, fl = nz(wx + 13 * Math.sin(wy * .05 + tn * .9), wy + 13 * Math.cos(wx * .05 - tn * .8), tn * 1.4, 0), w2 = nz(wx, wy, tn, 1);
      SD[k] = (.6 + (ac - 1) * .3 + .3 * (fl - .5) - (nx * gx0 + ny * gy0 + nzz * LZ)) * 2.4 - (rw > .3 ? 2.4 * (1 - sm((f - TH) * 4.3 / rw)) : 0);
      let s = -1, t2 = -1; const lz = st.LEL, lq = Math.sqrt(1 - lz * lz), ux = LX * st.LAC - LY * st.LAS, uy = LX * st.LAS + LY * st.LAC;
      const br = 1 + .07 * d * Math.sin(tt * 1.7 + seedOff), wob = .03 * (w2 - .5), nl = Math.sqrt(nx * nx + ny * ny), fc = nl > 1e-4 ? (nx * ux + ny * uy) / nl : 0, sml = sm((20 - HT[k]) / 9), zhi = .8 + .07 * lz + .08 * sml, zlo = zhi - (.2 + .34 * st.LSZ + .22 * sml) * Math.min(ah, 1.8) * br;
      s = (sm((nzz - zlo) / .09 + .5) * (1 - sm((nzz - zhi) / .09 + .5)) * sm((fc - (.98 - 1.3 * st.LSZ)) / .3 + .5) - .5 + wob * 2) * 1.1;
      if (st.L2Z > 0) { const c2 = st.L2C, s2c = st.L2S, fx = (LX * c2 - LY * s2c) * .62, fy = (LX * s2c + LY * c2) * .62, a2 = Math.min(st.L2Z * ah * br, .8), v = (nx * fx + ny * fy + nzz * 1.785) * .5294 - Math.cos(a2) + wob * a2; if (v > t2) t2 = v;
        const kd = st.LAC * c2 + st.LAS * s2c, mc = 2 * kd * st.LAC - c2, ms = 2 * kd * st.LAS - s2c, gx = (LX * mc - LY * ms) * .66, gy = (LX * ms + LY * mc) * .66, a4 = Math.min(st.L2Z * .72 * ah * br, .6), w = (nx * gx + ny * gy + nzz * 1.751) * .5343 - Math.cos(a4) + wob * a4; if (w > t2) t2 = w; }
      if (st.L3Z > 0) { const c = Math.cos(st.L3A), sn = Math.sin(st.L3A), bx = -(ux * c - uy * sn) * .954, by = -(ux * sn + uy * c) * .954, a3 = Math.min(st.L3Z * ah * (2 - br), .5), v = (nx * bx + ny * by + nzz * 1.3) * .6202 - Math.cos(a3) + wob * a3 * .6; if (v > t2) t2 = v; }
      SH[k] = s; S2[k] = t2 * 14; } }
  function samp(A, P, x, y) { const fx = (x - P.ox) / CELL, fy = (y - P.oy) / CELL, i = Math.max(0, Math.min(P.gw - 2, Math.floor(fx))), j = Math.max(0, Math.min(P.gh - 2, Math.floor(fy))), u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fy - j)), k = j * P.gw + i;
    return (A[k] * (1 - u) + A[k + 1] * u) * (1 - v) + (A[k + P.gw] * (1 - u) + A[k + P.gw + 1] * u) * v; }
  // ── ④ 알갱이가 빛 값을 받아 번진다 → 등고선 (splat2 · march 그대로) ──
  function layers(P, flow) { const { gw, gh, ox, oy } = P, FC = [], FL = [], FM = [], pr = P.parts;
    for (let i = 0; i < pr.length; i += 2) { let x = pr[i], y = pr[i + 1]; if (flow) { x += flow[0](x, y); y += flow[1](x, y); }
      const wc = sm(samp(P.SD, P, x, y) * 1.1 + .5), w = sm(samp(P.SH, P, x, y) * 2.2 + .5), w2 = sm(samp(P.S2, P, x, y) * 2.2 + .5), hx = x, hy = y;
      if (wc > .02) FC.push({ x, y, r: RKS / 2, w: wc }); if (w > .02) FL.push({ x: hx, y: hy, r: RKS / 2, w }); if (w2 > .02) FM.push({ x: hx, y: hy, r: RKS / 2, w: w2 }); }
    const N = root.NUL, f = A => N.fieldOf(A, gw, gh, CELL, ox, oy);
    return { core: N.contours(f(FC), gw, gh, CELL, ox, oy, TH), hl: N.contours(f(FL), gw, gh, CELL, ox, oy, 1.4), h2: N.contours(f(FM), gw, gh, CELL, ox, oy, 1.5) }; }
  const areaOf = L => { let a = 0; for (let i = 0; i < L.length; i++) { const p = L[i], q = L[(i + 1) % L.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); };
  // ── ⑤ 그리기 ──
  function draw(ctx, o) { const shape = o.shape || STAR_SAVED, P = prep(shape), col = o.col && o.col.base ? o.col : CY, tt = o.time != null ? o.time : (o.t || 0), seed = o.seed || 1, st = lobeStyle(seed);
    const k = o.r / WR, rot = (o.rot || 0) + .08 * Math.sin(tt * .9 + seed), la = (o.light == null ? -135 : o.light) * Math.PI / 180 + .1 * Math.sin(tt * .43) + .04 * Math.sin(tt * 1.13 + 1) - rot;   // 빛은 별과 함께 돌지 않는다 → 지역 좌표로 돌려 넣는다
    const jl = o.jelly == null ? .55 : o.jelly, ja = hh(seed, 7) * TAU + tt * .3, jw = 1 + jl * .07 * Math.sin(tt * 2.1 + seed), jh = 1 / jw;   // 말랑하게 눌렸다 늘었다
    const ca = Math.cos(rot), sa = Math.sin(rot), cj = Math.cos(ja), sj = Math.sin(ja);
    const M = (u, v) => { const a = u * cj + v * sj, b = -u * sj + v * cj, A = a * jw, B = b * jh, uu = A * cj - B * sj, vv = A * sj + B * cj; return [o.x + (uu * ca - vv * sa) * k, o.y + (uu * sa + vv * ca) * k]; };
    light(P, st, la, tt, (seed % 97) * 37);
    const L = layers(P, o.flow);
    const body = () => { ctx.beginPath(); const n = P.pts.length / 2; for (let i = 0; i < n; i++) { const p = M(P.pts[2 * i], P.pts[2 * i + 1]); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } ctx.closePath(); };
    const loops = (LS, minA) => { ctx.beginPath(); for (const Lp of LS) { if (minA && areaOf(Lp) < minA) continue; const n = Lp.length, q = Lp.map(p => M(p[0], p[1])); ctx.moveTo((q[n - 1][0] + q[0][0]) / 2, (q[n - 1][1] + q[0][1]) / 2); for (let i = 0; i < n; i++) { const a = q[i], b = q[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } ctx.closePath(); } };
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const lw = (o.lineW == null ? 3.4 : o.lineW) * k; if (lw > 0) { body(); ctx.strokeStyle = col.line; ctx.lineWidth = 2 * lw; ctx.stroke(); }
    body(); ctx.fillStyle = col.base; ctx.fill(); ctx.save(); body(); ctx.clip();
    loops(L.core); ctx.fillStyle = col.core; ctx.fill('evenodd');
    loops(L.hl.concat(L.h2), 24 * CELL * CELL * .6); ctx.fillStyle = col.hi; ctx.fill('evenodd');
    ctx.restore(); ctx.restore(); return true; }
  root.NUCEL = { draw, prep, STAR_SAVED, CY, lobeStyle };
  if (root.NUO && root.NUO.register) root.NUO.register('nfStar', (ctx, o) => draw(ctx, o), 'balloon', '뉴 플로우 별 방울');
})(typeof window !== 'undefined' ? window : globalThis);
