// Core: canvas, resolution scaling, main loop, scene switching, transitions.
// Everything hangs off the global `G` namespace so the game runs from file://
// (double-click index.html) as well as inside Electron later.
(function () {
  'use strict';
  const G = (window.G = window.G || {});

  G.W = 1280;
  G.H = 720;
  G.time = 0;
  G.dt = 0;
  G.scene = null;
  G.FONT = "'Patrick Hand', 'Segoe Print', 'Comic Sans MS', cursive";

  G.COL = {
    paper: '#f3ede2',
    paperDark: '#e7dfd0',
    sheet: '#fffdf7',
    ink: '#2a2622',
    soft: '#7a7064',
    red: '#d2453a',
    blue: '#3d6fb6',
    calm: '#6fa3d0',
    gold: '#e0a526',
    green: '#4f9a5b',
    dark: '#1d1b19',
  };

  const U = (G.util = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    smooth(e0, e1, x) {
      const t = U.clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    },
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    inRect: (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
    fmtTime(s) {
      s = Math.max(0, Math.ceil(s));
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    },
    mixHex(a, b, t) {
      const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
      const ch = (p, s) => (p >> s) & 255;
      const m = (s) => Math.round(U.lerp(ch(pa, s), ch(pb, s), t));
      return `rgb(${m(16)},${m(8)},${m(0)})`;
    },
  });

  // Replace {you} {rival} {friend} {boss} {o1} {o2} with chapter names.
  G.fmt = function (s, ch) {
    return s.replace(/\{(\w+)\}/g, (m, k) => {
      if (k === 'boss') return ch.boss.name;
      return ch.cast[k] ? ch.cast[k].name : m;
    });
  };

  // ---- screen shake ----
  let shakeT = 0, shakeAmt = 0;
  G.shake = function (amt, dur) {
    shakeAmt = Math.max(shakeT > 0 ? shakeAmt : 0, amt);
    shakeT = Math.max(shakeT, dur);
  };

  // ---- toast (small top message, e.g. "Sound off") ----
  let toast = null;
  G.toast = function (text) { toast = { text, t: 0 }; };

  // ---- scene transitions ----
  let fade = 0, fadeDir = 0, pending = null;
  G.setScene = function (scene) {
    if (G.scene && G.scene.exit) G.scene.exit();
    G.scene = scene;
    if (scene.enter) scene.enter();
  };
  // Fade out, build the next scene, fade in.
  G.goto = function (makeScene) {
    if (fadeDir === 1) return;
    pending = makeScene;
    fadeDir = 1;
  };

  // ---- phones & tablets ----
  // G.touch is true on touch-first devices. It switches live if the player
  // moves between a touchscreen and a mouse (input.js calls G.setTouch).
  const coarse = window.matchMedia ? window.matchMedia('(hover: none) and (pointer: coarse)') : null;
  G.touch = !!(coarse && coarse.matches);
  G.setTouch = function (on) {
    if (G.touch === on) return;
    G.touch = on;
    if (G.canvas) resize();
  };
  if (coarse && coarse.addEventListener) coarse.addEventListener('change', (e) => G.setTouch(e.matches));
  const installed = () =>
    navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);

  // "Add to Home Screen" support. Only over http(s): from file:// the browser
  // can't read the manifest and just logs an error.
  if (/^https?:$/.test(location.protocol)) {
    const l = document.createElement('link');
    l.rel = 'manifest';
    l.href = 'manifest.webmanifest';
    document.head.appendChild(l);
  }

  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  G.canFullscreen = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  G.enterFullscreen = function () {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    const lock = () => {
      const o = screen.orientation;
      if (G.touch && o && o.lock) o.lock('landscape').catch(() => {});
    };
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(lock, () => {}); else lock();
    } catch (e) { /* not available */ }
  };
  G.toggleFullscreen = function () {
    try {
      if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else G.enterFullscreen();
    } catch (e) { /* not available */ }
  };
  // The first tap on a phone goes fullscreen (and sideways, where the browser
  // allows it), so the browser bars don't eat the screen. Only once: if the
  // player leaves fullscreen, the button on the side brings it back.
  let autoFsDone = false;
  G.autoFullscreen = function () {
    if (autoFsDone || !G.touch) return;
    autoFsDone = true;
    if (!fsElement() && !installed()) G.enterFullscreen();
  };

  // ---- sizing ----
  // The game is drawn at 1280x720 and scaled to fit inside the safe area
  // (clear of notches and rounded corners). On touch devices a strip on the
  // right holds the pause / sound / fullscreen buttons; on most phones that
  // strip is in the letterbox space anyway.
  const BAR = 58, BTN = 42;
  let probe, touchbar, rotateEl;
  G.view = { scale: 1, dpr: 1, blocked: false };
  function insets() {
    if (!probe) return { t: 0, r: 0, b: 0, l: 0 };
    const s = getComputedStyle(probe);
    const n = (v) => parseFloat(v) || 0;
    return { t: n(s.paddingTop), r: n(s.paddingRight), b: n(s.paddingBottom), l: n(s.paddingLeft) };
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ww = window.innerWidth, wh = window.innerHeight;
    const sa = insets();
    const bar = G.touch ? BAR : 0;
    const blocked = G.touch && wh > ww; // phone held upright: ask to rotate
    const aw = ww - sa.l - sa.r, ah = wh - sa.t - sa.b;
    const scale = Math.max(0.05, Math.min((aw - bar) / G.W, ah / G.H));
    const cw = Math.floor(G.W * scale), ch = Math.floor(G.H * scale);
    let left = sa.l + (aw - cw) / 2;
    if (bar) left = Math.min(left, ww - sa.r - bar - cw);
    left = Math.floor(left);
    const top = Math.floor(sa.t + (ah - ch) / 2);
    const c = G.canvas;
    c.style.width = cw + 'px';
    c.style.height = ch + 'px';
    c.style.left = left + 'px';
    c.style.top = top + 'px';
    c.width = Math.floor(cw * dpr);
    c.height = Math.floor(ch * dpr);
    G.view = { scale, dpr, blocked };

    if (rotateEl) rotateEl.hidden = !blocked;
    if (touchbar) {
      touchbar.hidden = !G.touch || blocked;
      const space = ww - sa.r - (left + cw);
      touchbar.style.left = Math.floor(left + cw + (space - BTN) / 2) + 'px';
      touchbar.style.top = (top + 6) + 'px';
    }
  }

  function setupTouchbar() {
    touchbar = document.getElementById('touchbar');
    rotateEl = document.getElementById('rotate');
    if (!touchbar) return;
    // Keep these taps away from the game's own pointer handling.
    const stop = (e) => { e.stopPropagation(); if (G.audio) G.audio.unlock(); };
    touchbar.addEventListener('pointerdown', stop);
    touchbar.addEventListener('pointerup', stop);
    const on = (id, fn) => document.getElementById(id).addEventListener('click', (e) => { e.preventDefault(); fn(); });
    on('tb-pause', () => G.input.tap('Escape'));
    on('tb-mute', () => G.audio.toggleMute());
    on('tb-full', () => G.toggleFullscreen());
    document.getElementById('tb-full').hidden = !G.canFullscreen;
  }
  // Called each frame; only touches the DOM when something changed.
  let tbPause = null, tbMuted = null;
  function updateTouchbar() {
    if (!touchbar || touchbar.hidden) return;
    const canPause = !!(G.scene && G.scene.canPause && G.scene.canPause());
    if (canPause !== tbPause) document.getElementById('tb-pause').hidden = !(tbPause = canPause);
    if (G.audio.muted !== tbMuted) document.getElementById('tb-mute').classList.toggle('muted', (tbMuted = G.audio.muted));
  }

  let last = 0;
  function frame(ts) {
    const t = ts / 1000;
    let dt = last ? t - last : 0;
    last = t;
    dt = Math.min(dt, 1 / 20);
    const I = G.input;
    // Held upright on a phone: the "turn sideways" screen is up and the game waits.
    if (G.view.blocked) {
      I.endFrame();
      requestAnimationFrame(frame);
      return;
    }
    G.time += dt;
    G.dt = dt;
    G.sk.tick(G.time);
    G.audio.update(dt);

    if (I.pressed('KeyM')) G.audio.toggleMute();
    if (I.pressed('KeyF')) G.toggleFullscreen();

    if (fadeDir === 1) {
      fade += dt / 0.35;
      if (fade >= 1) {
        fade = 1;
        const make = pending;
        pending = null;
        fadeDir = -1;
        G.setScene(make());
      }
    } else if (fadeDir === -1) {
      fade -= dt / 0.35;
      if (fade <= 0) { fade = 0; fadeDir = 0; }
    }
    if (G.scene && fadeDir !== 1) G.scene.update(dt);

    const ctx = G.ctx, v = G.view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = G.COL.paper;
    ctx.fillRect(0, 0, G.canvas.width, G.canvas.height);

    let sx = 0, sy = 0;
    if (shakeT > 0) {
      shakeT -= dt;
      const a = shakeAmt * Math.min(1, shakeT * 4);
      sx = (Math.random() * 2 - 1) * a;
      sy = (Math.random() * 2 - 1) * a;
      if (shakeT <= 0) shakeAmt = 0;
    }
    const k = v.scale * v.dpr;
    ctx.setTransform(k, 0, 0, k, sx * k, sy * k);
    if (G.scene) G.scene.draw(ctx);

    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (toast) {
      toast.t += dt;
      const a = Math.min(1, toast.t * 6) * Math.min(1, (1.6 - toast.t) * 4);
      if (a <= 0 && toast.t > 1) toast = null;
      else {
        ctx.globalAlpha = Math.max(0, a);
        G.sk.round(ctx, 540, 76, 200, 40, 10, { fill: G.COL.sheet });
        G.sk.text(ctx, toast.text, 640, 97, { size: 24, align: 'center' });
        ctx.globalAlpha = 1;
      }
    }
    if (fade > 0) {
      ctx.fillStyle = `rgba(29,27,25,${fade})`;
      ctx.fillRect(0, 0, G.W, G.H);
    }

    updateTouchbar();
    I.endFrame();
    requestAnimationFrame(frame);
  }

  G.start = function (makeFirstScene) {
    G.canvas = document.getElementById('game');
    G.ctx = G.canvas.getContext('2d');
    probe = document.createElement('div');
    probe.id = 'safe-probe';
    document.body.appendChild(probe);
    setupTouchbar();
    window.addEventListener('resize', resize);
    // Phones report the new size a moment after rotating.
    window.addEventListener('orientationchange', () => { resize(); setTimeout(resize, 350); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
    resize();
    const fontReady = document.fonts
      ? Promise.race([
          document.fonts.load(`40px 'Patrick Hand'`),
          new Promise((r) => setTimeout(r, 2500)),
        ])
      : Promise.resolve();
    fontReady.catch(() => {}).then(() => {
      const l = document.getElementById('loading');
      if (l) l.remove();
      G.setScene(makeFirstScene());
      requestAnimationFrame(frame);
    });
  };
})();
