// All sound is synthesized with WebAudio — no audio files to ship.
// Music reacts to `G.audio.tension` (0..1): it detunes, darkens and grows a
// heartbeat as jealousy rises.
(function () {
  'use strict';
  const G = window.G;
  let ac = null, master, musicBus, musicFilter, sfxBus, noiseBuf;
  let nextT = 0, step = 0;

  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // Simplistic progressions & sparse melodies (0 = rest)
  // Title / Story: warm C - Am - F - G with a simple, wistful melody
  const TITLE_CHORDS = [
    [48, 55, 60, 64], // C
    [45, 52, 57, 60], // Am
    [41, 48, 53, 57], // F
    [43, 50, 55, 59], // G
  ];
  const TITLE_MEL = [
    72, 0, 71, 0, 67, 0, 64, 0,
    69, 0, 67, 0, 64, 0, 0,  0,
    65, 0, 69, 0, 67, 0, 64, 0,
    62, 0, 64, 0, 67, 0, 0,  0,
  ];

  // Gameplay (School / Work): steady, simple 4-chord loop + sparse motif
  const PLAY_CHORDS = [
    [48, 55, 60, 64, 67], // C
    [45, 52, 57, 60, 64], // Am
    [41, 48, 53, 57, 60], // F
    [43, 50, 55, 59, 62], // G
  ];
  const PLAY_ARP = [1, 2, 3, 2, 1, 2, 4, 2];
  const PLAY_MEL_A = [
    64, 0, 0, 67, 0, 0, 64, 0,
    60, 0, 0, 64, 0, 0, 0,  0,
    65, 0, 0, 69, 0, 0, 67, 0,
    62, 0, 0, 64, 0, 0, 0,  0,
  ];
  const PLAY_MEL_B = [
    72, 0, 71, 0, 67, 0, 0,  0,
    69, 0, 64, 0, 60, 0, 0,  0,
    65, 0, 64, 0, 60, 0, 62, 0,
    67, 0, 0,  0, 0,  0, 0,  0,
  ];

  // Report screen: gentle 2-chord alternating loop (Fmaj7 - Cmaj7)
  const REPORT_CHORDS = [
    [41, 48, 53, 57, 64],
    [48, 55, 60, 64, 71],
  ];

  // Calm (closing message): Am - F - C - G with slow tender notes
  const CALM = [
    [45, 52, 57, 60, 64],
    [41, 48, 53, 57, 60],
    [48, 55, 60, 64, 67],
    [43, 50, 55, 59, 62],
  ];
  const CALM_MEL = [72, 69, 69, 65, 67, 64, 62, 67];

  const A = (G.audio = {
    muted: G.save.get('muted', false),
    tension: 0,
    mode: 'off',

    unlock() {
      if (!ac) {
        try { ac = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { return; }
        master = ac.createGain();
        master.gain.value = A.muted ? 0 : 0.85;
        master.connect(ac.destination);
        musicFilter = ac.createBiquadFilter();
        musicFilter.type = 'lowpass';
        musicFilter.frequency.value = 2400;
        musicBus = ac.createGain();
        musicBus.gain.value = 0.75;
        musicBus.connect(musicFilter);
        musicFilter.connect(master);
        sfxBus = ac.createGain();
        sfxBus.gain.value = 0.7;
        sfxBus.connect(master);
        noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        nextT = ac.currentTime + 0.08;
      }
      if (ac && ac.state === 'suspended') {
        ac.resume().catch(() => {});
      }
    },

    toggleMute() {
      A.muted = !A.muted;
      if (master) master.gain.setTargetAtTime(A.muted ? 0 : 0.85, ac.currentTime, 0.05);
      G.save.set('muted', A.muted);
      G.toast(A.muted ? 'Sound off' : 'Sound on');
    },

    setMusic(mode) {
      if (mode === A.mode) return;
      A.mode = mode;
      step = 0;
      if (ac) nextT = ac.currentTime + 0.08;
    },

    tone(f, t, dur, o = {}) {
      if (!ac) return;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = o.type || 'triangle';
      osc.frequency.setValueAtTime(f, t);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
      if (o.detune) osc.detune.value = o.detune;
      const v = o.vol ?? 0.1, at = o.attack ?? 0.015;
      const hold = o.hold ?? dur * 0.35;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + at);
      g.gain.setValueAtTime(v * 0.75, t + at + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      osc.connect(g);
      g.connect(o.bus || sfxBus);
      osc.start(t);
      osc.stop(t + at + dur + 0.05);
    },

    // Soft electric-piano / music-box note (warm fundamental + gentle 2nd harmonic)
    keyNote(midiNote, t, dur, vol = 0.09, detune = 0) {
      const f = midi(midiNote);
      A.tone(f, t, dur, { type: 'triangle', vol, attack: 0.012, hold: dur * 0.4, detune, bus: musicBus });
      A.tone(f * 2, t, dur * 0.55, { type: 'sine', vol: vol * 0.22, attack: 0.008, hold: dur * 0.15, detune, bus: musicBus });
    },

    noise(t, dur, o = {}) {
      if (!ac) return;
      const src = ac.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = ac.createBiquadFilter();
      f.type = o.filter || 'lowpass';
      f.frequency.value = o.freq || 1000;
      f.Q.value = o.q || 0.7;
      const g = ac.createGain();
      const v = o.vol ?? 0.2, at = o.attack ?? 0.01;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + at);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
      src.start(t);
      src.stop(t + at + dur + 0.05);
    },

    update() {
      if (!ac || ac.state === 'suspended' || A.mode === 'off') return;
      const now = ac.currentTime;
      if (nextT < now - 0.2) nextT = now + 0.05; // tab was hidden
      const tens = A.mode === 'play' ? A.tension : 0;
      const breathing = A.mode === 'play' && G.scene && G.scene.breathing;
      const targetFreq = breathing ? 1200 : A.mode === 'calm' ? 1800 : A.mode === 'dark' ? 800 : 2600 - tens * 1500;
      musicFilter.frequency.setTargetAtTime(targetFreq, now, 0.25);
      while (nextT < now + 0.2) {
        const dur = scheduleStep(step, nextT, tens, breathing);
        nextT += dur;
        step++;
      }
    },
  });

  function scheduleStep(s, t, tens, breathing) {
    const bus = musicBus;

    // 1. Title & Cutscenes: gentle, simple piano/music-box tune
    if (A.mode === 'title') {
      const stepDur = 60 / 76 / 2; // eighth notes at 76 BPM
      const bar = Math.floor(s / 8) % 4;
      const pos = s % 8;
      const chord = TITLE_CHORDS[bar];

      // Warm bass on beat 1 and soft fifth on beat 3
      if (pos === 0) A.tone(midi(chord[0]), t, stepDur * 4.5, { type: 'sine', vol: 0.14, attack: 0.03, bus });
      if (pos === 4) A.tone(midi(chord[1]), t, stepDur * 3.5, { type: 'sine', vol: 0.09, attack: 0.03, bus });

      // Simple broken chord backing
      const accIdx = [1, 2, 3, 2, 1, 3, 2, 1][pos];
      A.tone(midi(chord[accIdx]), t, stepDur * 1.5, { type: 'triangle', vol: 0.055, attack: 0.02, bus });

      // Sparse, simple melody on top
      const mel = TITLE_MEL[s % 32];
      if (mel) A.keyNote(mel, t, stepDur * 2.2, 0.095);

      return stepDur;
    }

    // 2. Gameplay (School & Work): steady, simplistic loop that warps with jealousy
    if (A.mode === 'play') {
      const chIdx = G.run ? G.run.chapter : 0;
      const bpm = chIdx === 1 ? 82 : 88;
      const stepDur = 60 / bpm / 2;
      const bar = Math.floor(s / 8) % 4;
      const pos = s % 8;
      const chord = PLAY_CHORDS[bar];
      const shift = chIdx === 1 ? -2 : 0; // Work chapter sits a whole step lower (Bb/Gm/Eb/F)

      // When breathing (holding Q), play a calm, slow-breathing pad instead of busy notes
      if (breathing) {
        if (pos === 0 || pos === 4) {
          chord.slice(0, 4).forEach((n, i) =>
            A.tone(midi(n + shift), t + i * 0.03, stepDur * 4.2, { type: 'sine', vol: 0.055, attack: 0.25, bus })
          );
        }
        return stepDur;
      }

      // Soft bass pulse
      if (pos === 0) A.tone(midi(chord[0] + shift), t, stepDur * 3.8, { type: 'sine', vol: 0.14, attack: 0.02, bus });
      if (pos === 4) A.tone(midi(chord[0] + shift), t, stepDur * 2.8, { type: 'triangle', vol: 0.08, attack: 0.02, bus });

      // Light, subtle paper/brush tick on offbeats
      if (pos % 2 === 1) {
        A.noise(t, 0.035, { filter: 'bandpass', freq: 2200, q: 1.5, vol: 0.018, attack: 0.004, bus });
      }

      // Simple arpeggio accompaniment
      const n = chord[PLAY_ARP[pos]] + shift;
      A.tone(midi(n), t, stepDur * 1.4, { type: 'triangle', vol: 0.065, bus });

      // Sparse melody (alternates phrase A and phrase B every 32 steps)
      const phrase = Math.floor(s / 32) % 2 === 0 ? PLAY_MEL_A : PLAY_MEL_B;
      let mel = phrase[s % 32];
      if (mel) {
        // Flatten 3rd/7th slightly when jealousy is high
        if (tens > 0.5 && (mel === 64 || mel === 71)) mel -= 1;
        A.keyNote(mel + shift, t, stepDur * 2.2, 0.085 * (1 - tens * 0.3));
      }

      // Jealousy / tension layers
      if (tens > 0.2) {
        A.tone(midi(n), t, stepDur * 1.4, { type: 'sine', vol: 0.055 * tens, detune: 14 + tens * 38, bus });
      }
      if (tens > 0.45 && pos % 4 === 2) {
        A.tone(midi(n + 1), t, stepDur * 0.9, { type: 'sawtooth', vol: 0.022 * tens, bus });
      }
      if (tens > 0.55 && s % 16 === 0) {
        A.tone(midi(chord[0] + shift - 12), t, stepDur * 14, { type: 'sawtooth', vol: 0.04 * tens, attack: 0.2, bus });
      }
      const beatEvery = tens > 0.88 ? 2 : 4;
      if (tens > 0.68 && s % beatEvery === 0) {
        A.sfx.heartbeat(t, 0.25 + tens * 0.28);
      }
      return stepDur;
    }

    // 3. Report Card / Review: minimal 2-chord waiting loop
    if (A.mode === 'report') {
      const stepDur = 60 / 72 / 2;
      const chord = REPORT_CHORDS[Math.floor(s / 8) % 2];
      const pos = s % 8;
      if (pos === 0) A.tone(midi(chord[0]), t, stepDur * 4, { type: 'sine', vol: 0.12, attack: 0.03, bus });
      if (pos % 2 === 0) {
        const n = chord[1 + (pos / 2) % 4];
        A.keyNote(n, t, stepDur * 1.8, 0.065);
      }
      return stepDur;
    }

    // 4. Calm (Closing message): warm sustained chords + simple high melody
    if (A.mode === 'calm') {
      const stepDur = 0.95;
      const chord = CALM[Math.floor(s / 4) % 4];
      if (s % 4 === 0) {
        chord.forEach((n, i) =>
          A.tone(midi(n), t + i * 0.04, 3.6, { type: 'sine', vol: i === 0 ? 0.11 : 0.055, attack: 0.4, bus })
        );
      }
      if (s % 2 === 1) {
        const mel = CALM_MEL[Math.floor(s / 2) % CALM_MEL.length];
        A.keyNote(mel, t, 1.8, 0.075);
      }
      return stepDur;
    }

    // 5. Dark (Bad ending / storm): low drone + lonely minor notes
    if (A.mode === 'dark') {
      const stepDur = 1.2;
      if (s % 4 === 0) {
        A.tone(midi(33), t, 4.6, { type: 'sawtooth', vol: 0.05, attack: 0.8, bus });
        A.tone(midi(45), t, 4.6, { type: 'sine', vol: 0.09, attack: 0.6, bus });
      }
      if (s % 2 === 1) {
        const notes = [57, 60, 64, 62, 57, 65, 64, 55];
        const n = notes[Math.floor(s / 2) % notes.length];
        A.keyNote(n, t, 2.2, 0.065, -8);
      }
      return stepDur;
    }

    return 0.5;
  }

  const now = () => (ac ? ac.currentTime : 0);
  A.sfx = {
    click() { A.tone(700, now(), 0.04, { type: 'square', vol: 0.03 }); },
    good() {
      const t = now();
      A.tone(660, t, 0.12, { vol: 0.1 });
      A.tone(990, t + 0.08, 0.2, { vol: 0.1 });
    },
    bad() { A.tone(220, now(), 0.28, { type: 'sawtooth', vol: 0.06, slide: 140 }); },
    nope() { A.tone(180, now(), 0.08, { type: 'square', vol: 0.04 }); },
    note(i) { A.tone(midi(64 + [0, 2, 4, 7, 9, 12, 14][i % 7]), now(), 0.12, { vol: 0.08 }); },
    buzz() { A.tone(140, now(), 0.12, { type: 'square', vol: 0.04 }); },
    pop() { A.tone(700, now(), 0.08, { type: 'sine', slide: 1500, vol: 0.07 }); },
    soft() {
      const t = now();
      A.tone(523, t, 0.3, { type: 'sine', vol: 0.06 });
      A.tone(784, t + 0.1, 0.4, { type: 'sine', vol: 0.05 });
    },
    praise() {
      const t = now();
      [1046, 1318, 1568, 2093].forEach((f, i) =>
        A.tone(f, t + i * 0.06, 0.35, { type: 'sine', vol: 0.06 }));
    },
    praiseMe() {
      const t = now();
      [784, 988, 1175].forEach((f, i) => A.tone(f, t + i * 0.08, 0.4, { type: 'sine', vol: 0.07 }));
    },
    heartbeat(t = now(), vol = 0.35) {
      A.tone(70, t, 0.12, { type: 'sine', vol, slide: 40 });
      A.tone(62, t + 0.17, 0.12, { type: 'sine', vol: vol * 0.8, slide: 38 });
    },
    outburst() {
      const t = now();
      A.noise(t, 0.7, { vol: 0.45, freq: 900 });
      A.tone(110, t, 0.7, { type: 'sawtooth', vol: 0.16, slide: 50 });
      A.tone(165, t, 0.5, { type: 'square', vol: 0.06, slide: 70 });
    },
    breath(inhale) {
      A.noise(now(), 3.4, { vol: 0.05, filter: 'bandpass', freq: inhale ? 700 : 450, q: 0.8, attack: 1.4 });
    },
    stamp() {
      const t = now();
      A.noise(t, 0.12, { vol: 0.3, freq: 500 });
      A.tone(90, t, 0.15, { type: 'sine', vol: 0.2 });
    },
    tick() { A.tone(1200, now(), 0.03, { type: 'square', vol: 0.02 }); },
  };
})();
