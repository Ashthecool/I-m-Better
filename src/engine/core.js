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

  G.toggleFullscreen = function () {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (e) { /* not available */ }
  };

  G.view = { scale: 1, dpr: 1 };
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ww = window.innerWidth, wh = window.innerHeight;
    const scale = Math.min(ww / G.W, wh / G.H);
    const cw = Math.floor(G.W * scale), ch = Math.floor(G.H * scale);
    const c = G.canvas;
    c.style.width = cw + 'px';
    c.style.height = ch + 'px';
    c.style.left = Math.floor((ww - cw) / 2) + 'px';
    c.style.top = Math.floor((wh - ch) / 2) + 'px';
    c.width = Math.floor(cw * dpr);
    c.height = Math.floor(ch * dpr);
    G.view = { scale, dpr };
  }

  let last = 0;
  function frame(ts) {
    const t = ts / 1000;
    let dt = last ? t - last : 0;
    last = t;
    dt = Math.min(dt, 1 / 20);
    G.time += dt;
    G.dt = dt;
    G.sk.tick(G.time);
    G.audio.update(dt);

    const I = G.input;
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

    I.endFrame();
    requestAnimationFrame(frame);
  }

  G.start = function (makeFirstScene) {
    G.canvas = document.getElementById('game');
    G.ctx = G.canvas.getContext('2d');
    window.addEventListener('resize', resize);
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
