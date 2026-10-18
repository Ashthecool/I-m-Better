// Task mini-games. Three kinds:
//   choice — pick 1 of 3 answers (keys 1/2/3 or click)
//   timing — hit SPACE (or click) while the marker is in the zone
//   seq    — press the arrows in order
// Jealousy makes them harder: options jitter and swap, markers speed up.
(function () {
  'use strict';
  const G = window.G;
  const U = G.util, sk = G.sk;

  function choice(cat, prompt, correct, wrongs) {
    const options = U.shuffle([correct, ...wrongs.slice(0, 2)]);
    return { kind: 'choice', cat, prompt, options, answer: options.indexOf(correct), slots: [0, 1, 2], ax: [null, null, null], swapT: 1.5 };
  }
  function timing(cat, prompt, L) {
    const zw = L.day.zone;
    const z0 = U.rand(0.12, 0.88 - zw);
    return { kind: 'timing', cat, prompt, zone: [z0, z0 + zw], pos: U.rand(0, 0.08), dir: 1, speed: L.day.speed };
  }
  function seq(cat, prompt, n) {
    return { kind: 'seq', cat, prompt, seq: Array.from({ length: n }, () => U.randi(0, 3)), idx: 0 };
  }
  function nearWrongs(ans, deltas) {
    const out = new Set();
    U.shuffle(deltas.flatMap((d) => [ans + d, ans - d])).forEach((v) => {
      if (out.size < 2 && v !== ans && v >= 0) out.add(v);
    });
    return [...out].map(String);
  }
  function clock(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`;
  }

  const BUILD = {
    math(L) {
      const d = L.di;
      const op = U.pick(d === 0 ? ['+', '-'] : ['+', '-', '×']);
      let a, b, ans;
      if (op === '+') { a = U.randi(8, 40 + d * 20); b = U.randi(5, 30 + d * 20); ans = a + b; }
      else if (op === '-') { a = U.randi(20, 60 + d * 20); b = U.randi(3, a - 5); ans = a - b; }
      else { a = U.randi(3, 12); b = U.randi(3, 9 + d); ans = a * b; }
      return choice('MATH', `${a} ${op} ${b} = ?`, String(ans), nearWrongs(ans, op === '×' ? [a, b, 1] : [1, 2, 10]));
    },
    spelling() {
      const t = U.pick(G.DATA.content.spelling);
      return choice('SPELLING', 'Which is spelled correctly?', t[0], [t[1], t[2]]);
    },
    quiz() {
      const q = U.pick(G.DATA.content.quiz);
      return choice('POP QUIZ', q[0], q[1], [q[2], q[3]]);
    },
    raise(L) {
      return timing('RAISE YOUR HAND', L.f('{boss} asks a question. Raise your hand at the right moment!'), L);
    },
    diagram(L) {
      return seq('COPY THE BOARD', 'Copy the diagram from the board, in order.', 4 + L.di);
    },
    email(L) {
      const e = U.pick(G.DATA.content.email);
      return choice('INBOX — best reply?', L.f(e[0]), L.f(e[1]), [L.f(e[2]), L.f(e[3])]);
    },
    sheet(L) {
      const n = [U.randi(12, 90), U.randi(12, 90), U.randi(12, 90 + L.di * 40)];
      const ans = n[0] + n[1] + n[2];
      return choice('SPREADSHEET', `${n[0]} + ${n[1]} + ${n[2]} = ?`, String(ans), nearWrongs(ans, [1, 10, 2]));
    },
    calendar() {
      const start = U.randi(9 * 4, 15 * 4) * 15;
      const dur = U.pick([30, 45, 60, 75, 90]);
      const end = start + dur;
      const wrong = U.shuffle([end + 15, end - 15, end + 30, end - 30]).slice(0, 2).map(clock);
      return choice('CALENDAR', `Meeting at ${clock(start)}, lasts ${dur} min. Ends at?`, clock(end), wrong);
    },
    pitch(L) {
      return timing('PITCH', L.f('Speak up while {boss} is actually listening!'), L);
    },
    macro(L) {
      return seq('SHORTCUTS', 'Enter the shortcut to run the report.', 4 + L.di);
    },
  };

  const ARROW_KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };

  G.Tasks = {
    make(L) {
      const type = U.pick(L.ch.tasks.filter((t) => t !== L.lastType));
      L.lastType = type;
      const t = BUILD[type](L);
      t.type = type;
      t.time = L.day.taskTime * (t.kind === 'seq' ? 1.25 : 1);
      t.left = t.time;
      t.age = 0;
      t.result = null;
      t.shake = 0;
      return t;
    },

    choiceRects(P) {
      const w = 236, h = 86, gap = 22;
      const x0 = P.x + (P.w - (3 * w + 2 * gap)) / 2;
      return [0, 1, 2].map((s) => ({ x: x0 + s * (w + gap), y: P.y + 138, w, h }));
    },
    arrowRects(P) {
      const w = 54, h = 42, gap = 12;
      const x0 = P.x + P.w / 2 - (4 * w + 3 * gap) / 2;
      // display order: left, up, down, right
      return [3, 0, 2, 1].map((dir, i) => ({ dir, x: x0 + i * (w + gap), y: P.y + 206, w, h }));
    },

    update(t, L, dt) {
      const I = G.input, m = I.mouse, P = L.P, anger = L.anger;
      t.shake = Math.max(0, t.shake - dt * 3);

      if (t.kind === 'choice') {
        const rects = this.choiceRects(P);
        rects.forEach((r, s) => {
          const oi = t.slots[s];
          if (t.ax[oi] == null) t.ax[oi] = r.x;
          t.ax[oi] += (r.x - t.ax[oi]) * Math.min(1, dt * 12);
        });
        if (anger > 80) {
          t.swapT -= dt;
          if (t.swapT <= 0) {
            t.swapT = U.rand(1.3, 2.3);
            const a = U.randi(0, 2), b = (a + U.randi(1, 2)) % 3;
            [t.slots[a], t.slots[b]] = [t.slots[b], t.slots[a]];
          }
        }
        let picked = -1;
        ['1', '2', '3'].forEach((k, s) => {
          if (I.pressed('Digit' + k) || I.pressed('Numpad' + k)) picked = t.slots[s];
        });
        if (m.clicked) {
          rects.forEach((r, s) => {
            const oi = t.slots[s];
            if (U.inRect(m.x, m.y, { ...r, x: t.ax[oi] })) { picked = oi; I.eatClick(); }
          });
        }
        if (picked >= 0) t.result = picked === t.answer;
      } else if (t.kind === 'timing') {
        const sp = t.speed * (1 + anger / 110);
        t.pos += t.dir * sp * dt;
        if (t.pos > 1) { t.pos = 1; t.dir = -1; }
        if (t.pos < 0) { t.pos = 0; t.dir = 1; }
        const clicked = m.clicked && U.inRect(m.x, m.y, P);
        if (I.pressed('Space') || clicked) {
          if (clicked) I.eatClick();
          t.result = t.pos >= t.zone[0] && t.pos <= t.zone[1];
        }
      } else if (t.kind === 'seq') {
        let dir = -1;
        for (const k in ARROW_KEYS) if (I.pressed(k)) dir = ARROW_KEYS[k];
        if (m.clicked) {
          this.arrowRects(P).forEach((r) => {
            if (U.inRect(m.x, m.y, r)) { dir = r.dir; I.eatClick(); }
          });
        }
        if (dir >= 0) {
          if (dir === t.seq[t.idx]) {
            t.idx++;
            G.audio.sfx.note(t.idx);
            if (t.idx >= t.seq.length) t.result = true;
          } else {
            t.shake = 1;
            L.anger += 2;
            G.audio.sfx.buzz();
          }
        }
      }
    },

    draw(ctx, t, L) {
      const P = L.P, anger = L.shown, m = G.input.mouse;
      const amp = U.smooth(50, 100, anger) * 7;
      const jx = (k) => Math.sin(G.time * 11 + k * 2.1) * amp;
      const jy = (k) => Math.cos(G.time * 9.3 + k * 1.7) * amp * 0.6;
      const top = L.ch.setting === 'office' ? 34 : 0;

      sk.text(ctx, t.cat, P.x + 84, P.y + 34 + top * 0.6, { size: 22, color: G.COL.soft });

      if (t.kind === 'choice') {
        sk.para(ctx, t.prompt, P.x + P.w / 2 + jx(9) * 0.3, P.y + 92, 720, { size: 38, align: 'center', valign: 'middle' });
        const rects = this.choiceRects(P);
        rects.forEach((r, s) => {
          const oi = t.slots[s];
          const rr = { x: (t.ax[oi] ?? r.x) + jx(oi), y: r.y + jy(oi), w: r.w, h: r.h };
          const hover = U.inRect(m.x, m.y, rr);
          sk.round(ctx, rr.x, rr.y, rr.w, rr.h, 12, { fill: hover ? '#fff1cc' : '#ffffff', w: 2.2 });
          G.ui.keycap(ctx, rr.x + 10, rr.y + 20, String(s + 1), { size: 15 });
          sk.text(ctx, t.options[oi], rr.x + rr.w / 2 + 8, rr.y + rr.h / 2 + 3, { size: 30, align: 'center', maxW: rr.w - 54 });
        });
      } else if (t.kind === 'timing') {
        sk.para(ctx, t.prompt, P.x + P.w / 2, P.y + 92, 700, { size: 30, align: 'center', valign: 'middle' });
        const bx = P.x + 110, bw = P.w - 220, by = P.y + 150, bh = 46;
        sk.rect(ctx, bx, by, bw, bh, { fill: '#ffffff', w: 2.4 });
        const zx = bx + bw * t.zone[0], zw = bw * (t.zone[1] - t.zone[0]);
        sk.rect(ctx, zx, by, zw, bh, { fill: 'rgba(79,154,91,0.35)', hatch: { color: G.COL.green, gap: 7, alpha: 0.6 }, color: G.COL.green, w: 2 });
        const mx = bx + bw * t.pos + jx(3) * 0.5;
        sk.line(ctx, mx, by - 14, mx, by + bh + 14, { w: 4, color: G.COL.red });
        sk.poly(ctx, [[mx - 9, by - 22], [mx + 9, by - 22], [mx, by - 10]], { fill: G.COL.red, color: G.COL.red, w: 1.5 });
        const kw = G.ui.keycap(ctx, P.x + P.w / 2 - 80, P.y + 232, 'SPACE', { size: 16 });
        sk.text(ctx, 'or click', P.x + P.w / 2 - 80 + kw + 10, P.y + 233, { size: 20, color: G.COL.soft });
      } else if (t.kind === 'seq') {
        sk.text(ctx, t.prompt, P.x + P.w / 2, P.y + 80, { size: 30, align: 'center' });
        const n = t.seq.length, w = 64, gap = 14;
        const x0 = P.x + P.w / 2 - (n * w + (n - 1) * gap) / 2;
        const sh = t.shake > 0 ? Math.sin(G.time * 70) * 8 * t.shake : 0;
        t.seq.forEach((dir, i) => {
          const x = x0 + i * (w + gap) + sh + jx(i) * 0.6, y = P.y + 112 + jy(i);
          const done = i < t.idx, cur = i === t.idx;
          let alpha = 1;
          if (!done && anger > 60 && Math.sin(G.time * 7 + i * 2.7) > 0.6) alpha = 0.25;
          ctx.save();
          ctx.globalAlpha *= alpha;
          sk.round(ctx, x, y, w, w, 10, { fill: done ? '#e3f1e3' : cur ? '#fff1cc' : '#ffffff', w: cur ? 3 : 2 });
          G.art.arrow(ctx, x + w / 2, y + w / 2, dir, 40, { color: done ? G.COL.green : G.COL.ink });
          ctx.restore();
        });
        this.arrowRects(P).forEach((r) => {
          const hover = U.inRect(m.x, m.y, r);
          sk.round(ctx, r.x, r.y, r.w, r.h, 8, { fill: hover ? '#fff1cc' : '#f4f1ea', w: 1.6 });
          G.art.arrow(ctx, r.x + r.w / 2, r.y + r.h / 2, r.dir, 26, { w: 2.4 });
        });
      }

      // time left
      const f = U.clamp(t.left / t.time, 0, 1);
      const bx = P.x + 84, bw = P.w - 130, by = P.y + P.h - 24;
      ctx.fillStyle = f < 0.3 ? 'rgba(210,69,58,0.55)' : 'rgba(42,38,34,0.25)';
      ctx.fillRect(bx, by - 5, bw * f, 10);
      sk.rect(ctx, bx, by - 5, bw, 10, { w: 1.4 });
    },
  };
})();
