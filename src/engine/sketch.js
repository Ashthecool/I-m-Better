// Hand-drawn rendering, powered by rough.js (src/vendor/rough.js).
//
// Every primitive goes through a rough.js generator. Shapes are cached per
// "boil variant": the seed cycles through 3 variants ~7 times a second, giving
// the wobbling-line look of hand-animated drawings while static shapes are
// generated only once.
//
// Colored fills get rough.js hachure on top of a pale tint of the same colour;
// light / translucent / tiny fills are drawn solid so text stays readable.
(function () {
  'use strict';
  const G = window.G;
  const U = G.util;
  const TAU = Math.PI * 2;

  const gen = rough.generator();
  const cache = new Map();
  const tintCache = new Map();
  const path2d = new Map();
  let rc = null, rcCanvas = null;
  let variant = 0;

  function canvasFor(ctx) {
    if (!rc || rcCanvas !== ctx.canvas) { rc = rough.canvas(ctx.canvas); rcCanvas = ctx.canvas; }
    return rc;
  }

  function hexRGB(c) {
    if (c[0] !== '#' || c.length !== 7) return null;
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function solidish(fill, size) {
    const rgb = hexRGB(fill);
    if (!rgb) return true; // rgba()/rgb(): keep translucent fills smooth
    if (size < 16) return true;
    return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 > 0.86;
  }
  function tint(fill, mix = 0.5) {
    const k = fill + mix;
    let t = tintCache.get(k);
    if (!t) { t = U.mixHex(fill, '#ffffff', mix); tintCache.set(k, t); }
    return t;
  }

  // rough.js options for a shape of characteristic size `size`.
  function opts(o, size) {
    const w = o.w ?? 2.2;
    const r = {
      stroke: o.stroke === false ? 'none' : sk.col(o),
      strokeWidth: w,
      // small shapes get less wobble so faces and icons stay legible
      roughness: (o.rough ?? 1) * U.clamp(size / 45, 0.3, 1) * 1.15,
      bowing: o.bowing ?? 1.2,
      seed: 1 + variant * 977 + (Math.round(sk.salt * 13) % 5000),
      disableMultiStroke: !!o.single,
      disableMultiStrokeFill: true,
    };
    if (o.fill) {
      r.fill = o.fill;
      r.fillStyle = o.fillStyle || (solidish(o.fill, size) ? 'solid' : 'hachure');
      r.hachureGap = o.gap ?? U.clamp(size / 7, 3.5, 8);
      r.fillWeight = o.fillWeight ?? Math.max(1, w * 0.55);
      r.hachureAngle = o.angle ?? -41;
    }
    return r;
  }
  function keyOf(kind, nums, r) {
    return kind + nums.map((n) => Math.round(n * 2) / 2).join(',') + '|' + r.stroke + r.strokeWidth +
      r.roughness.toFixed(2) + '|' + r.seed + (r.fill || '') + (r.fillStyle || '') + (r.hachureGap || '') +
      (r.fillWeight || '') + (r.disableMultiStroke ? 's' : '') + r.bowing + (r.hachureAngle || '');
  }
  function get(key, make) {
    let d = cache.get(key);
    if (!d) {
      if (cache.size > 8000) cache.clear();
      d = make();
      cache.set(key, d);
    }
    return d;
  }
  // Draw a drawable; `under` paints the pale base tint below hachure fills.
  function render(ctx, d, o, under) {
    const a0 = ctx.globalAlpha;
    if (o.alpha != null) ctx.globalAlpha = a0 * o.alpha;
    if (under && d.options.fill && d.options.fillStyle !== 'solid' && !o.noTint) {
      ctx.fillStyle = tint(d.options.fill, o.tintMix ?? 0.5);
      under();
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    canvasFor(ctx).draw(d);
    ctx.globalAlpha = a0;
  }

  // Records canvas-style path calls as an SVG path string for rough.path().
  class PathRec {
    constructor() { this.d = ''; this.has = false; this.sx = 0; this.sy = 0; }
    n(v) { return Math.round(v * 100) / 100; }
    moveTo(x, y) { this.d += `M${this.n(x)} ${this.n(y)} `; this.has = true; this.sx = x; this.sy = y; }
    lineTo(x, y) { if (!this.has) return this.moveTo(x, y); this.d += `L${this.n(x)} ${this.n(y)} `; }
    quadraticCurveTo(a, b, x, y) { this.d += `Q${this.n(a)} ${this.n(b)} ${this.n(x)} ${this.n(y)} `; }
    bezierCurveTo(a, b, c, d, x, y) { this.d += `C${this.n(a)} ${this.n(b)} ${this.n(c)} ${this.n(d)} ${this.n(x)} ${this.n(y)} `; }
    closePath() { this.d += 'Z '; }
    arc(cx, cy, r, a0, a1, ccw) { this.ellipse(cx, cy, r, r, 0, a0, a1, ccw); }
    ellipse(cx, cy, rx, ry, rot, a0, a1, ccw) {
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const pt = (a) => [cx + rx * Math.cos(a) * cr - ry * Math.sin(a) * sr, cy + rx * Math.cos(a) * sr + ry * Math.sin(a) * cr];
      let delta = ccw ? a0 - a1 : a1 - a0;
      const full = delta >= TAU - 1e-6;
      if (!full) delta = ((delta % TAU) + TAU) % TAU;
      const s = pt(a0);
      if (this.has) this.lineTo(s[0], s[1]); else this.moveTo(s[0], s[1]);
      const sweep = ccw ? 0 : 1, deg = (rot * 180) / Math.PI;
      const arcTo = (p, large) => { this.d += `A${this.n(rx)} ${this.n(ry)} ${this.n(deg)} ${large} ${sweep} ${this.n(p[0])} ${this.n(p[1])} `; };
      if (full) { arcTo(pt(a0 + (ccw ? -Math.PI : Math.PI)), 0); arcTo(s, 0); }
      else arcTo(pt(a0 + (ccw ? -delta : delta)), delta > Math.PI ? 1 : 0);
    }
  }
  function roundD(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    const n = (v) => Math.round(v * 100) / 100;
    return `M${n(x + r)} ${n(y)} L${n(x + w - r)} ${n(y)} A${r} ${r} 0 0 1 ${n(x + w)} ${n(y + r)} ` +
      `L${n(x + w)} ${n(y + h - r)} A${r} ${r} 0 0 1 ${n(x + w - r)} ${n(y + h)} ` +
      `L${n(x + r)} ${n(y + h)} A${r} ${r} 0 0 1 ${n(x)} ${n(y + h - r)} ` +
      `L${n(x)} ${n(y + r)} A${r} ${r} 0 0 1 ${n(x + r)} ${n(y)} Z`;
  }
  function p2d(d) {
    let p = path2d.get(d);
    if (!p) { if (path2d.size > 4000) path2d.clear(); p = new Path2D(d); path2d.set(d, p); }
    return p;
  }

  const sk = (G.sk = {
    ink: null, // default stroke colour override (used on dark cutscene slides)
    salt: 0, // per-object seed offset so identical shapes don't boil in sync
    tick(t) { variant = Math.floor(t * 7) % 3; },
    col(o) { return (o && o.color) || sk.ink || G.COL.ink; },

    line(ctx, x1, y1, x2, y2, o = {}) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const r = opts(o, len);
      const d = get(keyOf('l', [x1, y1, x2, y2], r), () => gen.line(x1, y1, x2, y2, r));
      render(ctx, d, o);
    },

    rect(ctx, x, y, w, h, o = {}) {
      const r = opts(o, Math.sqrt(Math.abs(w * h)) * 1.2);
      const d = get(keyOf('r', [x, y, w, h], r), () => gen.rectangle(x, y, w, h, r));
      render(ctx, d, o, () => ctx.fillRect(x, y, w, h));
      if (o.hatch) sk.hatch(ctx, x, y, w, h, o.hatch);
    },

    round(ctx, x, y, w, h, rad, o = {}) {
      const dStr = roundD(x, y, w, h, rad);
      const r = opts(o, Math.sqrt(Math.abs(w * h)) * 1.2);
      const d = get(keyOf('rr' + dStr, [], r), () => gen.path(dStr, r));
      render(ctx, d, o, () => ctx.fill(p2d(dStr)));
    },

    ellipse(ctx, cx, cy, rx, ry, o = {}) {
      rx = Math.max(0.5, rx); ry = Math.max(0.5, ry);
      if (o.rot) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(o.rot);
        sk.ellipse(ctx, 0, 0, rx, ry, { ...o, rot: 0 });
        ctx.restore();
        return;
      }
      const r = opts(o, rx + ry);
      const d = get(keyOf('e', [cx, cy, rx, ry], r), () => gen.ellipse(cx, cy, rx * 2, ry * 2, r));
      render(ctx, d, o, () => { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill(); });
    },

    poly(ctx, pts, o = {}) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
      const r = opts(o, Math.sqrt((x1 - x0) * (y1 - y0) + 1) * 1.2);
      const closed = o.closed !== false;
      const d = get(keyOf(closed ? 'p' : 'lp', pts.flat(), r), () => (closed ? gen.polygon(pts, r) : gen.linearPath(pts, r)));
      render(ctx, d, o, closed ? () => {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.fill();
      } : null);
    },

    // Smooth freehand curve through points.
    curve(ctx, pts, o = {}) {
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const r = opts(o, len * 0.6);
      const d = get(keyOf('c', pts.flat(), r), () => gen.curve(pts, r));
      render(ctx, d, o);
    },

    // Arbitrary path: build(p) receives a recorder with canvas path methods
    // (moveTo, lineTo, quadraticCurveTo, bezierCurveTo, arc, ellipse, closePath).
    path(ctx, build, o = {}) {
      const rec = new PathRec();
      build(rec);
      const dStr = rec.d.trim();
      if (!dStr) return;
      const r = opts(o, o.size ?? 40);
      const d = get(keyOf('P' + dStr, [], r), () => gen.path(dStr, r));
      render(ctx, d, o, () => ctx.fill(p2d(dStr)));
    },

    hatch(ctx, x, y, w, h, o = {}) {
      const r = {
        stroke: 'none', fill: o.color || sk.col(), fillStyle: 'hachure',
        hachureGap: o.gap || 9, fillWeight: o.w || 1.2, hachureAngle: o.angle ?? -41,
        roughness: 0.8, seed: 1 + variant * 977, disableMultiStrokeFill: true,
      };
      const d = get(keyOf('h', [x, y, w, h], { ...r, strokeWidth: 0, bowing: 1 }), () => gen.rectangle(x, y, w, h, r));
      render(ctx, d, { alpha: o.alpha ?? 0.45 });
    },

    // Zig-zag crayon fill (used for meters).
    scribble(ctx, x, y, w, h, o = {}) {
      if (w <= 2) return;
      const r = {
        stroke: 'none', fill: o.color || sk.col(), fillStyle: 'zigzag',
        hachureGap: o.step || 6, fillWeight: o.w || 3, hachureAngle: -60,
        roughness: 1, seed: 1 + variant * 977, disableMultiStrokeFill: true,
      };
      const d = get(keyOf('z', [x, y, w, h], { ...r, strokeWidth: 0, bowing: 1 }), () => gen.rectangle(x, y, w, h, r));
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 1, y - 1, w + 2, h + 2);
      ctx.clip();
      render(ctx, d, {});
      ctx.restore();
    },

    font(size) { return `${size}px ${G.FONT}`; },

    text(ctx, str, x, y, o = {}) {
      ctx.save();
      let size = o.size || 24;
      ctx.font = sk.font(size);
      ctx.fillStyle = o.color || sk.col();
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.baseline || 'middle';
      if (o.alpha != null) ctx.globalAlpha *= o.alpha;
      ctx.translate(x, y);
      if (o.rot) ctx.rotate(o.rot);
      if (o.maxW) {
        while (size > 10 && ctx.measureText(str).width > o.maxW) {
          size -= 1;
          ctx.font = sk.font(size);
        }
      }
      if (o.outline) {
        ctx.lineWidth = o.outline;
        ctx.strokeStyle = o.outlineColor || G.COL.paper;
        ctx.lineJoin = 'round';
        ctx.strokeText(str, 0, 0);
      }
      ctx.fillText(str, 0, 0);
      ctx.restore();
    },

    measure(ctx, str, size) {
      ctx.save();
      ctx.font = sk.font(size);
      const w = ctx.measureText(str).width;
      ctx.restore();
      return w;
    },

    wrap(ctx, str, maxW, size) {
      ctx.save();
      ctx.font = sk.font(size);
      const out = [];
      String(str).split('\n').forEach((para) => {
        let line = '';
        para.split(' ').forEach((word) => {
          const test = line ? line + ' ' + word : word;
          if (ctx.measureText(test).width > maxW && line) {
            out.push(line);
            line = word;
          } else line = test;
        });
        out.push(line);
      });
      ctx.restore();
      return out;
    },

    // Wrapped paragraph. Returns its height.
    para(ctx, str, x, y, maxW, o = {}) {
      const size = o.size || 24;
      const lines = sk.wrap(ctx, str, maxW, size);
      const lh = o.lh || size * 1.25;
      let yy = y;
      if (o.valign === 'middle') yy = y - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, i) => sk.text(ctx, ln, x, yy + i * lh, o));
      return lines.length * lh;
    },

    // Speech bubble with a tail pointing at (tx, ty).
    bubble(ctx, x, y, w, h, tx, ty, o = {}) {
      const fill = o.fill || '#ffffff';
      const below = ty > y + h;
      const edgeY = below ? y + h : y;
      const bx = Math.max(x + 22, Math.min(x + w - 22, tx));
      sk.round(ctx, x, y, w, h, Math.min(16, h / 2), { fill, color: o.color, w: o.w, fillStyle: 'solid' });
      const dir = below ? -1 : 1;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(bx - 11, edgeY + dir * 3);
      ctx.lineTo(tx, ty);
      ctx.lineTo(bx + 11, edgeY + dir * 3);
      ctx.closePath();
      ctx.fill();
      sk.line(ctx, bx - 11, edgeY, tx, ty, { color: o.color, w: o.w });
      sk.line(ctx, tx, ty, bx + 11, edgeY, { color: o.color, w: o.w });
    },

    // Thought cloud: bumpy outline around a box.
    cloud(ctx, x, y, w, h, o = {}) {
      const fill = o.fill || '#ffffff';
      const bumps = [];
      const r = Math.min(h * 0.42, 20);
      const nx = Math.max(2, Math.round(w / (r * 1.6)));
      for (let i = 0; i <= nx; i++) {
        const px = x + (w * i) / nx;
        bumps.push([px, y, r], [px, y + h, r]);
      }
      bumps.push([x, y + h / 2, r * 1.1], [x + w, y + h / 2, r * 1.1]);
      bumps.forEach((b) => sk.ellipse(ctx, b[0], b[1], b[2], b[2] * 0.85, { color: o.color, w: o.w || 2 }));
      ctx.fillStyle = fill;
      bumps.forEach((b) => {
        ctx.beginPath();
        ctx.ellipse(b[0], b[1], b[2] - 2, b[2] * 0.85 - 2, 0, 0, TAU);
        ctx.fill();
      });
      ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      if (o.tail !== false) {
        sk.ellipse(ctx, x + 8, y + h + r + 10, 6, 5, { fill, color: o.color, w: 1.8 });
        sk.ellipse(ctx, x - 2, y + h + r + 22, 3.5, 3, { fill, color: o.color, w: 1.6 });
      }
    },

    star(ctx, cx, cy, rad, o = {}) {
      const pts = [];
      const rot = o.rot || 0;
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + rot + (i * Math.PI) / 5;
        const rr = i % 2 ? rad * 0.45 : rad;
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      sk.poly(ctx, pts, { fill: o.fill || G.COL.gold, w: o.w ?? 1.6, color: o.color, rough: 0.6 });
    },
  });
})();
