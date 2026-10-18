// One day of school or work: tasks, praise for everyone else, rising jealousy,
// coping tools, outbursts.
(function () {
  'use strict';
  const G = window.G;
  const U = G.util, sk = G.sk, A = G.art;

  const P = { x: 20, y: 412, w: 840, h: 290 };
  const SIDE = { x: 880, y: 412, w: 380, h: 290 };
  const DESK_Y = 330;
  const ORDER = ['friend', 'you', 'rival', 'o1', 'o2'];
  const COPE = {
    breathe: { x: 895, y: 462, w: 350, h: 70 },
    brk: { x: 895, y: 542, w: 350, h: 70 },
    talk: { x: 895, y: 622, w: 350, h: 70 },
  };

  function angerColor(a) {
    return a < 50 ? U.mixHex('#6fa3d0', '#e0a526', a / 50) : U.mixHex('#e0a526', '#d2453a', (a - 50) / 50);
  }

  class LevelScene {
    constructor(ci, di) {
      this.ci = ci;
      this.di = di;
      this.ch = G.DATA.chapters[ci];
      this.day = this.ch.days[di];
      this.P = P;
      this.f = (s) => G.fmt(s, this.ch);
      this.runOutbursts0 = G.run.chapterOutbursts;

      this.timeLeft = this.day.duration;
      this.anger = this.day.start;
      this.shown = this.anger;
      this.focus = 0;
      this.score = 0;
      this.done = 0;
      this.missed = 0;
      this.praise = { you: 0, rival: 0, other: 0 };
      this.outbursts = 0;

      this.state = 'intro';
      this.stateT = 0;
      this.task = null;
      this.gap = 0.6;
      this.lastType = null;
      this.flash = null;
      this.praiseT = U.rand(this.day.praise[0], this.day.praise[1]) * 0.6 + 2;
      this.forceSting = false;
      this.streak = 0;

      this.thoughts = [];
      this.thoughtT = 3;
      this.fx = [];
      this.bubbles = {};
      this.timers = [];

      this.breathing = false;
      this.breathT = 0;
      this.breathPhase = -1;
      this.breakT = 0;
      this.breakCD = 0;
      this.breakInfo = null;
      this.talkUsed = false;
      this.talk = null;

      this.sadT = 0;
      this.happyT = 0;
      this.rivalHappyT = 0;
      this.bossMood = 'neutral';
      this.bossMoodT = 0;
      this.bossLook = 1;
      this.look = 0;
      this.redFlash = 0;
      this.kindAt = this.day.duration * U.rand(0.3, 0.55);
      this.kindDone = false;
      this.out = null;
      this.stars = Object.assign({}, this.ch.stars);

      this.endBtn = new G.Button({ x: 540, y: 548, w: 200, h: 58, label: 'Continue', key: ['Enter', 'Space'], onClick: () => this.leave() });
      this.pauseBtns = [
        new G.Button({ x: 520, y: 290, w: 240, h: 56, label: 'Resume', onClick: () => { this.state = this.prevState; } }),
        new G.Button({ x: 520, y: 360, w: 240, h: 56, label: 'Restart day', onClick: () => this.restart() }),
        new G.Button({ x: 520, y: 430, w: 240, h: 56, label: 'Quit to title', onClick: () => G.flow.toTitle() }),
      ];
    }

    enter() { G.audio.setMusic('play'); }
    exit() { G.audio.tension = 0; }

    restart() {
      G.run.chapterOutbursts = this.runOutbursts0;
      const ci = this.ci, di = this.di;
      G.goto(() => new LevelScene(ci, di));
    }

    // ------------------------------------------------------------ helpers
    say(who, text, dur = 3.2) {
      this.bubbles[who] = { text, t: 0, dur };
      if (who === 'boss') this.bossTalkT = dur;
    }
    later(t, fn) { this.timers.push({ t, fn }); }
    addText(text, x, y, color, size = 26, world = false) {
      this.fx.push({ kind: 'text', text, x, y, color, size, t: 0, max: 1.2, world });
    }
    burst(id, n = 5) {
      const x = this.ch.seatX[id];
      for (let i = 0; i < n; i++) {
        this.fx.push({ kind: 'star', x: x + U.rand(-30, 30), y: DESK_Y - 110, vx: U.rand(-40, 40), vy: U.rand(-90, -40), r: U.rand(6, 11), rot: U.rand(0, 6), t: 0, max: U.rand(1, 1.6), world: true });
      }
    }

    // ------------------------------------------------------------ update
    update(dt) {
      const I = G.input;
      this.stateT += dt;
      this.tick(dt);

      const live = this.state === 'play' || this.state === 'talk';
      G.audio.tension = live ? U.smooth(35, 100, this.anger) : G.audio.tension * 0.97;
      this.shown += (this.anger - this.shown) * Math.min(1, dt * 6);
      this.focus += (U.smooth(45, 100, this.anger) - this.focus) * Math.min(1, dt * 2);

      if (this.state === 'intro') {
        if (this.stateT > 0.35 && (I.mouse.clicked || I.pressed('Space') || I.pressed('Enter'))) {
          I.eatClick();
          this.state = 'play';
          this.stateT = 0;
        }
        return;
      }
      if (this.state === 'paused') {
        if (I.pressed('Escape')) { this.state = this.prevState; return; }
        this.pauseBtns.forEach((b) => b.update());
        return;
      }
      if (I.pressed('Escape') && live) {
        this.prevState = this.state;
        this.state = 'paused';
        return;
      }
      if (this.state === 'outburst') return this.tickOutburst();
      if (this.state === 'talk') return this.tickTalk(dt);
      if (this.state === 'endline') {
        if (this.stateT > 3.6) { this.state = 'end'; this.stateT = 0; }
        return;
      }
      if (this.state === 'end') {
        if (this.stateT > 0.5) this.endBtn.update();
        return;
      }
      this.tickPlay(dt);
    }

    // Animations & timers that run in every state.
    tick(dt) {
      const paused = this.state === 'paused';
      if (paused) return;
      for (const k in this.bubbles) {
        const b = this.bubbles[k];
        b.t += dt;
        if (b.t > b.dur) delete this.bubbles[k];
      }
      this.timers = this.timers.filter((tm) => {
        tm.t -= dt;
        if (tm.t <= 0) { tm.fn(); return false; }
        return true;
      });
      this.fx = this.fx.filter((f) => {
        f.t += dt;
        if (f.kind === 'star') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 60 * dt; f.rot += dt * 3; }
        else f.y -= 30 * dt;
        return f.t < f.max;
      });
      this.thoughts = this.thoughts.filter((th) => {
        th.t += dt * (this.anger < 20 ? 2.5 : 1);
        if (th.popping) th.popping += dt;
        th.x += th.vx * dt;
        th.y += th.vy * dt;
        if (th.x < P.x + 20 || th.x + th.w > P.x + P.w - 20) th.vx *= -1;
        if (th.y < P.y + 40 || th.y + th.h > P.y + P.h - 30) th.vy *= -1;
        th.box = { x: th.x - 14, y: th.y - 18, w: th.w + 28, h: th.h + 36 };
        return th.t < th.max && th.popping < 0.25;
      });
      if (this.flash) this.flash.t += dt;
      this.sadT -= dt;
      this.happyT -= dt;
      this.rivalHappyT -= dt;
      this.bossMoodT -= dt;
      this.bossTalkT = (this.bossTalkT || 0) - dt;
      this.redFlash = Math.max(0, this.redFlash - dt * 1.2);

      // where the player is looking
      let target = this.focus > 0.15 ? 0.4 + this.focus * 0.6 : 0;
      if (this.bossTalkT > 0 && this.focus < 0.5) target = -0.8;
      if (this.breakT > 0 && this.breakInfo) target = this.breakInfo.look;
      if (this.state === 'talk') target = -1;
      this.look += (target - this.look) * Math.min(1, dt * 5);
    }

    tickPlay(dt) {
      const I = G.input, m = I.mouse;
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeLeft = 0; return this.endDay(false); }
      if (this.timeLeft < 5 && Math.floor(this.timeLeft + dt) !== Math.floor(this.timeLeft)) G.audio.sfx.tick();

      // 1) intrusive thoughts eat clicks first: "let it go"
      if (m.clicked) {
        for (let i = this.thoughts.length - 1; i >= 0; i--) {
          const th = this.thoughts[i];
          if (!th.popping && U.inRect(m.x, m.y, th.box)) {
            th.popping = 0.001;
            I.eatClick();
            this.anger -= 3;
            G.audio.sfx.pop();
            this.addText('let it go', th.x + th.w / 2, th.y, G.COL.blue, 22);
            break;
          }
        }
      }

      // 2) coping tools
      const onBreathe = U.inRect(m.x, m.y, COPE.breathe);
      if (m.clicked && onBreathe) I.eatClick();
      if ((I.down('KeyQ') || (m.down && onBreathe)) && this.breakT <= 0) {
        this.breathing = true;
        this.breathT += dt;
        this.anger -= dt * (this.breathT > 0.5 ? 15 : 5);
        const ph = Math.floor(this.breathT / 4) % 2;
        if (ph !== this.breathPhase) { this.breathPhase = ph; G.audio.sfx.breath(ph === 0); }
      } else {
        this.breathing = false;
        this.breathT = 0;
        this.breathPhase = -1;
      }

      if (this.breakCD > 0) this.breakCD -= dt;
      const brkClick = m.clicked && U.inRect(m.x, m.y, COPE.brk);
      if (brkClick) I.eatClick();
      if (I.pressed('KeyW') || brkClick) {
        if (this.breakCD <= 0 && this.breakT <= 0 && !this.breathing) {
          this.breakT = 3.2;
          this.breakCD = 16;
          this.breakInfo = U.pick(this.ch.breaks);
          G.audio.sfx.soft();
        } else G.audio.sfx.nope();
      }
      if (this.breakT > 0) {
        this.breakT -= dt;
        this.anger -= dt * 8.5;
      }

      const talkClick = m.clicked && U.inRect(m.x, m.y, COPE.talk);
      if (talkClick) I.eatClick();
      if (I.pressed('KeyE') || talkClick) {
        if (!this.talkUsed && !this.breathing && this.breakT <= 0) return this.startTalk();
        G.audio.sfx.nope();
      }

      const busy = this.breathing || this.breakT > 0;

      // 3) the world keeps going without you
      this.anger += dt * this.day.creep * (0.6 + this.anger / 50);
      this.praiseT -= dt;
      if (this.praiseT <= 0) {
        this.firePraise();
        this.praiseT = U.rand(this.day.praise[0], this.day.praise[1]);
      }
      if (!this.kindDone && this.day.duration - this.timeLeft > this.kindAt) this.rivalKindness();

      if (this.anger > 30) {
        this.thoughtT -= dt * (0.4 + (this.anger - 30) / 25);
        if (this.thoughtT <= 0) {
          this.thoughtT = U.rand(2.5, 4);
          if (this.thoughts.length < 5) this.spawnThought();
        }
      }

      // 4) the actual work
      if (!busy) {
        if (!this.task) {
          this.gap -= dt;
          if (this.gap <= 0) this.task = G.Tasks.make(this);
        } else {
          const t = this.task;
          t.left -= dt;
          t.age += dt;
          G.Tasks.update(t, this, dt);
          if (t.result === null && t.left <= 0) { t.result = false; t.timeout = true; }
          if (t.result !== null) this.resolve(t);
        }
      }

      this.anger = U.clamp(this.anger, 0, 100);
      if (this.anger >= 100) this.startOutburst();
    }

    resolve(t) {
      const cx = P.x + P.w / 2, cy = P.y + 70;
      if (t.result) {
        const gain = 6 + Math.round((4 * t.left) / t.time);
        this.score += gain;
        this.done++;
        this.streak++;
        this.anger -= 2;
        this.flash = { ok: true, t: 0 };
        this.addText('+' + gain, cx + 120, cy, G.COL.green, 34);
        G.audio.sfx.good();
        // ...and right when you feel good, someone else gets the spotlight.
        if (Math.random() < 0.28 && this.praiseT > 1.2) {
          this.praiseT = 0.9;
          this.forceSting = true;
        }
      } else {
        this.score -= 4;
        this.missed++;
        this.streak = 0;
        this.anger += 7;
        this.sadT = 1.2;
        this.flash = { ok: false, t: 0, text: t.timeout ? 'Too slow!' : 'Wrong!' };
        this.addText('-4', cx + 120, cy, G.COL.red, 34);
        G.audio.sfx.bad();
      }
      this.task = null;
      this.gap = 0.8;
    }

    firePraise() {
      const lines = this.ch.praise;
      let who;
      if (this.forceSting) { who = 'sting'; this.forceSting = false; }
      else {
        const r = Math.random();
        const youChance = 0.08 + Math.min(0.2, this.streak * 0.05);
        who = r < youChance ? 'you' : r < youChance + 0.62 ? 'rival' : 'other';
      }
      if (who === 'you') {
        this.say('boss', this.f(U.pick(lines.you)));
        this.bossLook = 1;
        this.praise.you++;
        this.stars.you = (this.stars.you || 0) + 1;
        this.anger -= this.anger > 60 ? 3 : 12;
        this.happyT = 2;
        this.burst('you', 3);
        G.audio.sfx.praiseMe();
        if (this.anger > 60) this.later(1.2, () => this.spawnThought(this.f('...it sounded nicer when it was {rival}.')));
      } else if (who === 'rival' || who === 'sting') {
        this.say('boss', this.f(U.pick(who === 'sting' ? lines.sting : lines.rival)));
        this.bossLook = 1;
        this.praise.rival++;
        this.stars.rival = (this.stars.rival || 0) + 1;
        this.anger += this.day.sting * (who === 'sting' ? 1.3 : 1) * (1 + this.anger / 200);
        this.sadT = 1.8;
        this.rivalHappyT = 2.5;
        this.burst('rival', 6);
        G.audio.sfx.praise();
      } else {
        const [id, text] = U.pick(lines.other);
        this.say('boss', this.f(text));
        this.bossLook = this.ch.seatX[id] < this.ch.bossX ? -1 : 1;
        this.praise.other++;
        if (id in this.stars) this.stars[id]++;
        this.anger += this.day.sting * 0.45;
        this.burst(id, 3);
        G.audio.sfx.praise();
      }
    }

    rivalKindness() {
      this.kindDone = true;
      const k = this.ch.kind;
      this.say('rival', this.f(k.line), 3);
      if (this.anger < 50) {
        this.anger -= 8;
        this.later(1.6, () => this.say('you', this.f(k.good), 2.4));
      } else {
        this.anger += 5;
        this.later(1.4, () => this.spawnThought(this.f(k.bad)));
      }
    }

    spawnThought(text) {
      const showing = this.thoughts.map((th) => th.text);
      const fresh = this.ch.thoughts.map(this.f).filter((s) => !showing.includes(s));
      const txt = text || U.pick(fresh.length ? fresh : this.ch.thoughts.map(this.f));
      const w = sk.measure(G.ctx, txt, 22) + 12, h = 26;
      const x = U.rand(P.x + 40, Math.max(P.x + 41, P.x + P.w - w - 40));
      const y = U.rand(P.y + 60, P.y + P.h - h - 50);
      this.thoughts.push({ text: txt, x, y, w, h, vx: U.rand(-14, 14), vy: U.rand(-8, 8), t: 0, max: U.rand(6, 9), popping: 0, box: { x, y, w, h } });
    }

    startOutburst() {
      const list = this.ch.outbursts;
      this.out = list[Math.min(G.run.chapterOutbursts, list.length - 1)];
      G.run.chapterOutbursts++;
      this.outbursts++;
      this.state = 'outburst';
      this.stateT = 0;
      this.outReplied = false;
      this.breathing = false;
      this.breakT = 0;
      this.task = null;
      this.gap = 1.2;
      this.thoughts.forEach((th) => { th.popping = th.popping || 0.001; });
      this.score -= 20;
      this.redFlash = 1;
      G.shake(16, 0.7);
      G.audio.sfx.outburst();
      this.say('you', this.f(this.out.say), 3);
      this.addText('-20', P.x + P.w / 2, P.y + 110, G.COL.red, 48);
    }

    tickOutburst() {
      if (!this.outReplied && this.stateT > 1.7) {
        this.outReplied = true;
        const shout = this.bubbles.you;
        if (shout) shout.dur = Math.min(shout.dur, shout.t + 0.3);
        this.say('boss', this.f(this.out.reply), 2.6);
        this.bossMood = 'angry';
        this.bossMoodT = 3;
        this.bossLook = 1;
      }
      if (this.stateT > 4.4) {
        this.anger = 38;
        this.out = null;
        if (G.run.chapterOutbursts >= 3) return this.endDay(true);
        this.state = 'play';
        this.stateT = 0;
      }
    }

    startTalk() {
      this.talkUsed = true;
      this.state = 'talk';
      this.stateT = 0;
      const lines = this.ch.talks[this.di] || this.ch.talks[0];
      this.talk = { lines: lines.map(([who, txt]) => ({ who, txt: this.f(txt) })), i: 0, t: 0 };
      G.audio.sfx.soft();
    }

    tickTalk(dt) {
      const I = G.input, T = this.talk;
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      this.anger = Math.max(0, this.anger - dt * 6);
      T.t += dt;
      const ln = T.lines[T.i];
      const full = T.t * 45 >= ln.txt.length;
      if (I.mouse.clicked || I.pressed('Space') || I.pressed('Enter') || I.pressed('KeyE')) {
        I.eatClick();
        if (!full) T.t = ln.txt.length / 45 + 0.01;
        else if (T.i < T.lines.length - 1) { T.i++; T.t = 0; }
        else {
          this.anger = Math.max(0, this.anger - 15);
          this.talk = null;
          this.state = 'play';
          this.happyT = 1.5;
          this.addText('You feel a bit lighter.', P.x + P.w / 2, P.y + 140, G.COL.blue, 30);
          if (this.timeLeft <= 0) this.endDay(false);
        }
      }
    }

    endDay(kicked) {
      this.kicked = kicked;
      this.task = null;
      this.breathing = false;
      this.breakT = 0;
      this.thoughts.forEach((th) => { th.popping = th.popping || 0.001; });
      this.state = 'endline';
      this.stateT = 0;
      if (kicked) {
        this.say('boss', this.f(this.ch.kickedLine), 3.4);
        this.bossMood = 'angry';
        this.bossMoodT = 4;
      } else {
        this.say('boss', this.f(this.ch.dayEnd[this.di]), 3.4);
        this.bossLook = 1;
        this.burst('rival', 8);
        this.stars.rival++;
        this.rivalHappyT = 3.5;
        this.sadT = 3;
        G.audio.sfx.praise();
      }
    }

    leave() {
      if (this.left) return;
      this.left = true;
      G.flow.dayDone({
        name: this.day.name,
        score: Math.max(0, this.score),
        done: this.done,
        missed: this.missed,
        praise: this.praise,
        outbursts: this.outbursts,
      }, this.kicked);
    }

    // ------------------------------------------------------------ drawing
    draw(ctx) {
      this.drawWorld(ctx);
      this.drawHUD(ctx);
      this.drawPanel(ctx);
      this.drawCope(ctx);
      this.drawThoughts(ctx);
      this.drawVignette(ctx);
      this.drawOverlays(ctx);
    }

    drawWorld(ctx) {
      const ch = this.ch;
      const rx = ch.seatX.rival, z = 1 + 0.2 * this.focus;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 61, G.W, 343);
      ctx.clip();
      // Jealousy narrows your world: the camera drifts onto the rival.
      ctx.translate(rx, 250);
      ctx.scale(z, z);
      ctx.translate(-rx, -250);
      const room = { stars: this.stars, cast: ch.cast, board: ch.board[this.di], streak: this.stars.rival };
      if (ch.setting === 'classroom') A.classroom(ctx, room); else A.office(ctx, room);
      this.drawBoss(ctx);
      ORDER.forEach((id) => this.drawSeat(ctx, id));
      this.drawGlare(ctx);
      this.drawFx(ctx, true);
      this.drawBubbles(ctx);
      ctx.restore();
      sk.line(ctx, 0, 405, G.W, 405, { w: 2.5 });
    }

    outAnim() {
      if (this.state !== 'outburst' || !this.out) return null;
      const t = this.stateT;
      const up = U.smooth(0, 0.25, t) * (1 - U.smooth(3.7, 4.3, t));
      const bump = U.smooth(0.15, 0.45, t) * (1 - U.smooth(1.0, 1.6, t));
      return { t, up, bump, kind: this.out.kind };
    }

    drawSeat(ctx, id) {
      const ch = this.ch, c = ch.cast[id], x = ch.seatX[id];
      const oa = this.outAnim();
      const p = {
        desk: ch.setting === 'classroom' ? 'school' : 'office',
        shirt: c.shirt, hair: c.hair, hairColor: c.hairColor, glasses: c.glasses,
        tie: c.tie, lanyard: c.lanyard, adult: ch.adult,
        mood: 'neutral', look: 0, lookY: 0,
      };
      if (id === 'you') {
        p.look = this.look;
        if (this.breakT > 0 && this.breakInfo) p.lookY = this.breakInfo.lookY;
        if (oa) {
          p.mood = oa.t < 3.4 ? 'shout' : 'sad';
          p.standUp = oa.up;
          if (oa.kind === 'yell') p.arms = 'up';
          if (oa.kind === 'slam') { p.arms = 'slam'; p.deskShake = oa.bump; }
          if (oa.kind === 'shove') { p.arms = oa.bump > 0.05 ? 'shove' : undefined; p.dx = oa.bump * 120; }
        } else if (this.breathing) p.mood = 'breathe';
        else if (this.breakT > 0) p.mood = 'content';
        else if (this.state === 'talk') p.mood = this.anger < 40 ? 'content' : 'sad';
        else if (this.happyT > 0 && this.anger < 60) p.mood = 'happy';
        else if (this.sadT > 0) p.mood = this.anger > 70 ? 'angry' : 'sad';
        else p.mood = this.anger < 22 ? 'neutral' : this.anger < 48 ? 'annoyed' : this.anger < 78 ? 'angry' : 'furious';
        p.tear = p.mood === 'sad' && this.anger > 50;
        p.writing = !!this.task && !this.breathing;
      } else {
        p.writing = Math.sin(G.time * 0.6 + x) > -0.3;
        p.look = Math.sin(G.time * 0.3 + x) * 0.25;
        if (id === 'rival') {
          p.mood = this.rivalHappyT > 0 ? 'happy' : 'content';
          p.badge = true;
          if (oa && oa.kind === 'shove') p.tilt = U.smooth(0.3, 0.5, oa.t) * (1 - U.smooth(1.4, 2.2, oa.t)) * 0.35;
        }
        if (id === 'friend' && this.state === 'talk') { p.mood = 'happy'; p.look = 1; p.writing = false; }
        if (oa && oa.t > 0.25) {
          p.mood = 'shock';
          p.look = Math.sign(ch.seatX.you - x);
          p.writing = false;
        }
      }
      A.person(ctx, x, DESK_Y, p);
    }

    drawBoss(ctx) {
      const ch = this.ch, b = ch.boss;
      const talking = !!this.bubbles.boss;
      let mood = this.bossMoodT > 0 ? this.bossMood : talking ? 'happy' : 'neutral';
      let arms = talking && mood !== 'angry' ? 'thumb' : Math.sin(G.time * 0.5) > 0.2 ? 'point' : null;
      if (this.state === 'outburst' && this.stateT > 0.25 && !this.outReplied) mood = 'shock';
      A.person(ctx, ch.bossX, 287, {
        standing: true, scale: 0.82, dress: b.dress, shirt: b.shirt, tie: b.tie,
        hair: b.hair, hairColor: b.hairColor, glasses: b.glasses, adult: true,
        mood, arms, look: talking || this.state === 'outburst' ? this.bossLook : 0.6,
      });
    }

    drawGlare(ctx) {
      if (this.focus < 0.3 || this.state !== 'play') return;
      const a = U.smooth(0.3, 0.9, this.focus);
      const x0 = this.ch.seatX.you + 18, x1 = this.ch.seatX.rival - 24, y = DESK_Y - 76;
      ctx.save();
      ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(G.time * 8));
      for (let x = x0; x < x1 - 10; x += 22) sk.line(ctx, x, y + Math.sin(x * 0.2 + G.time * 10) * 2, x + 11, y, { color: G.COL.red, w: 2.4, single: true });
      ctx.restore();
    }

    anchor(who) {
      const ch = this.ch;
      if (who === 'boss') return { x: ch.bossX + 6, y: 287 - 180 * 0.82 };
      const oa = this.outAnim();
      const up = who === 'you' && oa ? oa.up * 28 : 0;
      return { x: ch.seatX[who], y: DESK_Y - 125 - up };
    }

    drawBubbles(ctx) {
      for (const who in this.bubbles) {
        const b = this.bubbles[who];
        const shout = who === 'you' && this.state === 'outburst';
        const size = shout ? 34 : 22;
        const lines = sk.wrap(ctx, b.text, shout ? 440 : 330, size);
        const tw = Math.max(...lines.map((l) => sk.measure(ctx, l, size)));
        const w = tw + 34, h = lines.length * size * 1.2 + 18;
        const an = this.anchor(who);
        let x, y;
        if (who === 'boss') { x = an.x + 26; y = Math.max(68, an.y - h - 6); }
        else { x = U.clamp(an.x - w / 2, 10, G.W - w - 10); y = Math.max(68, an.y - h - 12); }
        const pop = U.smooth(0, 0.15, b.t), fade = 1 - U.smooth(b.dur - 0.3, b.dur, b.t);
        ctx.save();
        ctx.globalAlpha *= fade;
        ctx.translate(x + w / 2, y + h);
        ctx.scale(0.8 + 0.2 * pop, 0.8 + 0.2 * pop);
        ctx.translate(-(x + w / 2), -(y + h));
        const tx = who === 'boss' ? an.x + 12 : an.x, ty = who === 'boss' ? an.y + 12 : an.y + 8;
        sk.bubble(ctx, x, y, w, h, tx, ty, { fill: shout ? '#fff0ee' : '#ffffff', color: shout ? G.COL.red : null, w: shout ? 3.2 : 2 });
        lines.forEach((l, i) => sk.text(ctx, l, x + w / 2, y + 12 + size * 0.6 + i * size * 1.2, { size, align: 'center', color: shout ? G.COL.red : G.COL.ink }));
        ctx.restore();
      }
    }

    drawFx(ctx, world) {
      this.fx.forEach((f) => {
        if (!!f.world !== world) return;
        const a = 1 - U.smooth(f.max * 0.6, f.max, f.t);
        ctx.save();
        ctx.globalAlpha *= a;
        if (f.kind === 'star') sk.star(ctx, f.x, f.y, f.r, { rot: f.rot });
        else sk.text(ctx, f.text, f.x, f.y, { size: f.size, align: 'center', color: f.color, outline: 5 });
        ctx.restore();
      });
    }

    drawHUD(ctx) {
      const ch = this.ch;
      ctx.fillStyle = '#e9e1d2';
      ctx.fillRect(0, 0, G.W, 60);
      sk.line(ctx, 0, 60, G.W, 60, { w: 2.5 });
      sk.text(ctx, `${ch.title} · ${this.day.name}`, 22, 31, { size: 28 });

      const low = this.timeLeft < 10 && this.state === 'play';
      sk.ellipse(ctx, 296, 31, 12, 12, { fill: '#fff', w: 1.8 });
      sk.line(ctx, 296, 31, 296, 23, { w: 1.6, single: true });
      sk.line(ctx, 296, 31, 302, 33, { w: 1.6, single: true });
      sk.text(ctx, U.fmtTime(this.timeLeft), 316, 32, { size: 30, color: low ? G.COL.red : G.COL.ink });
      sk.text(ctx, `Score ${this.score}`, 400, 32, { size: 28 });

      sk.text(ctx, 'Outbursts', 545, 32, { size: 20, color: G.COL.soft });
      for (let i = 0; i < 3; i++) {
        const on = i < G.run.chapterOutbursts;
        sk.ellipse(ctx, 640 + i * 24, 31, 8, 8, { fill: on ? G.COL.red : '#fff', w: 1.6 });
      }

      const a = this.shown;
      const bx = 820, bw = 340, by = 18, bh = 26;
      const jit = a > 75 ? Math.sin(G.time * 40) * (a - 75) * 0.06 : 0;
      sk.text(ctx, 'Jealousy', bx - 12, 32, { size: 24, align: 'right', color: a > 75 ? G.COL.red : G.COL.ink });
      ctx.save();
      ctx.translate(jit, 0);
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(bx, by, bw, bh);
      const fw = (bw * a) / 100;
      const col = angerColor(a);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = col;
      ctx.fillRect(bx, by, fw, bh);
      ctx.globalAlpha = 1;
      sk.scribble(ctx, bx + 2, by + 3, fw - 4, bh - 6, { color: col, w: 3, step: 6 });
      sk.rect(ctx, bx, by, bw, bh, { w: 2.2 });
      ctx.restore();

      // little face mirrors your mood
      let mood = a < 22 ? 'neutral' : a < 48 ? 'annoyed' : a < 78 ? 'angry' : 'furious';
      if (this.breathing) mood = 'breathe';
      sk.ellipse(ctx, 1210, 31, 20, 21, { fill: '#fffaf2', w: 2 });
      A.face(ctx, 1210, 31, 20, mood, {});
    }

    drawPanel(ctx) {
      if (this.ch.setting === 'classroom') A.notebook(ctx, P); else A.monitor(ctx, P);
      if (this.task) {
        G.Tasks.draw(ctx, this.task, this);
      } else if (this.flash && this.flash.t < 0.8) {
        const k = U.smooth(0, 0.12, this.flash.t);
        const cx = P.x + P.w / 2, cy = P.y + P.h / 2 + 4;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1.4 - 0.4 * k, 1.4 - 0.4 * k);
        ctx.globalAlpha *= k;
        if (this.flash.ok) {
          sk.line(ctx, -40, 0, -10, 30, { color: G.COL.green, w: 9 });
          sk.line(ctx, -10, 30, 50, -40, { color: G.COL.green, w: 9 });
        } else {
          sk.line(ctx, -36, -36, 36, 36, { color: G.COL.red, w: 9 });
          sk.line(ctx, 36, -36, -36, 36, { color: G.COL.red, w: 9 });
          sk.text(ctx, this.flash.text, 0, 70, { size: 30, align: 'center', color: G.COL.red });
        }
        ctx.restore();
      } else if (this.state === 'play') {
        sk.text(ctx, '...', P.x + P.w / 2, P.y + P.h / 2, { size: 40, align: 'center', color: G.COL.soft });
      }
      this.drawFx(ctx, false);
    }

    drawCope(ctx) {
      sk.round(ctx, SIDE.x, SIDE.y, SIDE.w, SIDE.h, 14, { fill: '#f7f2e8', w: 2.2 });
      sk.text(ctx, 'When it gets too much…', SIDE.x + 16, SIDE.y + 26, { size: 24, color: G.COL.soft });
      const m = G.input.mouse;
      const btn = (r, key, label, sub, o = {}) => {
        const hover = !o.disabled && U.inRect(m.x, m.y, r);
        ctx.save();
        if (o.disabled) ctx.globalAlpha *= 0.45;
        sk.round(ctx, r.x, r.y, r.w, r.h, 12, { fill: o.active ? '#d7e8f5' : hover ? '#fff1cc' : '#ffffff', w: o.active ? 3 : 2 });
        if (o.cd > 0) {
          ctx.fillStyle = 'rgba(42,38,34,0.08)';
          ctx.fillRect(r.x + 2, r.y + 2, (r.w - 4) * o.cd, r.h - 4);
        }
        G.ui.keycap(ctx, r.x + 12, r.y + r.h / 2, key, { size: 18 });
        sk.text(ctx, label, r.x + 52, r.y + 25, { size: 28 });
        sk.text(ctx, sub, r.x + 52, r.y + 52, { size: 18, color: G.COL.soft });
        o.icon && o.icon(r.x + r.w - 34, r.y + r.h / 2);
        ctx.restore();
      };
      const ph = (G.time % 8) / 8;
      btn(COPE.breathe, 'Q', 'Breathe', this.breathing ? 'in… and out…' : 'hold — pauses your task', {
        active: this.breathing,
        icon: (x, y) => sk.ellipse(ctx, x, y, 10 + 8 * Math.sin(ph * Math.PI * 2) ** 2, 10 + 8 * Math.sin(ph * Math.PI * 2) ** 2, { color: G.COL.calm, w: 2.4 }),
      });
      btn(COPE.brk, 'W', this.ch.breakLabel, this.breakCD > 0 ? `ready in ${Math.ceil(this.breakCD)}s` : 'a short reset', {
        disabled: this.breakCD > 0 && this.breakT <= 0, active: this.breakT > 0, cd: this.breakCD / 16,
        icon: (x, y) => {
          if (this.ch.setting === 'office') {
            sk.rect(ctx, x - 9, y - 8, 18, 18, { fill: '#fff', w: 1.8 });
            sk.ellipse(ctx, x + 12, y, 5, 6, { w: 1.6 });
          } else {
            sk.line(ctx, x - 12, y + 12, x + 10, y - 10, { w: 4, color: '#e0a526' });
            sk.line(ctx, x - 12, y + 12, x - 15, y + 15, { w: 2 });
          }
        },
      });
      btn(COPE.talk, 'E', this.ch.talkLabel, this.talkUsed ? 'already talked today' : 'once per day', {
        disabled: this.talkUsed, active: this.state === 'talk',
        icon: (x, y) => sk.bubble(ctx, x - 14, y - 14, 28, 20, x - 8, y + 14, { w: 1.6 }),
      });
    }

    drawThoughts(ctx) {
      this.thoughts.forEach((th) => {
        const a = Math.min(1, th.t / 0.4) * Math.min(1, (th.max - th.t) / 0.6) * (th.popping ? 1 - th.popping / 0.25 : 1);
        const s = th.popping ? 1 + th.popping * 2 : 1;
        ctx.save();
        ctx.globalAlpha *= Math.max(0, a);
        const cx = th.x + th.w / 2, cy = th.y + th.h / 2;
        ctx.translate(cx, cy);
        ctx.scale(s, s);
        ctx.translate(-cx, -cy);
        sk.cloud(ctx, th.x, th.y, th.w, th.h, { fill: '#fff4f1', color: '#9a3b33', w: 1.8 });
        sk.text(ctx, th.text, cx, cy + 1, { size: 22, align: 'center', color: '#a3362c' });
        ctx.restore();
      });
    }

    drawVignette(ctx) {
      const a = U.smooth(40, 100, this.shown) * 0.55;
      if (a > 0.01) {
        const g = ctx.createRadialGradient(this.ch.seatX.rival, 250, 140, this.ch.seatX.rival, 250, 950);
        g.addColorStop(0, 'rgba(60,10,10,0)');
        g.addColorStop(1, `rgba(60,10,10,${a})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, G.W, G.H);
      }
      const pulse = this.shown > 85 ? (Math.sin(G.time * 7) * 0.5 + 0.5) * 0.12 : 0;
      if (this.redFlash > 0 || pulse > 0) {
        ctx.fillStyle = `rgba(210,69,58,${this.redFlash * 0.35 + pulse})`;
        ctx.fillRect(0, 0, G.W, G.H);
      }
    }

    drawOverlays(ctx) {
      if (this.breathing) this.drawBreathing(ctx);
      if (this.breakT > 0 && this.breakInfo) this.drawBreak(ctx);
      if (this.state === 'talk' && this.talk) this.drawTalk(ctx);
      if (this.state === 'intro') this.drawIntro(ctx);
      if (this.state === 'end') this.drawSummary(ctx);
      if (this.state === 'paused') this.drawPause(ctx);
    }

    panelCover(ctx, alpha) {
      ctx.save();
      ctx.globalAlpha *= alpha;
      sk.round(ctx, P.x, P.y, P.w, P.h, 10, { fill: '#eef5fa', w: 2.4 });
      ctx.restore();
    }

    drawBreathing(ctx) {
      const k = U.smooth(0, 0.35, this.breathT);
      this.panelCover(ctx, k);
      ctx.save();
      ctx.globalAlpha *= k;
      const cyc = (this.breathT % 8) / 8;
      const grow = 0.5 - 0.5 * Math.cos(cyc * Math.PI * 2);
      const r = 36 + 70 * grow;
      const cx = P.x + P.w / 2, cy = P.y + P.h / 2 - 6;
      sk.ellipse(ctx, cx, cy, r + 14, r + 14, { color: G.COL.calm, w: 1.4, alpha: 0.4 });
      sk.ellipse(ctx, cx, cy, r, r, { fill: 'rgba(111,163,208,0.25)', color: G.COL.calm, w: 3 });
      sk.text(ctx, cyc < 0.5 ? 'breathe in…' : 'breathe out…', cx, cy, { size: 34, align: 'center', color: G.COL.blue });
      sk.text(ctx, 'Your task is paused. The clock is not.', cx, P.y + P.h - 22, { size: 20, align: 'center', color: G.COL.soft });
      ctx.restore();
    }

    drawBreak(ctx) {
      const t = 3.2 - this.breakT;
      const k = U.smooth(0, 0.3, t) * (1 - U.smooth(2.9, 3.2, t));
      this.panelCover(ctx, k);
      ctx.save();
      ctx.globalAlpha *= k;
      A.doodle(ctx, this.breakInfo.art, P.x + P.w / 2, P.y + P.h / 2 - 14, U.smooth(0.2, 2.4, t));
      sk.text(ctx, this.breakInfo.text, P.x + P.w / 2, P.y + P.h - 24, { size: 24, align: 'center', color: G.COL.soft });
      ctx.restore();
    }

    drawTalk(ctx) {
      const T = this.talk, ln = T.lines[T.i];
      const k = U.smooth(0, 0.3, this.stateT);
      ctx.save();
      ctx.globalAlpha *= k;
      sk.round(ctx, P.x, P.y, P.w, P.h, 10, { fill: '#fbf7ee', w: 2.6 });
      const ch = this.ch;
      const side = ln.who === 'friend' ? 0 : 1;
      const face = (id, x, active) => {
        const c = ch.cast[id];
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - 80, P.y + 4, 160, P.h - 8);
        ctx.clip();
        ctx.globalAlpha *= active ? 1 : 0.4;
        A.person(ctx, x, P.y + P.h + 30, {
          shirt: c.shirt, hair: c.hair, hairColor: c.hairColor, glasses: c.glasses, tie: c.tie, lanyard: c.lanyard,
          adult: ch.adult, scale: 1.7, mood: active ? (id === 'friend' ? 'happy' : this.anger < 40 ? 'content' : 'sad') : 'neutral',
          look: id === 'friend' ? 1 : -1, bench: false, arms: 'hold',
        });
        ctx.restore();
      };
      face('friend', P.x + 90, side === 0);
      face('you', P.x + P.w - 90, side === 1);
      const name = ln.who === 'friend' ? ch.cast.friend.name : ch.cast.you.name + ' (you)';
      sk.text(ctx, name, P.x + 190, P.y + 40, { size: 26, color: ln.who === 'friend' ? G.COL.green : G.COL.blue });
      const shown = ln.txt.slice(0, Math.floor(T.t * 45));
      sk.para(ctx, shown, P.x + 190, P.y + 86, P.w - 380, { size: 28 });
      if (T.t * 45 >= ln.txt.length) {
        sk.text(ctx, T.i < T.lines.length - 1 ? 'click ▸' : 'click to go back ▸', P.x + P.w - 200, P.y + P.h - 24,
          { size: 20, align: 'right', color: G.COL.soft, alpha: 0.6 + 0.4 * Math.sin(G.time * 4) });
      }
      ctx.restore();
    }

    card(ctx, x, y, w, h) {
      ctx.fillStyle = 'rgba(29,27,25,0.45)';
      ctx.fillRect(0, 0, G.W, G.H);
      sk.round(ctx, x + 6, y + 8, w, h, 16, { fill: 'rgba(0,0,0,0.2)', stroke: false });
      sk.round(ctx, x, y, w, h, 16, { fill: G.COL.sheet, w: 3 });
    }

    drawIntro(ctx) {
      const ch = this.ch;
      this.card(ctx, 300, 110, 680, 500);
      sk.text(ctx, `${ch.label} · ${ch.title}`, 640, 160, { size: 28, align: 'center', color: G.COL.soft });
      sk.text(ctx, this.day.name, 640, 222, { size: 76, align: 'center' });
      sk.line(ctx, 520, 262, 760, 262, { color: G.COL.red, w: 3 });
      sk.para(ctx, ch.tips[this.di], 640, 312, 560, { size: 27, align: 'center' });

      const row = (y, items) => {
        let total = 0;
        const widths = items.map(([k, label]) => {
          const w = sk.measure(ctx, k, 16) + 12 + 8 + sk.measure(ctx, label, 21);
          total += w + 26;
          return w;
        });
        let x = 640 - (total - 26) / 2;
        items.forEach(([k, label], i) => {
          const kw = G.ui.keycap(ctx, x, y, k, { size: 16 });
          sk.text(ctx, label, x + kw + 8, y + 1, { size: 21 });
          x += widths[i] + 26;
        });
      };
      row(432, [['1 2 3', 'answer'], ['SPACE', 'timing'], ['ARROWS', 'sequences']]);
      row(474, [['Q', 'hold to breathe'], ['W', ch.breakLabel.toLowerCase()], ['E', 'talk']]);
      sk.text(ctx, 'Click a thought bubble to let it go.', 640, 512, { size: 21, align: 'center', color: G.COL.soft });
      sk.text(ctx, 'Click or press Space to begin', 640, 566, { size: 26, align: 'center', color: G.COL.blue, alpha: 0.6 + 0.4 * Math.sin(G.time * 4) });
    }

    drawSummary(ctx) {
      const ch = this.ch;
      this.card(ctx, 380, 90, 520, 540);
      if (this.kicked) {
        const r = ch.report;
        sk.text(ctx, ch.id === 'school' ? 'Expelled.' : 'Fired.', 640, 160, { size: 64, align: 'center', color: G.COL.red });
        sk.para(ctx, r.kicked, 640, 250, 420, { size: 28, align: 'center' });
        sk.para(ctx, 'Three outbursts. Everyone saw.', 640, 340, 420, { size: 26, align: 'center', color: G.COL.soft });
      } else {
        sk.text(ctx, `${this.day.name} — done`, 640, 150, { size: 46, align: 'center' });
        const rows = [
          ['Tasks done', this.done],
          ['Missed', this.missed],
          ['Praise for you', this.praise.you],
          [`Praise for ${ch.cast.rival.name}`, this.praise.rival],
          ['Outbursts', this.outbursts],
        ];
        rows.forEach(([k, v], i) => {
          const y = 220 + i * 44;
          sk.text(ctx, k, 450, y, { size: 28 });
          sk.text(ctx, String(v), 830, y, { size: 30, align: 'right', color: k.startsWith('Praise for ' + ch.cast.rival.name) ? G.COL.gold : G.COL.ink });
        });
        sk.line(ctx, 440, 438, 840, 438, { w: 2 });
        sk.text(ctx, 'Score', 450, 470, { size: 32 });
        sk.text(ctx, String(Math.max(0, this.score)), 830, 470, { size: 36, align: 'right' });
        if (this.praise.rival > this.praise.you) {
          sk.text(ctx, this.f(`{rival} got praised ${this.praise.rival - this.praise.you} more time${this.praise.rival - this.praise.you > 1 ? 's' : ''} than you.`),
            640, 514, { size: 21, align: 'center', color: G.COL.soft });
        }
      }
      this.endBtn.draw(ctx);
    }

    drawPause(ctx) {
      this.card(ctx, 470, 180, 340, 340);
      sk.text(ctx, 'Paused', 640, 236, { size: 50, align: 'center' });
      this.pauseBtns.forEach((b) => b.draw(ctx));
    }
  }

  G.LevelScene = LevelScene;
})();
