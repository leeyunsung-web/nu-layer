/* nl-sync.js — NU-LAYER 도구들의 세부 설정을 어느 컴퓨터에서나 똑같이 쓰게 하는 동기화.
 *
 *  - 같은 사이트(origin)의 localStorage 값들을 GitHub 저장소의 `settings` 브랜치에 있는
 *    settings/settings.json 한 파일로 모은다. main이 아니라서 사이트를 다시 빌드하지 않는다.
 *  - 키마다 마지막으로 바뀐 시각을 기록해, 더 나중에 바뀐 쪽이 이긴다 (컴퓨터 여러 대·창 여러 개 안전).
 *  - 원본 파일·그리던 그림 자동저장·토큰처럼 컴퓨터마다 따로여야 하는 것은 보내지 않는다.
 *  - 깃허브 토큰이 저장된 브라우저(마스터 모드)에서만 동작한다.
 */
(function(){
  'use strict';
  if (window.nlSync) return;
  var LS; try { LS = window.localStorage; LS.getItem('x'); } catch (e) { return; }

  var META = 'nl_sync_meta_v1';
  var FILE = 'settings/settings.json';
  var BRANCH = 'settings';
  var MAXV = 400000;                 // 이보다 큰 값(그림·원본 데이터)은 컴퓨터마다 따로
  var PUSH_DELAY = 15000;            // 마지막 변경 뒤 15초에 한 번 올림
  var SCAN_MS = 4000;
  // 컴퓨터마다 따로 둘 것: 토큰·역할, 그리던 그림 자동저장, 원본 파일 기억, 동기화 자체 기록
  var SKIP = {
    'objet_studio_gh_config':1, 'toneplot_gh':1, 'nulayer_role':1,
    'nu_layer_autosave_v1':1, 'nu_layer_comp_autosave_v1':1, 'nu_layer_discarded_v1':1,
    'nulayer_archive_ver':1, 'sculptDotLast':1
  };
  function skipKey(k){ return !k || SKIP[k] || k.indexOf('nl_sync') === 0 || k.indexOf('__') === 0; }

  function hash(s){ var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36) + ':' + s.length; }
  function now(){ return Date.now(); }
  function loadMeta(){ try { return JSON.parse(LS.getItem(META) || '{}') || {}; } catch (e) { return {}; } }
  function saveMeta(m){ try { LS.setItem(META, JSON.stringify(m)); } catch (e) {} }

  function cfg(){
    var c = null;
    try { c = JSON.parse(LS.getItem('objet_studio_gh_config') || 'null'); } catch (e) {}
    if (!c || !c.token) return null;
    if (!c.owner || !c.repo){
      var h = location.hostname || '';
      if (!/\.github\.io$/i.test(h)) return null;
      var seg = location.pathname.split('/').filter(Boolean);
      c.owner = h.split('.')[0]; c.repo = seg.length ? seg[0] : c.owner + '.github.io';
    }
    return c;
  }

  // ---- GitHub API ----
  function api(c, path, opt){
    opt = opt || {};
    var h = { 'Authorization': 'token ' + c.token, 'Accept': opt.accept || 'application/vnd.github+json' };
    if (opt.body) h['Content-Type'] = 'application/json';
    return fetch('https://api.github.com/repos/' + c.owner + '/' + c.repo + path,
      { method: opt.method || 'GET', headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined, cache: 'no-store', keepalive: !!opt.keepalive });
  }
  function b64enc(str){ var b = new TextEncoder().encode(str), s = ''; for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
  function b64dec(b64){ var bin = atob(b64.replace(/\s/g, '')), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new TextDecoder().decode(u); }

  var branchOk = false;
  function ensureBranch(c){
    if (branchOk) return Promise.resolve();
    return api(c, '/git/ref/heads/' + BRANCH).then(function(r){
      if (r.ok){ branchOk = true; return; }
      if (r.status !== 404) throw new Error('branch ' + r.status);
      return api(c, '').then(function(r2){ return r2.json(); }).then(function(repo){
        var base = (repo && repo.default_branch) || 'main';
        return api(c, '/git/ref/heads/' + base).then(function(r3){ return r3.json(); });
      }).then(function(ref){
        return api(c, '/git/refs', { method: 'POST', body: { ref: 'refs/heads/' + BRANCH, sha: ref.object.sha } });
      }).then(function(r4){ if (!r4.ok && r4.status !== 422) throw new Error('create branch ' + r4.status); branchOk = true; });
    });
  }
  // 원격 파일: {sha, data:{v:1, keys:{k:{v:'...',t:123} | {d:1,t:123}}}}
  function getRemote(c){
    return ensureBranch(c).then(function(){
      return api(c, '/contents/' + FILE + '?ref=' + BRANCH + '&t=' + now());
    }).then(function(r){
      if (r.status === 404) return { sha: null, data: { v: 1, keys: {} } };
      if (!r.ok) throw new Error('get ' + r.status);
      return r.json().then(function(j){
        if (j.content) return { sha: j.sha, data: JSON.parse(b64dec(j.content)) };
        // 1MB가 넘으면 content가 비어서 온다 -> raw로 다시 받기
        return api(c, '/contents/' + FILE + '?ref=' + BRANCH + '&t=' + now(), { accept: 'application/vnd.github.raw' })
          .then(function(r2){ return r2.text(); }).then(function(t){ return { sha: j.sha, data: JSON.parse(t) }; });
      });
    });
  }
  function putRemote(c, sha, data, keepalive){
    var body = { message: 'settings sync', content: b64enc(JSON.stringify(data)), branch: BRANCH };
    if (sha) body.sha = sha;
    return api(c, '/contents/' + FILE, { method: 'PUT', body: body, keepalive: keepalive });
  }

  // ---- local scan ----
  function localKeys(){
    var out = {};
    for (var i = 0; i < LS.length; i++){
      var k = LS.key(i); if (skipKey(k)) continue;
      var v = LS.getItem(k); if (v == null || v.length > MAXV) continue;
      out[k] = v;
    }
    return out;
  }

  var state = { status: 'off', lastPull: 0, lastPush: 0, error: '' };
  var meta = loadMeta(), dirty = false, timer = 0, pushing = false;

  function scan(){
    var cur = localKeys(), t = now(), changed = false;
    for (var k in cur){
      var h = hash(cur[k]), m = meta[k];
      if (!m || m.d){ meta[k] = { h: h, t: t }; changed = true; }
      else if (m.h !== h){ m.h = h; m.t = t; changed = true; }
    }
    for (var k2 in meta){
      if (!(k2 in cur) && !meta[k2].d && !skipKey(k2)){
        var raw = LS.getItem(k2);
        if (raw == null){ meta[k2] = { d: 1, t: t }; changed = true; }   // 지워진 설정은 다른 컴퓨터에서도 지운다
      }
    }
    if (changed){ saveMeta(meta); dirty = true; schedule(); }
  }
  function schedule(){ clearTimeout(timer); timer = setTimeout(function(){ push(false); }, PUSH_DELAY); }

  function merge(remote){
    var keys = remote.keys || (remote.keys = {}), out = false;
    var cur = localKeys();
    for (var k in meta){
      if (skipKey(k)) continue;
      var m = meta[k], r = keys[k];
      if (m.d){ if (!r || (r.t || 0) < m.t){ keys[k] = { d: 1, t: m.t }; out = true; } continue; }
      if (!(k in cur)) continue;
      // 시각 0(처음 기록한 값)은 1로 올려 보낸다 -> 새 컴퓨터의 기본값(시각 0)보다 항상 앞선다
      if (!r || (r.t || 0) < m.t || (r.d && (r.t || 0) <= m.t)){ keys[k] = { v: cur[k], t: Math.max(1, m.t) }; out = true; }
    }
    return out;
  }

  function push(keepalive){
    var c = cfg(); if (!c || pushing) return Promise.resolve();
    pushing = true; dirty = false;
    var attempt = function(n){
      return getRemote(c).then(function(rem){
        if (!merge(rem.data)) return null;
        rem.data.v = 1; rem.data.updated = new Date().toISOString();
        return putRemote(c, rem.sha, rem.data, keepalive).then(function(r){
          if (r.status === 409 || r.status === 422){ if (n < 2) return attempt(n + 1); throw new Error('conflict'); }
          if (!r.ok) throw new Error('put ' + r.status);
          state.lastPush = now();
        });
      });
    };
    return attempt(0).then(function(){ state.status = 'ok'; state.error = ''; })
      .catch(function(e){ state.status = 'error'; state.error = String(e && e.message || e); dirty = true; schedule(); })
      .then(function(){ pushing = false; });
  }

  // 처음 열 때: 원격에서 더 나중에 바뀐 설정을 받아 적용 -> 도구가 다시 읽도록 한 번만 새로고침
  function pull(){
    var c = cfg(); if (!c){ state.status = 'off'; return Promise.resolve(false); }
    state.status = 'pulling';
    return getRemote(c).then(function(rem){
      state.lastPull = now();
      var keys = rem.data.keys || {}, applied = 0;
      for (var k in keys){
        if (skipKey(k)) continue;
        var r = keys[k], m = meta[k], lt = m ? (m.t || 0) : 0;
        if ((r.t || 0) <= lt) continue;
        try {
          var curV = LS.getItem(k);
          if (r.d){ if (curV != null){ LS.removeItem(k); applied++; } meta[k] = { d: 1, t: r.t }; }
          else { if (curV !== r.v){ LS.setItem(k, r.v); applied++; } meta[k] = { h: hash(r.v), t: r.t }; }
        } catch (e) {}
      }
      saveMeta(meta);
      state.status = 'ok';
      return applied > 0;
    }).catch(function(e){ state.status = 'error'; state.error = String(e && e.message || e); return false; });
  }

  // 처음 실행하는 컴퓨터: 지금 있는 값은 "시각 0"으로 기록 -> 원격에 같은 키가 있으면 원격이 이긴다
  function baseline(first){
    var cur = localKeys();
    for (var k in cur){
      var h = hash(cur[k]);
      if (!meta[k] || meta[k].d) meta[k] = { h: h, t: first ? 0 : now() };
      else if (meta[k].h !== h){ meta[k].h = h; meta[k].t = now(); }
    }
    saveMeta(meta);
  }

  function toast(msg){
    try {
      var d = document.createElement('div');
      d.textContent = msg;
      d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;background:#16181c;color:#fff;font:13px/1.4 system-ui,sans-serif;padding:9px 14px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:none';
      (document.body || document.documentElement).appendChild(d);
      setTimeout(function(){ d.remove(); }, 3200);
    } catch (e) {}
  }

  function start(){
    var c = cfg(); if (!c){ state.status = 'off'; return; }
    var firstRun = !Object.keys(meta).length;
    if (!firstRun) scan();                      // 지난번 동기화 이후 이 컴퓨터에서 바뀐 것
    pull().then(function(applied){
      if (applied){
        var flag = 'nl_sync_reloaded';
        var already = false; try { already = sessionStorage.getItem(flag) === '1'; } catch (e) {}
        if (!already){
          try { sessionStorage.setItem(flag, '1'); } catch (e) {}
          try { sessionStorage.setItem('nl_sync_toast', '1'); } catch (e) {}
          location.reload(); return;
        }
      }
      try { sessionStorage.removeItem('nl_sync_reloaded'); if (sessionStorage.getItem('nl_sync_toast') === '1'){ sessionStorage.removeItem('nl_sync_toast'); toast('다른 컴퓨터에서 바꾼 설정을 불러왔어요'); } } catch (e) {}
      baseline(firstRun);
      push(false);                                // 원격에 없는 설정은 올려 둔다
      setInterval(scan, SCAN_MS);
      window.addEventListener('storage', function(ev){ if (ev.key && !skipKey(ev.key)) scan(); });
      document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden'){ scan(); if (dirty) push(true); } });
      window.addEventListener('pagehide', function(){ scan(); if (dirty) push(true); });
    });
  }

  window.nlSync = {
    state: state,
    pushNow: function(){ scan(); return push(false); },
    pullNow: pull,
    _test: { hash: hash, merge: merge, skipKey: skipKey, meta: function(){ return meta; } }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
