// Keyboard + pointer input, polled per frame. Keys use KeyboardEvent.code
// ('KeyQ', 'Space', 'Digit1', 'ArrowUp', ...). Pointer coords are in game units.
(function () {
  'use strict';
  const G = window.G;
  const keys = {}, pressed = {}, released = {};
  const mouse = { x: -1, y: -1, down: false, clicked: false, released: false };

  const I = (G.input = {
    mouse,
    down: (c) => !!keys[c],
    pressed: (c) => !!pressed[c],
    released: (c) => !!released[c],
    anyKey: () => Object.keys(pressed).length > 0,
    endFrame() {
      for (const k in pressed) delete pressed[k];
      for (const k in released) delete released[k];
      mouse.clicked = false;
      mouse.released = false;
    },
  });

  const BLOCK = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

  window.addEventListener('keydown', (e) => {
    if (BLOCK.has(e.code)) e.preventDefault();
    if (G.audio) G.audio.unlock();
    if (!e.repeat) pressed[e.code] = true;
    keys[e.code] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    released[e.code] = true;
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    mouse.down = false;
  });

  function toGame(e) {
    if (!G.canvas) return;
    const r = G.canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * G.W;
    mouse.y = ((e.clientY - r.top) / r.height) * G.H;
  }
  window.addEventListener('pointerdown', (e) => {
    toGame(e);
    mouse.down = true;
    mouse.clicked = true;
    if (G.audio) G.audio.unlock();
  });
  window.addEventListener('pointermove', toGame);
  window.addEventListener('pointerup', (e) => {
    toGame(e);
    mouse.down = false;
    mouse.released = true;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  I.eatClick = () => { mouse.clicked = false; };
})();
