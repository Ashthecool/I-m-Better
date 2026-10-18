// Title screen, generic cutscene player, end-of-chapter report.
(function () {
  'use strict';
  const G = window.G;
  const U = G.util, sk = G.sk, A = G.art;

  function ruled(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(111,163,208,0.18)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let y = 40; y < G.H; y += 34) { ctx.moveTo(0, y); ctx.lineTo(G.W, y); }
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ title
  class TitleScene {
    constructor() {
      this.help = false;
      this.t = 0;
      this.buttons = [
        new G.Button({ x: 540, y: 432, w: 200, h: 64, label: 'Play', size: 36, key: 'Enter', onClick: () => G.flow.newGame() }),
        new G.Button({ x: 540, y: 512, w: 200, h: 54, label: 'How to play', size: 28, key: 'KeyH', onClick: () => { this.help = true; } }),
      ];
    }
    enter() { G.audio.setMusic('title'); }
    update(dt) {
      this.t += dt;
      const I = G.input;
      if (this.help) {
        if (I.mouse.clicked || I.pressed('Escape') || I.pressed('KeyH') || I.pressed('Enter') || I.pressed('Space')) {
          I.eatClick();
          this.help = false;
        }
        return;
      }
      this.buttons.forEach((b) => b.update());
    }
    draw(ctx) {
      ruled(ctx);
      const ch = G.DATA.chapters[0], you = ch.cast.you, rv = ch.cast.rival;
      sk.text(ctx, "I'm Better!", 640, 150, { size: 132, align: 'center', rot: -0.03 });
      sk.curve(ctx, [[420, 222], [560, 214], [700, 226], [860, 210]], { color: G.COL.red, w: 4 });
      sk.text(ctx, 'a small game about jealousy', 640, 262, { size: 30, align: 'center', color: G.COL.soft });

      const look = 0.8 + Math.sin(this.t * 0.7) * 0.2;
      A.person(ctx, 380, 590, { standing: true, scale: 1.15, shirt: you.shirt, hair: you.hair, hairColor: you.hairColor, mood: 'annoyed', look });
      A.person(ctx, 900, 590, { standing: true, scale: 1.15, shirt: rv.shirt, hair: rv.hair, hairColor: rv.hairColor, mood: 'happy', arms: 'trophy', badge: true });
      for (let i = 0; i < 3; i++) {
        const a = this.t * 1.4 + (i * Math.PI * 2) / 3;
        sk.star(ctx, 900 + Math.cos(a) * 70, 360 + Math.sin(a) * 18, 9, { rot: a });
      }
      // a scribble of frustration over your head
      sk.curve(ctx, [[360, 330], [372, 318], [384, 334], [396, 318], [408, 332]], { color: G.COL.red, w: 2.4 });

      this.buttons.forEach((b) => b.draw(ctx));
      if (!G.touch) sk.text(ctx, 'M  sound   ·   F  fullscreen   ·   Esc  pause', 640, 690, { size: 20, align: 'center', color: G.COL.soft });
      const seen = G.save.get('endings', []);
      if (seen.length) sk.text(ctx, `Endings found: ${seen.length}/3`, 1250, 690, { size: 20, align: 'right', color: G.COL.soft });

      if (this.help) this.drawHelp(ctx);
    }
    drawHelp(ctx) {
      ctx.fillStyle = 'rgba(29,27,25,0.5)';
      ctx.fillRect(0, 0, G.W, G.H);
      sk.round(ctx, 240, 60, 800, 600, 16, { fill: G.COL.sheet, w: 3 });
      sk.text(ctx, 'How to play', 640, 112, { size: 52, align: 'center' });
      const ch = G.DATA.chapters[0];
      const lines = [
        ['Do your tasks.', G.touch
          ? 'Tap an answer. Tap the task when the marker is in the green zone. Tap the arrows in order.'
          : '1 2 3 to answer, SPACE for timing, ARROWS for sequences. Or just click.'],
        ['Others get praised.', 'Every time, your jealousy rises. Failing tasks makes it worse.'],
        ['Jealousy changes you.', 'Your eyes drift to them. Thoughts get in the way. Tasks get harder.'],
        ['If the bar fills, you explode.', 'Three outbursts and you\'re out.'],
        ['Take care of yourself.', G.touch
          ? `Hold Breathe · tap ${ch.breakLabel} for a short break · tap ${ch.talkLabel} to talk to a friend (once a day). They cost time — the clock keeps going.`
          : 'Hold Q to breathe · W for a short break · E to talk to a friend (once a day). They cost time — the clock keeps going.'],
        ['Thought bubbles.', G.ui.t('Click them to let them go.')],
      ];
      let y = 170;
      lines.forEach(([h, b]) => {
        sk.text(ctx, h, 290, y, { size: 28, color: G.COL.blue });
        y += 32;
        y += sk.para(ctx, b, 290, y, 700, { size: 23 }) + 12;
      });
      sk.text(ctx, G.ui.t('click to close'), 640, 630, { size: 22, align: 'center', color: G.COL.soft });
    }
  }

  // --------------------------------------------------------------- cutscene
  // slides: [{ text, sub, big, dark, draw(ctx, t), buttons: [{label, onClick}] }]
  class Cutscene {
    constructor(slides, onDone, opts = {}) {
      this.slides = slides;
      this.onDone = onDone;
      this.music = opts.music;
      this.i = 0;
      this.t = 0;
      this.buttons = null;
      this.setup();
    }
    enter() { if (this.music) G.audio.setMusic(this.music); }
    setup() {
      const s = this.slides[this.i];
      if (s.music) G.audio.setMusic(s.music);
      this.buttons = s.buttons
        ? s.buttons.map((b, k, arr) => new G.Button({
            x: 640 - (arr.length * 240 - 20) / 2 + k * 240, y: 610, w: 220, h: 56,
            label: b.label, size: 28, onClick: b.onClick, fill: '#fffdf8',
          }))
        : null;
    }
    cps() { return this.slides[this.i].big ? 22 : 38; }
    typed() {
      const s = this.slides[this.i];
      return this.t * this.cps() >= s.text.length + (s.sub ? s.sub.length * 0.5 : 0);
    }
    update(dt) {
      this.t += dt;
      const I = G.input;
      const s = this.slides[this.i];
      if (this.buttons && this.typed()) { this.buttons.forEach((b) => b.update()); return; }
      const adv = I.mouse.clicked || I.pressed('Space') || I.pressed('Enter');
      if (!adv) return;
      I.eatClick();
      if (!this.typed()) { this.t = 99; return; }
      if (this.t < (s.hold || 0.4) || this.buttons) return;
      if (this.i < this.slides.length - 1) { this.i++; this.t = 0; this.setup(); }
      else if (this.onDone) { const f = this.onDone; this.onDone = null; f(); }
    }
    draw(ctx) {
      const s = this.slides[this.i];
      const dark = !!s.dark;
      ctx.fillStyle = dark ? G.COL.dark : G.COL.paper;
      ctx.fillRect(0, 0, G.W, G.H);
      if (!dark) ruled(ctx);
      const k = U.smooth(0, 0.6, this.t);
      sk.ink = dark ? '#efe7da' : null;
      ctx.save();
      ctx.globalAlpha = k;
      if (s.draw) s.draw(ctx, this.t, dark);
      ctx.restore();

      const col = dark ? '#f3ede2' : G.COL.ink;
      const n = Math.floor(this.t * this.cps());
      if (s.big) {
        sk.para(ctx, s.text.slice(0, n), 640, s.textY || 330, 1000, { size: 64, align: 'center', valign: 'middle', color: col });
      } else {
        sk.para(ctx, s.text.slice(0, n), 640, s.textY || 590, 1040, { size: 38, align: 'center', valign: 'middle', color: col });
      }
      if (s.sub) {
        const m = Math.max(0, Math.floor((this.t * this.cps() - s.text.length) * 2));
        sk.para(ctx, s.sub.slice(0, m), 640, (s.textY || (s.big ? 330 : 590)) + (s.big ? 90 : 56), 1000,
          { size: 28, align: 'center', valign: 'middle', color: dark ? '#b9b0a3' : G.COL.soft });
      }
      sk.ink = null;
      if (this.buttons && this.typed()) this.buttons.forEach((b) => b.draw(ctx));
      else if (this.typed() && this.t > (s.hold || 0.4)) {
        sk.text(ctx, '▸', 1236, 680, { size: 34, align: 'center', color: dark ? '#b9b0a3' : G.COL.soft, alpha: 0.5 + 0.5 * Math.sin(G.time * 4) });
      }
    }
  }

  // ----------------------------------------------------------------- report
  class ReportScene {
    constructor(ci, days, kicked) {
      this.ch = G.DATA.chapters[ci];
      this.days = days;
      this.kicked = kicked;
      this.f = (s) => G.fmt(s, this.ch);
      this.total = days.reduce((a, d) => a + d.score, 0);
      this.target = this.ch.days.reduce((a, d) => a + d.target, 0);
      const ratio = this.total / this.target;
      this.grade = ratio >= 0.9 ? 'A' : ratio >= 0.72 ? 'B' : ratio >= 0.5 ? 'C' : ratio >= 0.35 ? 'D' : 'F';
      this.passed = !kicked && 'ABC'.includes(this.grade);
      this.outbursts = days.reduce((a, d) => a + d.outbursts, 0);
      this.t = 0;
      this.stamped = false;
      this.btn = new G.Button({ x: 1000, y: 620, w: 220, h: 58, label: 'Continue', key: ['Enter', 'Space'], onClick: () => G.flow.reportDone(this.passed) });
    }
    enter() { G.audio.setMusic('title'); }
    update(dt) {
      this.t += dt;
      if (!this.stamped && this.t > 1.8) { this.stamped = true; G.audio.sfx.stamp(); G.shake(5, 0.2); }
      if (this.t > 2.2) this.btn.update();
    }
    draw(ctx) {
      const ch = this.ch, r = ch.report;
      ctx.fillStyle = '#d9cdb8';
      ctx.fillRect(0, 0, G.W, G.H);
      sk.hatch(ctx, 0, 0, G.W, G.H, { gap: 22, alpha: 0.1 });
      sk.round(ctx, 336, 36, 620, 650, 8, { fill: 'rgba(0,0,0,0.15)', stroke: false });
      sk.round(ctx, 330, 30, 620, 650, 8, { fill: '#fffef9', w: 2.4 });
      sk.text(ctx, r.title, 640, 82, { size: 50, align: 'center' });
      sk.text(ctx, this.f(r.sub), 640, 124, { size: 24, align: 'center', color: G.COL.soft });
      sk.line(ctx, 370, 150, 910, 150, { w: 2 });

      ch.days.forEach((d, i) => {
        const y = 186 + i * 42;
        const res = this.days[i];
        sk.text(ctx, d.name, 380, y, { size: 28 });
        sk.text(ctx, res ? String(res.score) : '—', 700, y, { size: 28, align: 'right' });
      });
      sk.line(ctx, 370, 300, 720, 300, { w: 1.6 });
      sk.text(ctx, 'Total', 380, 330, { size: 30 });
      sk.text(ctx, `${this.total} / ${this.target}`, 700, 330, { size: 30, align: 'right' });
      sk.text(ctx, 'Outbursts', 380, 372, { size: 26, color: G.COL.soft });
      sk.text(ctx, String(this.outbursts), 700, 372, { size: 26, align: 'right', color: this.outbursts ? G.COL.red : G.COL.soft });

      // grade
      const gk = U.smooth(0.6, 0.9, this.t);
      if (gk > 0) {
        ctx.save();
        ctx.globalAlpha *= gk;
        ctx.translate(830, 260);
        ctx.scale(1.4 - 0.4 * gk, 1.4 - 0.4 * gk);
        sk.ellipse(ctx, 0, 0, 62, 58, { color: G.COL.red, w: 3.4 });
        sk.text(ctx, this.grade, 0, 4, { size: 92, align: 'center', color: G.COL.red });
        ctx.restore();
      }

      sk.para(ctx, this.f(r.comment[this.grade]), 640, 430, 540, { size: 26, align: 'center', color: '#5b5249' });

      // there's always someone better
      const rk = U.smooth(1.1, 1.4, this.t);
      ctx.save();
      ctx.globalAlpha *= rk;
      sk.round(ctx, 380, 478, 520, 54, 10, { fill: '#fff5d8', color: G.COL.gold, w: 2 });
      sk.star(ctx, 412, 505, 13);
      sk.text(ctx, this.f(r.rival), 660, 507, { size: 26, align: 'center', maxW: 440 });
      ctx.restore();

      // verdict stamp
      if (this.t > 1.8) {
        const sk2 = U.smooth(1.8, 1.95, this.t);
        const ok = this.passed;
        const word = this.kicked ? r.verdictKicked : ok ? r.verdictPass : r.verdictFail;
        const col = ok ? G.COL.green : G.COL.red;
        ctx.save();
        ctx.translate(640, 598);
        ctx.rotate(-0.08);
        ctx.scale(2 - sk2, 2 - sk2);
        ctx.globalAlpha *= sk2 * 0.9;
        const w = sk.measure(ctx, word, 54) + 50;
        sk.round(ctx, -w / 2, -38, w, 76, 10, { color: col, w: 4 });
        sk.text(ctx, word, 0, 2, { size: 54, align: 'center', color: col });
        ctx.restore();
        sk.text(ctx, this.kicked ? r.kicked : ok ? r.pass : r.fail, 640, 662, { size: 22, align: 'center', color: G.COL.soft, alpha: U.smooth(2, 2.4, this.t) });
      }
      if (this.t > 2.2) this.btn.draw(ctx);
    }
  }

  G.TitleScene = TitleScene;
  G.Cutscene = Cutscene;
  G.ReportScene = ReportScene;
})();
