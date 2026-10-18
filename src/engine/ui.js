// Sketchy buttons and key-cap hints.
(function () {
  'use strict';
  const G = window.G;
  const sk = G.sk, U = G.util;

  G.ui = {
    keycap(ctx, x, y, label, o = {}) {
      const size = o.size || 18;
      const w = Math.max(size + 8, sk.measure(ctx, label, size) + 12);
      const h = size + 10;
      sk.round(ctx, x, y - h / 2, w, h, 5, { fill: o.fill || '#ffffff', w: 1.6, color: o.color });
      sk.text(ctx, label, x + w / 2, y + 1, { size, align: 'center', color: o.color });
      return w;
    },
  };

  G.Button = class {
    constructor(o) {
      Object.assign(this, {
        x: 0, y: 0, w: 200, h: 56, label: '', key: null, keyLabel: null,
        size: 30, enabled: true, fill: '#fffdf8', onClick: null,
      }, o);
      this.hover = false;
    }
    update() {
      const m = G.input.mouse;
      this.hover = this.enabled && U.inRect(m.x, m.y, this);
      let hit = false;
      if (this.enabled) {
        if (this.hover && m.clicked) { hit = true; G.input.eatClick(); }
        const keys = Array.isArray(this.key) ? this.key : this.key ? [this.key] : [];
        if (keys.some((k) => G.input.pressed(k))) hit = true;
      }
      if (hit) {
        G.audio.sfx.click();
        if (this.onClick) this.onClick();
      }
      return hit;
    }
    draw(ctx) {
      const lift = this.hover ? -3 : 0;
      ctx.save();
      if (!this.enabled) ctx.globalAlpha *= 0.45;
      sk.round(ctx, this.x + 3, this.y + 5, this.w, this.h, 12, { fill: 'rgba(42,38,34,0.12)', stroke: false });
      sk.round(ctx, this.x, this.y + lift, this.w, this.h, 12, {
        fill: this.hover ? '#fff1cc' : this.fill, w: 2.4,
      });
      sk.text(ctx, this.label, this.x + this.w / 2, this.y + this.h / 2 + lift + 2, {
        size: this.size, align: 'center', maxW: this.w - 24,
      });
      if (this.keyLabel) G.ui.keycap(ctx, this.x + this.w - 14, this.y + lift, this.keyLabel, { size: 14 });
      ctx.restore();
    }
  };
})();
