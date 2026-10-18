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
    // Act as if a key was pressed this frame (the on-screen touch buttons use this).
    tap(c) { pressed[c] = true; },
    endFrame() {
      for (const k in pressed) delete pressed[k];
      for (const k in released) delete released[k];
      mouse.clicked = false;
      mouse.released = false;
      // A finger leaves no cursor behind: forget its position once the tap
      // has been handled, so buttons don't stay highlighted.
      if (liftedTouch && !mouse.down) { mouse.x = -1; mouse.y = -1; }
      liftedTouch = false;
    },
  });
  let liftedTouch = false;

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
  // One pointer at a time: a second finger is ignored, so it can't steal the
  // position of a finger that is holding "Breathe".
  const isTouch = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';
  window.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    G.setTouch(isTouch(e));
    toGame(e);
    mouse.down = true;
    mouse.clicked = true;
    if (G.audio) G.audio.unlock();
  });
  window.addEventListener('pointermove', (e) => {
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse') G.setTouch(false);
    toGame(e);
  });
  window.addEventListener('pointerup', (e) => {
    if (!e.isPrimary) return;
    toGame(e);
    mouse.down = false;
    mouse.released = true;
    if (isTouch(e)) {
      liftedTouch = true;
      // iOS only lets audio start, and browsers only allow fullscreen, from the end of a tap.
      if (G.audio) G.audio.unlock();
      G.autoFullscreen();
    }
  });
  window.addEventListener('pointercancel', (e) => {
    if (!e.isPrimary) return;
    mouse.down = false;
    liftedTouch = true;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());

  I.eatClick = () => { mouse.clicked = false; };
})();
