# I'm Better!

A small, hand-drawn 2D game about jealousy.

You do your tasks, first at school and later at work. Someone else always gets the praise. Every time that happens, your jealousy rises. You start staring at them, intrusive thoughts get in the way, and the tasks get harder. If the bar fills up, you explode. You can breathe, take a break, or talk to a friend, but each of those costs time.

## Play it

**Browser:** double-click `index.html`. It needs no server, no install and no internet.

**Phone / tablet:** the files need to be on a website, because phones can't open a local `index.html`. GitHub Pages works well: in the repo, go to Settings → Pages, choose "Deploy from a branch", then `main` / root. Open the link on the phone. The game detects a touch screen and adapts on its own:
- It scales to fit the screen, keeping clear of notches and rounded corners.
- The first tap goes fullscreen and, on Android, locks the screen sideways. iPhones don't allow web pages to go fullscreen; use Share → Add to Home Screen instead.
- Holding the phone upright shows a "turn sideways" screen and pauses the game.
- Pause, sound and fullscreen buttons appear beside the game, and the hints switch from keys to taps.

**Desktop (Steam path):**
```
npm install
npm start          # runs the game in a desktop window
npm run dist       # builds a Windows folder in dist/
```

## Controls

| Key | Action |
|---|---|
| `1` `2` `3` / click | answer |
| `SPACE` / click | timing tasks |
| arrow keys / click | sequence tasks |
| hold `Q` | breathe (pauses your task, but the clock keeps running) |
| `W` | short break (16s cooldown) |
| `E` | talk to a friend (once per day) |
| click a thought bubble | let it go |
| `Esc` / `M` / `F` | pause / mute / fullscreen (buttons beside the game on touch screens) |

## Structure

The project has no build step. It's plain scripts on a global `G` namespace, so it also runs from `file://`.

```
index.html            loads everything
src/vendor/rough.js   rough.js (hand-drawn look)
src/engine/           core loop, input, synth audio, rough.js renderer, UI, saves
src/game/data.js      ALL text, dialogue, cast and balancing numbers
src/game/art.js       characters, moods, rooms, props
src/game/tasks.js     the task mini-games
src/game/level.js     one day of gameplay
src/game/scenes.js    title, cutscene player, report card
src/game/story.js     intro, interlude, endings
src/game/flow.js      game progression
electron/main.js      desktop wrapper
```

### Tuning

Every balance value (praise frequency, jealousy per praise, passive creep, task time, score targets) is in `src/game/data.js` under each chapter's `days`.

### Dev shortcuts

- `index.html?chapter=1&day=2` jumps straight to a day
- `index.html?ending=bad|mixed|both` previews an ending

## Endings

- **Fail both chapters:** you fail school and lose your job.
- **Pass one chapter:** the serious closing message.
- **Pass both chapters:** you did everything right, and someone else still got the award. Then the same closing message.

## Toward Steam

1. Get a Steamworks partner account and an App ID.
2. Add [steamworks.js](https://github.com/ceifa/steamworks.js) to the Electron app for achievements and overlay. Endings are already tracked in `G.save`, so they can map to achievements.
3. Swap `src/engine/save.js` to file-based saves or Steam Cloud. It's the only place that touches storage.
4. Upload the `npm run dist` output with SteamPipe.

## Credits

The art is rendered with [rough.js](https://roughjs.com) 4.6.6 by Preet Shihn (MIT, bundled in `src/vendor/`). Shapes are cached per "boil" frame in `src/engine/sketch.js`. The font is Patrick Hand by Patrick Wagesreiter, under the SIL Open Font License (`assets/fonts/OFL-PatrickHand.txt`). All audio is synthesized at runtime.
