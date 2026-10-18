// Story cutscenes: intro, interlude between chapters, and the endings.
(function () {
  'use strict';
  const G = window.G;
  const U = G.util, sk = G.sk, A = G.art;

  const ch0 = () => G.DATA.chapters[0];
  const ch1 = () => G.DATA.chapters[1];
  function who(id, adult, extra) {
    const c = (adult ? ch1() : ch0()).cast[id];
    return Object.assign({
      standing: true, shirt: c.shirt, hair: c.hair, hairColor: c.hairColor,
      lanyard: c.lanyard, tie: c.tie, glasses: c.glasses, adult,
    }, extra);
  }

  // ---------------------------------------------------------------- vignettes
  const V = {
    stars(ctx, x, y, t, n = 3, r = 70) {
      for (let i = 0; i < n; i++) {
        const a = t * 1.4 + (i * Math.PI * 2) / n;
        sk.star(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.25, 9, { rot: a });
      }
    },
    spotlight(ctx, x, top, bottom, w) {
      ctx.fillStyle = 'rgba(255,224,140,0.32)';
      ctx.beginPath();
      ctx.moveTo(x - 20, top);
      ctx.lineTo(x + 20, top);
      ctx.lineTo(x + w / 2, bottom);
      ctx.lineTo(x - w / 2, bottom);
      ctx.closePath();
      ctx.fill();
      sk.ellipse(ctx, x, bottom, w / 2, 16, { fill: 'rgba(255,224,140,0.35)', stroke: false });
    },
    reportF(ctx, x, y) {
      sk.rect(ctx, x, y, 300, 330, { fill: '#fffef9', w: 2.4 });
      sk.text(ctx, 'Report Card', x + 150, y + 36, { size: 30, align: 'center' });
      for (let i = 0; i < 5; i++) sk.line(ctx, x + 30, y + 80 + i * 32, x + 170, y + 80 + i * 32, { w: 1.4, alpha: 0.4 });
      sk.ellipse(ctx, x + 225, y + 210, 50, 46, { color: G.COL.red, w: 3.4 });
      sk.text(ctx, 'F', x + 225, y + 214, { size: 80, align: 'center', color: G.COL.red });
    },
    diploma(ctx, x, y) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.15);
      sk.rect(ctx, -46, -12, 92, 24, { fill: '#fffef9', w: 2 });
      sk.ellipse(ctx, -46, 0, 6, 12, { fill: '#fffef9', w: 1.6 });
      sk.rect(ctx, -6, -13, 12, 26, { fill: G.COL.red, w: 1.4 });
      ctx.restore();
    },
    box(ctx, x, y) {
      [[-18, -30], [0, -44], [16, -32]].forEach(([dx, dy]) => sk.ellipse(ctx, x + dx, y + dy, 9, 18, { fill: '#8fbf86', w: 1.6, rot: dx * 0.03 }));
      sk.rect(ctx, x - 52, y - 20, 104, 64, { fill: '#c9a46e', w: 2.4 });
      sk.line(ctx, x - 52, y - 4, x + 52, y - 4, { w: 1.4 });
    },
    calendar(ctx, t) {
      const x = 540, y = 130;
      sk.rect(ctx, x + 10, y + 10, 200, 260, { fill: '#e6ded0', w: 2 });
      sk.rect(ctx, x, y, 200, 260, { fill: '#fffef9', w: 2.4 });
      sk.rect(ctx, x, y, 200, 54, { fill: G.COL.red, w: 2.4 });
      const months = ['JAN', 'MAR', 'JUN', 'SEP', 'DEC'];
      const k = Math.floor(t * 6);
      sk.text(ctx, months[k % 5], x + 100, y + 28, { size: 30, align: 'center', color: '#fff' });
      sk.text(ctx, String((k * 7) % 28 + 1), x + 100, y + 160, { size: 110, align: 'center' });
      // a page flying off
      const f = (t * 6) % 1;
      ctx.save();
      ctx.globalAlpha *= 1 - f;
      ctx.translate(x + 100 + f * 260, y + 130 - f * 120);
      ctx.rotate(f * 1.4);
      sk.rect(ctx, -100, -130, 200, 260, { fill: '#fffef9', w: 2 });
      ctx.restore();
    },
    storm(ctx, t, x, y, adult) {
      A.person(ctx, x, y, who('you', adult, { scale: 1.3, mood: 'angry' }));
      const top = y - 300;
      sk.cloud(ctx, x - 90, top, 180, 40, { fill: '#5d5650', color: '#efe7da', tail: false });
      if (Math.sin(t * 5) > 0.6) {
        const lx = x + 62;
        sk.poly(ctx, [[lx - 10, top + 50], [lx + 10, top + 80], [lx - 6, top + 84], [lx + 14, top + 120]], { closed: false, color: G.COL.gold, w: 3.4 });
      }
      for (let i = 0; i < 6; i++) {
        const rx = x - 70 + i * 28, ry = top + 60 + ((t * 120 + i * 37) % 70);
        sk.line(ctx, rx, ry, rx - 3, ry + 12, { w: 1.6, color: '#8fb3d8', single: true });
      }
    },
    alone(ctx, t) {
      const g = ctx.createRadialGradient(700, 260, 10, 700, 300, 300);
      g.addColorStop(0, 'rgba(255,214,140,0.22)');
      g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(300, 0, 800, 560);
      sk.line(ctx, 200, 488, 1080, 488, { w: 2 });
      sk.line(ctx, 760, 488, 760, 190, { w: 3 });
      sk.poly(ctx, [[730, 190], [790, 190], [776, 160], [744, 160]], { fill: '#5d5650', w: 2 });
      A.person(ctx, 640, 422, who('you', true, { standing: false, scale: 1, mood: 'sad', tear: true, arms: 'hold', look: -0.4, lookY: 1 }));
    },
    globe(ctx, t) {
      const cx = 640, cy = 290, r = 150;
      sk.ellipse(ctx, cx, cy, r, r, { fill: '#2c3a44', w: 2.6 });
      sk.ellipse(ctx, cx, cy, r * 0.45, r, { w: 1.4, alpha: 0.5 });
      sk.line(ctx, cx - r, cy, cx + r, cy, { w: 1.4, alpha: 0.5 });
      sk.curve(ctx, [[cx - r * 0.9, cy - 60], [cx, cy - 75], [cx + r * 0.9, cy - 60]], { w: 1.4, alpha: 0.5 });
      sk.curve(ctx, [[cx - r * 0.9, cy + 60], [cx, cy + 75], [cx + r * 0.9, cy + 60]], { w: 1.4, alpha: 0.5 });
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + t * 0.08;
        const hx = cx + Math.cos(a) * (r + 26), hy = cy + Math.sin(a) * (r + 26);
        sk.ellipse(ctx, hx, hy, 7, 7, { fill: '#efe7da', w: 1.2 });
        if (i % 3 === 0) {
          sk.curve(ctx, [[hx - 8, hy - 14], [hx - 3, hy - 22], [hx + 2, hy - 13], [hx + 7, hy - 22]], { color: G.COL.red, w: 1.8, single: true });
        }
      }
    },
    starsAway(ctx, t) {
      A.person(ctx, 420, 470, who('you', true, { scale: 1.3, mood: 'sad', look: 1 }));
      for (let i = 0; i < 5; i++) {
        const f = ((t * 0.35 + i / 5) % 1);
        sk.star(ctx, U.lerp(470, 900, f), 260 - Math.sin(f * Math.PI) * 120 + i * 6, 11, { rot: t + i });
      }
      sk.ellipse(ctx, 900, 300, 60, 60, { color: '#efe7da', w: 1.6, alpha: 0.5 });
      sk.text(ctx, '?', 900, 302, { size: 60, align: 'center', color: '#efe7da' });
    },
    standing(ctx, t) {
      A.person(ctx, 640, 470, who('you', true, { scale: 1.4, mood: 'worried', lookY: 1 }));
    },
    breathe(ctx, t) {
      const g = 0.5 - 0.5 * Math.cos((t / 8) * Math.PI * 2);
      const r = 150 + 60 * g;
      sk.ellipse(ctx, 640, 330, r, r, { fill: 'rgba(111,163,208,0.14)', color: G.COL.calm, w: 2.4 });
      sk.ellipse(ctx, 640, 330, r + 22, r + 22, { color: G.COL.calm, w: 1.2, alpha: 0.4 });
      A.person(ctx, 640, 460, who('you', true, { scale: 1.2, mood: 'breathe' }));
    },
    bench(ctx, t) {
      sk.line(ctx, 200, 520, 1080, 520, { w: 2 });
      sk.rect(ctx, 340, 280, 30, 240, { fill: '#6b5a4a', w: 2 });
      [[355, 230, 90, 70], [300, 270, 60, 46], [410, 270, 60, 46], [355, 190, 60, 46]].forEach(([x, y, rx, ry]) =>
        sk.ellipse(ctx, x, y, rx, ry, { fill: '#5f8f5a', w: 2 }));
      sk.rect(ctx, 520, 454, 260, 12, { fill: '#a07a52', w: 2 });
      sk.line(ctx, 540, 466, 540, 520, { w: 3 });
      sk.line(ctx, 760, 466, 760, 520, { w: 3 });
      const f = ch1().cast.friend;
      A.person(ctx, 600, 452, who('you', true, { standing: false, mood: 'content', look: 1 }));
      A.person(ctx, 700, 452, { standing: false, shirt: f.shirt, hair: f.hair, hairColor: f.hairColor, adult: true, mood: 'happy', look: -1, arms: 'hold' });
      if (Math.sin(t * 2) > -0.2) sk.bubble(ctx, 700, 300, 64, 40, 700, 362, { fill: '#fffdf8', w: 1.8 });
      sk.text(ctx, '...', 732, 318, { size: 30, align: 'center', color: G.COL.ink });
    },
    sunrise(ctx, t, figure) {
      const sy = 470 - Math.min(t, 5) * 22;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, G.W, 470);
      ctx.clip();
      for (let i = 0; i < 12; i++) {
        const a = Math.PI + (i / 11) * Math.PI;
        sk.line(ctx, 640 + Math.cos(a) * 110, sy + Math.sin(a) * 110, 640 + Math.cos(a) * 170, sy + Math.sin(a) * 170, { color: G.COL.gold, w: 2.4, alpha: 0.7 });
      }
      sk.ellipse(ctx, 640, sy, 90, 90, { fill: '#f6d77b', color: G.COL.gold, w: 2.4 });
      ctx.restore();
      sk.line(ctx, 100, 470, 1180, 470, { w: 2.4 });
      sk.curve(ctx, [[100, 470], [300, 440], [520, 462], [760, 448], [1000, 466], [1180, 450]], { w: 1.6, alpha: 0.5 });
      if (figure) A.person(ctx, 900, 470, who('you', true, { scale: 1, mood: 'content', look: -1, lookY: -0.5 }));
    },
    ceremony(ctx, t) {
      sk.rect(ctx, 400, 360, 480, 40, { fill: '#b98f62', w: 2.4 });
      V.spotlight(ctx, 640, 60, 360, 200);
      A.person(ctx, 640, 360, who('rival', true, { scale: 1, mood: 'happy', arms: 'trophy', badge: true }));
      V.stars(ctx, 640, 150, t, 4, 80);
      for (let i = 0; i < 12; i++) {
        const x = 120 + i * 95, y = 480 + (i % 2) * 14;
        if (i === 2) continue;
        sk.ellipse(ctx, x, y, 22, 23, { fill: '#cfc6b8', w: 1.8 });
      }
      ctx.save();
      ctx.translate(310, 480);
      const c = ch1().cast.you;
      sk.ellipse(ctx, 0, 0, 23, 24, { fill: '#fffaf2', w: 2 });
      A.hair(ctx, 0, 23, c.hair, c.hairColor);
      A.face(ctx, 0, 0, 23, 'sad', { look: 1, lookY: -1 });
      ctx.restore();
      if (t > 1) {
        const k = Math.abs(Math.sin(t * 9));
        sk.text(ctx, 'clap', 210 + k * 4, 430, { size: 20, color: G.COL.soft });
        sk.text(ctx, 'clap', 1000 - k * 4, 440, { size: 20, color: G.COL.soft });
      }
    },
  };

  // ------------------------------------------------------------------ scripts
  const MESSAGE = () => [
    { dark: true, music: 'calm', text: "All over the world, people carry anger and jealousy they don't know where to put.", draw: V.globe, hold: 1 },
    { dark: true, text: "The feeling that you're never enough. That someone else always gets the credit.", draw: (c, t) => V.storm(c, t, 640, 500, true), hold: 1 },
    { dark: true, text: "Life isn't always rewarding. Hard work isn't always noticed. That isn't fair — but it's real.", draw: V.starsAway, hold: 1 },
    { dark: true, text: "So don't expect the world to hand it to you. And don't carry it alone.", draw: V.standing, hold: 1 },
    { dark: true, text: 'When it builds up, take a breather.', draw: V.breathe, hold: 1.5 },
    { dark: true, text: 'Talk to someone. A friend. Family. A teacher. A professional.', draw: V.bench, hold: 1 },
    { text: 'It may hurt today. It may not hurt tomorrow.', draw: (c, t) => V.sunrise(c, t, false), hold: 1.5 },
    { big: true, text: "You don't have to be better to win.", textY: 560, draw: (c, t) => V.sunrise(c, t + 5, true), hold: 2.5 },
  ];

  function finalSlide() {
    return {
      text: "If you're struggling, you're not alone.",
      sub: 'Free, confidential support worldwide: findahelpline.com — or talk to someone you trust.',
      textY: 300,
      draw: (ctx) => {
        sk.text(ctx, "I'm Better!", 640, 140, { size: 72, align: 'center', color: G.COL.soft });
        sk.text(ctx, 'Thank you for playing.', 640, 470, { size: 28, align: 'center', color: G.COL.soft });
      },
      buttons: [
        { label: 'Play again', onClick: () => G.flow.newGame() },
        { label: 'Title screen', onClick: () => G.flow.toTitle() },
      ],
    };
  }

  G.story = {
    intro() {
      const rv = ch0().cast.rival.name;
      return new G.Cutscene([
        { text: 'This is you.', draw: (ctx) => A.person(ctx, 640, 470, who('you', false, { scale: 1.6 })) },
        {
          text: "You're fifteen. You try hard. You want to be good at things.",
          draw: (ctx) => {
            A.person(ctx, 640, 470, who('you', false, { scale: 1.6, mood: 'happy' }));
            [0, 1, 2].forEach((i) => sk.rect(ctx, 760 + i * 3, 450 - i * 20, 90, 20, { fill: ['#e9a29b', '#9cc0e6', '#a9d6a0'][i], w: 2 }));
          },
        },
        {
          text: `And this is ${rv}.`,
          draw: (ctx, t) => {
            A.person(ctx, 470, 470, who('you', false, { scale: 1.4, look: 1 }));
            A.person(ctx, 810, 470, who('rival', false, { scale: 1.4, mood: 'happy', badge: true }));
            if (t > 0.6) V.stars(ctx, 810, 210, t);
          },
        },
        {
          text: `${rv} isn't mean. ${rv} isn't cruel. ${rv} is just... always a little better.`,
          draw: (ctx, t) => {
            A.person(ctx, 470, 470, who('you', false, { scale: 1.4, mood: 'annoyed', look: 1 }));
            A.person(ctx, 810, 470, who('rival', false, { scale: 1.4, mood: 'happy', arms: 'trophy', badge: true }));
            V.stars(ctx, 810, 210, t, 4);
          },
        },
        {
          text: 'No matter what you do, someone else gets the praise.',
          draw: (ctx, t) => {
            V.spotlight(ctx, 810, 60, 470, 220);
            A.person(ctx, 810, 470, who('rival', false, { scale: 1.2, mood: 'happy', badge: true }));
            A.person(ctx, 430, 470, who('you', false, { scale: 1.2, mood: 'sad', look: 1 }));
          },
        },
        { big: true, text: 'Chapter 1 — School', sub: 'Three days. Try to do well.' },
      ], () => G.flow.startChapter(), { music: 'title' });
    },

    interlude(passed) {
      const jd = ch1().cast.rival.name;
      return new G.Cutscene([
        passed
          ? {
              text: 'You made it through school. Not first. But through.',
              draw: (ctx) => {
                A.person(ctx, 640, 470, who('you', false, { scale: 1.5, mood: 'content', arms: 'hold' }));
                V.diploma(ctx, 640, 470 - 92 * 1.5);
              },
            }
          : {
              text: "School didn't go the way you hoped. Life went on anyway.",
              draw: (ctx) => {
                V.reportF(ctx, 380, 130);
                A.person(ctx, 860, 470, who('you', false, { scale: 1.4, mood: 'sad', tear: true, look: -1 }));
              },
            },
        { text: 'Years pass.', draw: (ctx, t) => V.calendar(ctx, t) },
        {
          text: `You're 27 now. New job. New desk. New chance.`,
          draw: (ctx) => {
            ctx.save();
            ctx.translate(640, 400);
            ctx.scale(1.4, 1.4);
            A.person(ctx, 0, 0, who('you', true, { standing: false, desk: 'office', mood: 'content', writing: true }));
            ctx.restore();
          },
        },
        {
          text: `And then there's ${jd}.`,
          draw: (ctx, t) => {
            A.person(ctx, 470, 470, who('you', true, { scale: 1.4, look: 1 }));
            A.person(ctx, 810, 470, who('rival', true, { scale: 1.4, mood: 'happy', arms: 'trophy', badge: true }));
            V.stars(ctx, 810, 200, t, 4);
          },
        },
        {
          text: 'Same feeling.',
          draw: (ctx) => {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, G.W, 520);
            ctx.clip();
            A.person(ctx, 640, 900, who('you', true, { scale: 3.2, mood: 'angry', look: 1 }));
            ctx.restore();
          },
        },
        { big: true, text: 'Chapter 2 — Work', sub: 'Three days. Same tools: breathe, take a break, talk.' },
      ], () => G.flow.startChapter(), { music: 'title' });
    },

    ending(key, results) {
      let slides;
      const jd = ch1().cast.rival.name;
      if (key === 'bad') {
        slides = [
          { text: 'You failed school.', draw: (ctx) => { V.reportF(ctx, 330, 110); A.person(ctx, 860, 470, who('you', false, { scale: 1.4, mood: 'sad', tear: true, look: -1 })); } },
          { text: 'Then you lost your job too.', draw: (ctx) => { A.person(ctx, 640, 480, who('you', true, { scale: 1.5, mood: 'sad', tear: true, arms: 'hold' })); V.box(ctx, 640, 480 - 82 * 1.5); } },
          { dark: true, music: 'dark', text: "You kept telling yourself: I'm better. I'm better. I'm better.", draw: (c, t) => V.storm(c, t, 640, 500, true), hold: 1 },
          { dark: true, text: 'But there was no one left to tell.', draw: V.alone, hold: 1.5 },
          {
            dark: true, big: true, text: "It doesn't have to end this way.",
            sub: 'Try again — and this time, take a breath. If this feels familiar, talk to someone. findahelpline.com',
            buttons: [
              { label: 'Try again', onClick: () => G.flow.newGame() },
              { label: 'Title screen', onClick: () => G.flow.toTitle() },
            ],
          },
        ];
      } else if (key === 'mixed') {
        const [school, work] = results;
        slides = [
          school
            ? { text: 'You got through school.', draw: (ctx) => { A.person(ctx, 640, 470, who('you', false, { scale: 1.5, mood: 'content', arms: 'hold' })); V.diploma(ctx, 640, 470 - 92 * 1.5); } }
            : { text: "You didn't get through school.", draw: (ctx) => { V.reportF(ctx, 330, 110); A.person(ctx, 860, 470, who('you', false, { scale: 1.4, mood: 'sad', look: -1 })); } },
          work
            ? { text: 'But you kept your job.', draw: (ctx) => { ctx.save(); ctx.translate(640, 400); ctx.scale(1.4, 1.4); A.person(ctx, 0, 0, who('you', true, { standing: false, desk: 'office', mood: 'content' })); ctx.restore(); } }
            : { text: 'And later, you lost your job.', draw: (ctx) => { A.person(ctx, 640, 480, who('you', true, { scale: 1.5, mood: 'sad', arms: 'hold' })); V.box(ctx, 640, 480 - 82 * 1.5); } },
          { text: "Some things went right. Some went wrong. That's what most lives look like.", draw: (c, t) => V.sunrise(c, 0, false), hold: 1 },
          ...MESSAGE(),
          finalSlide(),
        ];
      } else {
        slides = [
          { text: 'You passed school. You kept your job. You did everything right.', draw: (ctx) => { A.person(ctx, 640, 470, who('you', true, { scale: 1.5, mood: 'content', arms: 'hold' })); V.diploma(ctx, 640, 470 - 92 * 1.5); } },
          { text: `And still — at the awards night — they called ${jd}'s name.`, draw: V.ceremony, hold: 1 },
          { text: "Winning didn't make the feeling go away.", draw: (ctx) => { A.person(ctx, 640, 470, who('you', true, { scale: 1.5, mood: 'sad', lookY: 1 })); }, hold: 1 },
          ...MESSAGE(),
          finalSlide(),
        ];
      }
      return new G.Cutscene(slides, null, { music: 'title' });
    },
  };

})();
