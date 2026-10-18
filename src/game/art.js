// Drawings: faces with moods, people (seated/standing), desks, rooms, props.
(function () {
  'use strict';
  const G = window.G;
  const sk = G.sk, U = G.util;
  const SKIN = '#fffaf2';
  const PI = Math.PI;

  // eyebrow tilt per mood (+ = angry V, - = worried)
  const BROW = {
    neutral: 0, happy: -0.2, content: -0.1, annoyed: 0.35, angry: 0.6, furious: 0.9,
    sad: -0.6, shout: 0.9, shock: -0.7, breathe: 0, worried: -0.5,
  };

  const A = (G.art = {
    // Face features on an already-drawn head centered at (x, y) with radius r.
    face(ctx, x, y, r, mood, o = {}) {
      const ink = G.COL.ink;
      const lx = (o.look || 0) * r * 0.22, ly = (o.lookY || 0) * r * 0.14;
      const ex = r * 0.36, ey = y - r * 0.05 + ly;
      const f = { color: ink };

      // eyes
      if (mood === 'breathe' || mood === 'content') {
        [-1, 1].forEach((s) => sk.path(ctx, (p) => {
          p.arc(x + s * ex + lx * 0.5, ey - 1, r * 0.13, 0.15 * PI, 0.85 * PI);
        }, { color: ink, w: 2, single: true, size: 8 }));
      } else if (mood === 'shock') {
        [-1, 1].forEach((s) => sk.ellipse(ctx, x + s * ex + lx, ey, r * 0.13, r * 0.15, { fill: '#fff', color: ink, w: 1.6, single: true }));
        ctx.fillStyle = ink;
        [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(x + s * ex + lx, ey, r * 0.05, 0, PI * 2); ctx.fill(); });
      } else {
        ctx.fillStyle = ink;
        const er = r * 0.1;
        [-1, 1].forEach((s) => {
          ctx.beginPath();
          ctx.ellipse(x + s * ex + lx, ey, er, mood === 'furious' || mood === 'shout' ? er * 0.8 : er * 1.15, 0, 0, PI * 2);
          ctx.fill();
        });
      }

      // brows
      const a = BROW[mood] ?? 0;
      const by = ey - r * 0.3, bw = r * 0.2;
      sk.line(ctx, x - ex - bw + lx, by - a * r * 0.05, x - ex + bw + lx, by + a * r * 0.13, { ...f, w: 2.2, single: true });
      sk.line(ctx, x + ex - bw + lx, by + a * r * 0.13, x + ex + bw + lx, by - a * r * 0.05, { ...f, w: 2.2, single: true });

      // mouth
      const mx = x + lx * 0.6, my = y + r * 0.45 + ly * 0.5, mw = r * 0.28;
      const arc = (cx, cy, rr, a0, a1) => sk.path(ctx, (p) => p.arc(cx, cy, rr, a0, a1), { color: ink, w: 2.2, single: true, size: 10 });
      switch (mood) {
        case 'happy': arc(mx, my - mw * 0.7, mw, 0.15 * PI, 0.85 * PI); break;
        case 'content': arc(mx, my - mw * 0.9, mw * 0.8, 0.25 * PI, 0.75 * PI); break;
        case 'annoyed': sk.line(ctx, mx - mw, my + 1, mx + mw, my - 2, { ...f, w: 2.2, single: true }); break;
        case 'angry': case 'sad': case 'worried':
          arc(mx, my + mw * 0.9, mw * 0.9, 1.2 * PI, 1.8 * PI); break;
        case 'furious':
          sk.round(ctx, mx - mw, my - mw * 0.35, mw * 2, mw * 0.75, 3, { fill: '#fff', color: ink, w: 1.8 });
          sk.line(ctx, mx - mw, my + 0.5, mx + mw, my + 0.5, { ...f, w: 1.2, single: true });
          break;
        case 'shout':
          ctx.fillStyle = ink;
          ctx.beginPath(); ctx.ellipse(mx, my + 1, mw * 0.85, mw * 0.8, 0, 0, PI * 2); ctx.fill();
          break;
        case 'shock':
          sk.ellipse(ctx, mx, my, mw * 0.35, mw * 0.45, { color: ink, w: 1.8, single: true });
          break;
        default: sk.line(ctx, mx - mw * 0.8, my, mx + mw * 0.8, my, { ...f, w: 2.2, single: true });
      }

      // cheeks / extras
      if (mood === 'angry' || mood === 'furious' || mood === 'shout') {
        ctx.fillStyle = 'rgba(210,69,58,0.32)';
        [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(x + s * r * 0.58, y + r * 0.22, r * 0.17, r * 0.1, 0, 0, PI * 2); ctx.fill(); });
      }
      if (mood === 'happy' || mood === 'content') {
        ctx.fillStyle = 'rgba(232,140,140,0.22)';
        [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(x + s * r * 0.58, y + r * 0.22, r * 0.15, r * 0.09, 0, 0, PI * 2); ctx.fill(); });
      }
      if (mood === 'sad' && o.tear) {
        const ty = ey + r * 0.2 + ((G.time * 18) % 10);
        sk.ellipse(ctx, x - ex + lx, ty, 2.5, 3.5, { fill: '#9cc0e6', color: G.COL.blue, w: 1.2, single: true });
      }
      if (mood === 'furious' || mood === 'shout') {
        const t = G.time * 3;
        [-1, 1].forEach((s) => {
          const bx = x + s * r * 0.9, top = y - r * 1.25;
          sk.curve(ctx, [[bx, top], [bx + s * 4 + Math.sin(t) * 3, top - 10], [bx - s * 2, top - 20], [bx + s * 5 + Math.sin(t + 1) * 3, top - 30]],
            { color: G.COL.red, w: 2, single: true });
        });
      }
      if (o.glasses) {
        [-1, 1].forEach((s) => sk.ellipse(ctx, x + s * ex + lx * 0.6, ey, r * 0.24, r * 0.21, { color: ink, w: 1.6, single: true }));
        sk.line(ctx, x - ex + r * 0.24 + lx * 0.6, ey, x + ex - r * 0.24 + lx * 0.6, ey, { ...f, w: 1.4, single: true });
      }
    },

    hair(ctx, hy, r, style, color) {
      const o = { fill: color, tintMix: 0.15 };
      const st = { w: 2 };
      const cap = (p) => {
        p.moveTo(-r * 1.02, hy - r * 0.15);
        p.quadraticCurveTo(-r * 1.15, hy - r * 1.3, 0, hy - r * 1.18);
        p.quadraticCurveTo(r * 1.15, hy - r * 1.3, r * 1.02, hy - r * 0.15);
        p.quadraticCurveTo(r * 0.5, hy - r * 0.75, -r * 0.2, hy - r * 0.55);
        p.quadraticCurveTo(-r * 0.7, hy - r * 0.45, -r * 1.02, hy - r * 0.15);
        p.closePath();
      };
      const capOpts = { fill: color, w: 2, size: r * 1.6, tintMix: 0.15 };
      switch (style) {
        case 'messy': {
          const pts = [];
          for (let i = 0; i <= 10; i++) {
            const a = PI + 0.05 + (i / 10) * (PI - 0.1);
            const rr = i % 2 ? r * 1.32 : r * 1.06;
            pts.push([Math.cos(a) * rr, hy + Math.sin(a) * rr]);
          }
          pts.push([r * 0.7, hy - r * 0.5], [r * 0.35, hy - r * 0.32], [0, hy - r * 0.55], [-r * 0.4, hy - r * 0.35], [-r * 0.75, hy - r * 0.5]);
          sk.poly(ctx, pts, { ...o, ...st });
          break;
        }
        case 'curly':
          for (let i = 0; i < 8; i++) {
            const a = PI + 0.05 + (i / 7) * (PI - 0.1);
            sk.ellipse(ctx, Math.cos(a) * r * 0.95, hy + Math.sin(a) * r * 0.95, r * 0.34, r * 0.3, { ...o, w: 1.8 });
          }
          break;
        case 'pony':
          sk.ellipse(ctx, r * 1.12, hy + r * 0.05, r * 0.28, r * 0.62, { ...o, rot: -0.25, w: 1.8 });
          sk.path(ctx, cap, capOpts);
          break;
        case 'bob': {
          const b = (p) => {
            p.moveTo(-r * 1.12, hy + r * 0.6);
            p.quadraticCurveTo(-r * 1.3, hy - r * 1.35, 0, hy - r * 1.2);
            p.quadraticCurveTo(r * 1.3, hy - r * 1.35, r * 1.12, hy + r * 0.6);
            p.lineTo(r * 0.78, hy + r * 0.6);
            p.lineTo(r * 0.82, hy - r * 0.4);
            p.lineTo(-r * 0.82, hy - r * 0.4);
            p.lineTo(-r * 0.78, hy + r * 0.6);
            p.closePath();
          };
          sk.path(ctx, b, capOpts);
          break;
        }
        case 'bun':
          sk.ellipse(ctx, 0, hy - r * 1.2, r * 0.4, r * 0.34, { ...o, w: 1.8 });
          sk.path(ctx, cap, capOpts);
          break;
        case 'side': {
          sk.path(ctx, cap, capOpts);
          sk.line(ctx, -r * 0.35, hy - r * 1.12, -r * 0.2, hy - r * 0.6, { w: 1.4, color: G.COL.paper, single: true });
          break;
        }
        case 'bald':
          [-1, 1].forEach((s) => sk.ellipse(ctx, s * r * 0.92, hy - r * 0.15, r * 0.18, r * 0.3, { ...o, w: 1.6 }));
          break;
        default: // short
          sk.path(ctx, cap, capOpts);
      }
    },

    // Person. Seated: (x, y) is the desk-top line. Standing: (x, y) is the feet.
    // p: { seated, standing, desk:'school'|'office'|null, shirt, dress, tie, lanyard,
    //      hair, hairColor, glasses, mood, look, lookY, arms, writing,
    //      standUp (0..1), dx, tilt, scale, adult, tear }
    person(ctx, x, y, p) {
      const s = p.scale || 1;
      const r = p.adult ? 23 : 21;
      const ink = sk.col();
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      sk.salt = x * 0.13;

      if (p.standing) {
        A._standing(ctx, r, p);
      } else {
        const up = (p.standUp || 0) * 28;
        const dx = p.dx || 0;
        const sh = -50;
        // torso
        ctx.save();
        ctx.translate(dx, -up);
        if (p.tilt) ctx.rotate(p.tilt);
        const bot = 14 + up;
        sk.poly(ctx, [[-27, bot], [-26, sh + 12], [-18, sh], [18, sh], [26, sh + 12], [27, bot]], { fill: p.shirt || '#ddd', w: 2.2 });
        A._chest(ctx, sh, p);
        ctx.restore();
        // desk (doesn't move)
        if (p.desk) A.desk(ctx, 0, 0, p.desk, p);
        else if (p.bench !== false && !p.desk) A._seatedLegs(ctx);
        // arms + head
        ctx.save();
        ctx.translate(dx, -up);
        if (p.tilt) ctx.rotate(p.tilt);
        A._arms(ctx, sh, p, false);
        const hy = sh - r - 2;
        sk.ellipse(ctx, 0, hy, r, r * 1.03, { fill: SKIN, w: 2.2, color: ink });
        A.hair(ctx, hy, r, p.hair, p.hairColor || '#333');
        A.face(ctx, 0, hy, r, p.mood || 'neutral', p);
        ctx.restore();
      }
      sk.salt = 0;
      ctx.restore();
    },

    _standing(ctx, r, p) {
      const ink = sk.col();
      // legs
      sk.line(ctx, -9, -70, -11, -2, { w: 2.6 });
      sk.line(ctx, 9, -70, 11, -2, { w: 2.6 });
      sk.ellipse(ctx, -14, 0, 9, 4, { fill: ink, w: 1.5 });
      sk.ellipse(ctx, 14, 0, 9, 4, { fill: ink, w: 1.5 });
      const sh = -130;
      if (p.dress) {
        sk.poly(ctx, [[-32, -44], [-24, sh + 10], [-16, sh], [16, sh], [24, sh + 10], [32, -44]], { fill: p.dress, w: 2.2 });
      } else {
        sk.poly(ctx, [[-25, -66], [-26, sh + 12], [-17, sh], [17, sh], [26, sh + 12], [25, -66]], { fill: p.shirt || '#ddd', w: 2.2 });
        sk.line(ctx, -25, -68, 25, -68, { w: 2 });
      }
      A._chest(ctx, sh, p);
      A._arms(ctx, sh, p, true);
      const hy = sh - r - 2;
      sk.ellipse(ctx, 0, hy, r, r * 1.03, { fill: SKIN, w: 2.2, color: ink });
      A.hair(ctx, hy, r, p.hair, p.hairColor || '#333');
      A.face(ctx, 0, hy, r, p.mood || 'neutral', p);
    },

    _chest(ctx, sh, p) {
      // collar
      sk.line(ctx, -8, sh, 0, sh + 9, { w: 1.8, single: true });
      sk.line(ctx, 8, sh, 0, sh + 9, { w: 1.8, single: true });
      if (p.tie) sk.poly(ctx, [[0, sh + 8], [-4, sh + 14], [0, sh + 36], [4, sh + 14]], { fill: p.tie, w: 1.6 });
      if (p.lanyard) {
        sk.line(ctx, -10, sh + 1, -2, sh + 28, { w: 1.4, color: G.COL.blue, single: true });
        sk.line(ctx, 10, sh + 1, 2, sh + 28, { w: 1.4, color: G.COL.blue, single: true });
        sk.rect(ctx, -7, sh + 28, 14, 10, { fill: '#fff', w: 1.4 });
      }
      if (p.badge) sk.star(ctx, 15, sh + 18, 6);
    },

    _arms(ctx, sh, p, standing) {
      const skin = SKIN;
      const arm = (pts) => {
        sk.curve(ctx, pts, { w: 2.4 });
        const h = pts[pts.length - 1];
        sk.ellipse(ctx, h[0], h[1], 5, 5, { fill: skin, w: 1.6 });
      };
      const L = -24, R = 24, y0 = sh + 10;
      const t = G.time;
      switch (p.arms) {
        case 'up':
          arm([[L, y0], [-40, sh - 6], [-36, sh - 40 + Math.sin(t * 30) * 3]]);
          arm([[R, y0], [40, sh - 6], [36, sh - 40 + Math.cos(t * 30) * 3]]);
          break;
        case 'slam':
          arm([[L, y0], [-34, -16], [-18, -4]]);
          arm([[R, y0], [34, -16], [18, -4]]);
          break;
        case 'shove':
          arm([[L, y0], [10, sh + 4], [48, sh + 2]]);
          arm([[R, y0], [30, sh + 14], [52, sh + 14]]);
          break;
        case 'hold':
          arm([[L, y0], [-30, y0 + 26], [-14, y0 + 30]]);
          arm([[R, y0], [30, y0 + 26], [14, y0 + 30]]);
          break;
        case 'clap': {
          const c = Math.abs(Math.sin(t * 9)) * 6;
          arm([[L, y0], [-28, y0 + 22], [-4 - c, y0 + 14]]);
          arm([[R, y0], [28, y0 + 22], [4 + c, y0 + 14]]);
          break;
        }
        case 'trophy':
          arm([[L, y0], [-34, y0 + 30], [-28, y0 + 58]]);
          arm([[R, y0], [40, sh - 4], [34, sh - 34]]);
          A.trophy(ctx, 34, sh - 40, 0.8);
          break;
        case 'point':
          arm([[L, y0], [-30, y0 + 30], [-27, y0 + 60]]);
          arm([[R, y0], [46, y0 - 8], [72, y0 - 18]]);
          sk.line(ctx, 72, y0 - 18, 110, y0 - 34, { w: 2.2, color: '#8a6a3a' });
          break;
        case 'thumb':
          arm([[L, y0], [-30, y0 + 30], [-27, y0 + 60]]);
          arm([[R, y0], [40, y0 - 6], [42, sh - 26]]);
          sk.line(ctx, 42, sh - 30, 43, sh - 40, { w: 3 });
          break;
        default:
          if (standing) {
            arm([[L, y0], [-31, y0 + 30], [-28, y0 + 60]]);
            arm([[R, y0], [31, y0 + 30], [28, y0 + 60]]);
          } else {
            arm([[L, y0], [-32, -16], [-15, -3]]);
            const wx = p.writing ? Math.sin(t * 22) * 2.5 : 0;
            const wy = p.writing ? Math.cos(t * 17) * 1.2 : 0;
            arm([[R, y0], [32, -16], [15 + wx, -3 + wy]]);
            if (p.writing) sk.line(ctx, 15 + wx, -4 + wy, 27 + wx, -16 + wy, { w: 2, color: '#8a6a3a', single: true });
          }
      }
    },

    _seatedLegs(ctx) {
      sk.line(ctx, -12, 14, -14, 62, { w: 2.6 });
      sk.line(ctx, 12, 14, 14, 62, { w: 2.6 });
      sk.ellipse(ctx, -17, 64, 8, 4, { fill: sk.col(), w: 1.4 });
      sk.ellipse(ctx, 17, 64, 8, 4, { fill: sk.col(), w: 1.4 });
    },

    desk(ctx, x, y, kind, p = {}) {
      const shake = p.deskShake ? Math.sin(G.time * 60) * p.deskShake * 4 : 0;
      ctx.save();
      ctx.translate(x + shake, y);
      if (kind === 'office') {
        // monitor beside the person
        sk.rect(ctx, 44, -50, 50, 36, { fill: '#2f3a44', w: 2, fillStyle: 'solid' });
        sk.rect(ctx, 48, -46, 42, 28, { fill: p.screen || '#dbe8f1', w: 1, stroke: false });
        sk.line(ctx, 69, -14, 69, -4, { w: 3 });
        sk.line(ctx, 60, -4, 78, -4, { w: 2.5 });
        sk.rect(ctx, -46, -7, 40, 5, { fill: '#cfd3d6', w: 1.4 });
      } else {
        sk.rect(ctx, -52, -7, 44, 5, { fill: '#ffffff', w: 1.4 });
        sk.line(ctx, -30, -7, -30, -2, { w: 1, single: true });
      }
      sk.rect(ctx, -74, -2, 148, 10, { fill: kind === 'office' ? '#d6d0c6' : '#e2cfae', w: 2.2 });
      sk.rect(ctx, -66, 8, 132, 54, { fill: kind === 'office' ? '#c9c2b6' : '#d5bd94', w: 2 });
      ctx.restore();
    },

    trophy(ctx, x, y, s = 1) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      sk.ellipse(ctx, -16, -16, 7, 8, { w: 2 });
      sk.ellipse(ctx, 16, -16, 7, 8, { w: 2 });
      sk.poly(ctx, [[-16, -30], [16, -30], [10, -6], [3, 0], [-3, 0], [-10, -6]], { fill: G.COL.gold, w: 2 });
      sk.rect(ctx, -3, 0, 6, 10, { fill: G.COL.gold, w: 1.6 });
      sk.rect(ctx, -11, 10, 22, 6, { fill: '#8a6a3a', w: 1.6 });
      ctx.restore();
    },

    arrow(ctx, cx, cy, dir, size, o = {}) {
      const a = [-PI / 2, 0, PI / 2, PI][dir];
      const c = Math.cos(a), s = Math.sin(a);
      const h = size * 0.42;
      const tip = [cx + c * h, cy + s * h], tail = [cx - c * h, cy - s * h];
      const opt = { w: o.w || 3.5, color: o.color };
      sk.line(ctx, tail[0], tail[1], tip[0], tip[1], opt);
      const b = size * 0.24;
      sk.line(ctx, tip[0], tip[1], tip[0] - c * b - s * b, tip[1] - s * b + c * b, opt);
      sk.line(ctx, tip[0], tip[1], tip[0] - c * b + s * b, tip[1] - s * b - c * b, opt);
    },

    // ---------- rooms ----------
    classroom(ctx, o = {}) {
      sk.salt = 0;
      ctx.fillStyle = '#f1ebdf';
      ctx.fillRect(-40, 50, 1360, 245);
      ctx.fillStyle = '#e4d9c6';
      ctx.fillRect(-40, 290, 1360, 140);
      sk.line(ctx, -40, 290, 1320, 290, { w: 2 });
      for (let x = -40; x < 1320; x += 120) sk.line(ctx, x, 292, x - 50, 420, { w: 1, alpha: 0.25, single: true });

      // blackboard
      sk.rect(ctx, 390, 84, 500, 128, { fill: '#3e4b45', w: 3, fillStyle: 'solid' });
      sk.rect(ctx, 382, 212, 516, 8, { fill: '#c9b08a', w: 2 });
      const chalk = '#eef0ea';
      sk.text(ctx, o.board || '2x + 3 = 11', 420, 122, { size: 34, color: chalk });
      sk.text(ctx, 'x = ?', 420, 168, { size: 30, color: chalk });
      sk.ellipse(ctx, 790, 145, 34, 34, { color: chalk, w: 2 });
      sk.line(ctx, 756, 145, 824, 145, { color: chalk, w: 1.6 });
      sk.poly(ctx, [[660, 185], [700, 110], [740, 185]], { color: chalk, w: 2, stroke: true });

      A.window(ctx, 1000, 84, 170, 130, o.outside || 'sky');

      // clock
      sk.ellipse(ctx, 945, 112, 20, 20, { fill: '#fff', w: 2 });
      const t = G.time * 0.2;
      sk.line(ctx, 945, 112, 945 + Math.cos(t) * 13, 112 + Math.sin(t) * 13, { w: 1.8, single: true });
      sk.line(ctx, 945, 112, 945 + Math.cos(t / 12) * 8, 112 + Math.sin(t / 12) * 8, { w: 2.4, single: true });

      // star chart — there's always someone with more stars
      if (o.stars && o.cast) {
        sk.rect(ctx, 95, 80, 160, 142, { fill: '#fffdf6', w: 2 });
        sk.text(ctx, 'STAR CHART', 175, 98, { size: 20, align: 'center' });
        const rows = ['rival', 'o1', 'friend', 'you'];
        rows.forEach((id, i) => {
          const y = 126 + i * 25;
          sk.text(ctx, o.cast[id].name, 104, y, { size: 17, color: id === 'you' ? G.COL.blue : G.COL.ink });
          const n = o.stars[id] || 0;
          for (let k = 0; k < Math.min(n, 6); k++) sk.star(ctx, 152 + k * 13, y, 5.5, { w: 1 });
          if (n > 6) sk.text(ctx, '+' + (n - 6), 248, y, { size: 14, align: 'right' });
        });
      }
    },

    office(ctx, o = {}) {
      sk.salt = 0;
      ctx.fillStyle = '#ebe7e0';
      ctx.fillRect(-40, 50, 1360, 245);
      ctx.fillStyle = '#d7d2c8';
      ctx.fillRect(-40, 290, 1360, 140);
      sk.line(ctx, -40, 290, 1320, 290, { w: 2 });
      sk.hatch(ctx, -40, 292, 1360, 130, { gap: 14, alpha: 0.12 });

      // whiteboard with charts
      sk.rect(ctx, 390, 84, 500, 128, { fill: '#fbfbf8', w: 3, fillStyle: 'solid' });
      sk.text(ctx, o.board || 'Q3 GOALS', 412, 108, { size: 26 });
      const bars = [30, 46, 38, 62, 80];
      bars.forEach((h, i) => sk.rect(ctx, 420 + i * 34, 196 - h, 22, h, { fill: i === 4 ? G.COL.gold : '#cdd9e4', w: 1.6 }));
      sk.curve(ctx, [[620, 190], [670, 172], [710, 180], [760, 140], [800, 150], [860, 104]], { color: G.COL.red, w: 2.4 });
      sk.line(ctx, 610, 196, 870, 196, { w: 1.6 });

      A.window(ctx, 1000, 84, 170, 130, 'city');

      // employee of the month
      if (o.cast) {
        const rv = o.cast.rival;
        sk.rect(ctx, 95, 80, 160, 142, { fill: '#fffdf6', w: 2 });
        sk.rect(ctx, 101, 86, 148, 130, { stroke: true, w: 1.2, color: G.COL.gold });
        sk.text(ctx, 'EMPLOYEE OF', 175, 101, { size: 17, align: 'center' });
        sk.text(ctx, 'THE MONTH', 175, 119, { size: 17, align: 'center' });
        ctx.save();
        ctx.translate(175, 168);
        sk.ellipse(ctx, 0, 0, 22, 23, { fill: SKIN, w: 2 });
        A.hair(ctx, 0, 22, rv.hair, rv.hairColor);
        A.face(ctx, 0, 0, 22, 'happy', {});
        ctx.restore();
        sk.star(ctx, 222, 150, 10);
        sk.text(ctx, rv.name + (o.streak ? ` ×${o.streak}` : ''), 175, 205, { size: 16, align: 'center' });
      }
      // plant
      sk.rect(ctx, 1225, 250, 34, 40, { fill: '#c98a5a', w: 2 });
      [[-14, -40], [0, -54], [14, -42], [-6, -30], [8, -28]].forEach(([dx, dy]) =>
        sk.ellipse(ctx, 1242 + dx * 0.8, 250 + dy * 0.7, 8, 16, { fill: '#8fbf86', w: 1.6, rot: dx * 0.04 }));
    },

    window(ctx, x, y, w, h, kind) {
      sk.rect(ctx, x, y, w, h, { fill: kind === 'city' ? '#cfe0ec' : '#dbe9f3', w: 3, fillStyle: 'solid' });
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 2, y + 2, w - 4, h - 4);
      ctx.clip();
      if (kind === 'city') {
        [[0, 70], [26, 95], [50, 55], [80, 110], [112, 80], [140, 64]].forEach(([dx, bh]) =>
          sk.rect(ctx, x + dx, y + h - bh, 28, bh + 4, { fill: '#a9b9c8', w: 1.4 }));
      } else {
        sk.ellipse(ctx, x + w - 34, y + 30, 14, 14, { fill: '#f6d77b', w: 1.6 });
        sk.ellipse(ctx, x + w * 0.5, y + h - 8, w * 0.7, 26, { fill: '#b9d7a8', w: 1.6 });
      }
      const cx = x + ((G.time * 9) % (w + 120)) - 60;
      sk.ellipse(ctx, cx, y + 40, 26, 11, { fill: '#ffffff', w: 1.4 });
      sk.ellipse(ctx, cx + 18, y + 34, 16, 9, { fill: '#ffffff', w: 1.4 });
      ctx.restore();
      sk.line(ctx, x + w / 2, y, x + w / 2, y + h, { w: 2.4 });
      sk.line(ctx, x, y + h / 2, x + w, y + h / 2, { w: 2.4 });
    },

    notebook(ctx, P) {
      sk.round(ctx, P.x + 4, P.y + 6, P.w, P.h, 10, { fill: 'rgba(42,38,34,0.1)', stroke: false });
      sk.round(ctx, P.x, P.y, P.w, P.h, 10, { fill: G.COL.sheet, w: 2.4 });
      ctx.save();
      ctx.strokeStyle = '#cfe0ef';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let y = P.y + 60; y < P.y + P.h - 8; y += 30) { ctx.moveTo(P.x + 6, y); ctx.lineTo(P.x + P.w - 6, y); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(210,69,58,0.45)';
      ctx.beginPath(); ctx.moveTo(P.x + 62, P.y + 4); ctx.lineTo(P.x + 62, P.y + P.h - 4); ctx.stroke();
      ctx.restore();
      [0.2, 0.5, 0.8].forEach((f) => sk.ellipse(ctx, P.x + 30, P.y + P.h * f, 8, 8, { fill: G.COL.paper, w: 1.4 }));
    },

    monitor(ctx, P) {
      sk.round(ctx, P.x + 4, P.y + 6, P.w, P.h, 10, { fill: 'rgba(42,38,34,0.1)', stroke: false });
      sk.round(ctx, P.x, P.y, P.w, P.h, 10, { fill: '#f9fbfc', w: 2.4 });
      ctx.fillStyle = '#dfe6ec';
      ctx.fillRect(P.x + 2, P.y + 2, P.w - 4, 30);
      sk.line(ctx, P.x, P.y + 32, P.x + P.w, P.y + 32, { w: 1.6 });
      ['#e9a29b', '#efd28a', '#a9d6a0'].forEach((c, i) => sk.ellipse(ctx, P.x + 20 + i * 20, P.y + 17, 6, 6, { fill: c, w: 1.2 }));
      sk.text(ctx, 'work.exe', P.x + P.w / 2, P.y + 18, { size: 18, align: 'center', color: G.COL.soft });
    },

    // Little drawings shown during breaks; `k` (0..1) reveals them.
    doodle(ctx, kind, cx, cy, k) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - 160, cy - 100, 320 * k, 200);
      ctx.clip();
      const o = { w: 2.6 };
      switch (kind) {
        case 'cat':
          sk.ellipse(ctx, cx, cy, 52, 44, o);
          sk.poly(ctx, [[cx - 44, cy - 20], [cx - 40, cy - 70], [cx - 12, cy - 42]], { ...o, closed: false });
          sk.poly(ctx, [[cx + 12, cy - 42], [cx + 40, cy - 70], [cx + 44, cy - 20]], { ...o, closed: false });
          A.face(ctx, cx, cy, 40, 'content', {});
          [-1, 1].forEach((s) => { sk.line(ctx, cx + s * 22, cy + 14, cx + s * 70, cy + 6, { w: 1.6 }); sk.line(ctx, cx + s * 22, cy + 20, cx + s * 70, cy + 24, { w: 1.6 }); });
          sk.curve(ctx, [[cx + 52, cy + 20], [cx + 100, cy + 30], [cx + 110, cy - 10], [cx + 90, cy - 30]], o);
          break;
        case 'bird':
          sk.line(ctx, cx - 140, cy + 50, cx + 140, cy + 50, o);
          sk.ellipse(ctx, cx, cy + 12, 40, 30, { ...o, fill: '#cfe0ef' });
          sk.ellipse(ctx, cx + 34, cy - 16, 18, 18, { ...o, fill: '#cfe0ef' });
          sk.poly(ctx, [[cx + 50, cy - 18], [cx + 66, cy - 13], [cx + 50, cy - 8]], { ...o, fill: G.COL.gold });
          ctx.fillStyle = G.COL.ink; ctx.beginPath(); ctx.arc(cx + 38, cy - 20, 3, 0, PI * 2); ctx.fill();
          sk.line(ctx, cx - 6, cy + 40, cx - 8, cy + 50, o);
          sk.line(ctx, cx + 8, cy + 40, cx + 10, cy + 50, o);
          break;
        case 'ship':
          sk.poly(ctx, [[cx - 90, cy + 20], [cx + 70, cy + 20], [cx + 110, cy], [cx + 70, cy - 20], [cx - 90, cy - 20]], { ...o, fill: '#e8e3f4' });
          sk.ellipse(ctx, cx + 40, cy, 12, 10, { ...o, fill: '#cfe0ef' });
          sk.poly(ctx, [[cx - 90, cy - 20], [cx - 120, cy - 50], [cx - 50, cy - 20]], { ...o, fill: G.COL.red });
          sk.poly(ctx, [[cx - 90, cy + 20], [cx - 120, cy + 50], [cx - 50, cy + 20]], { ...o, fill: G.COL.red });
          sk.curve(ctx, [[cx - 95, cy], [cx - 130, cy - 6], [cx - 150, cy + 6]], { ...o, color: G.COL.gold });
          [[-60, -70], [90, -60], [20, 70]].forEach(([dx, dy]) => sk.star(ctx, cx + dx, cy + dy, 8));
          break;
        case 'coffee':
          sk.poly(ctx, [[cx - 50, cy - 30], [cx + 50, cy - 30], [cx + 40, cy + 50], [cx - 40, cy + 50]], { ...o, fill: '#fff' });
          sk.ellipse(ctx, cx + 62, cy + 6, 16, 20, o);
          sk.ellipse(ctx, cx, cy - 30, 50, 10, { ...o, fill: '#a0704a' });
          sk.curve(ctx, [[cx - 20, cy - 30], [cx - 8, cy - 36], [cx + 10, cy - 26], [cx + 24, cy - 32]], { w: 2, color: '#f3e5d0' });
          [-16, 6, 26].forEach((dx, i) => sk.curve(ctx, [[cx + dx, cy - 50], [cx + dx + 8, cy - 64 - Math.sin(G.time * 2 + i) * 3], [cx + dx - 4, cy - 80], [cx + dx + 6, cy - 94]], { w: 2, alpha: 0.6 }));
          break;
        case 'city':
          [[-140, 70], [-100, 110], [-50, 60], [-10, 130], [40, 90], [90, 120], [130, 70]].forEach(([dx, h]) =>
            sk.rect(ctx, cx + dx, cy + 70 - h, 36, h, { ...o, fill: '#cdd9e4' }));
          sk.ellipse(ctx, cx + 100, cy - 70, 18, 18, { ...o, fill: '#f6d77b' });
          break;
        case 'stretch':
          A.person(ctx, cx, cy + 80, { standing: true, scale: 0.8, shirt: '#9cc0e6', hair: 'side', hairColor: '#4a3426', mood: 'content', arms: 'up', adult: true });
          break;
      }
      ctx.restore();
    },
  });
})();
