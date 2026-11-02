// sfx.js — tiny synthesized cartoon sound effects (no audio files needed).
(function () {
  let ac = null;
  const Sfx = {
    on: true,
    ctx() {
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    },
    // everything goes through one master node so recordings can tap it
    out() {
      if (!this.master) { this.master = ac.createGain(); this.master.connect(ac.destination); }
      return this.master;
    },
    // an audio track of the sound effects, for video recording
    streamTrack() {
      const a = this.ctx(); if (!a || !a.createMediaStreamDestination) return null;
      if (!this.rec) { this.rec = a.createMediaStreamDestination(); this.out().connect(this.rec); }
      return this.rec.stream.getAudioTracks()[0] || null;
    },
    tone(type, f0, f1, dur, vol, delay) {
      const a = this.ctx(); if (!a) return;
      const t = a.currentTime + (delay || 0);
      const o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.out()); o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, vol, freq, delay, q) {
      const a = this.ctx(); if (!a) return;
      const t = a.currentTime + (delay || 0);
      const len = Math.floor(a.sampleRate * dur);
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = a.createBufferSource(); src.buffer = buf;
      const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200; f.Q.value = q || 1;
      const g = a.createGain(); g.gain.value = vol || 0.3;
      src.connect(f); f.connect(g); g.connect(this.out()); src.start(t);
    },
    play(name) {
      if (!this.on) return;
      try {
        switch (name) {
          case 'boom': this.noise(1.1, 0.7, 500); this.tone('sine', 120, 30, 0.8, 0.5); break;
          case 'boing': this.tone('sine', 220, 660, 0.25, 0.25); this.tone('sine', 660, 300, 0.25, 0.15, 0.2); break;
          case 'pop': this.tone('square', 600, 1400, 0.08, 0.12); break;
          case 'poof': this.noise(0.35, 0.25, 2500); break;
          case 'whoosh': this.noise(0.6, 0.25, 900, 0, 4); break;
          case 'thud': this.tone('sine', 140, 40, 0.3, 0.5); this.noise(0.2, 0.2, 300); break;
          case 'chomp': this.noise(0.08, 0.35, 1800); this.noise(0.08, 0.35, 1800, 0.18); break;
          case 'ding': this.tone('triangle', 880, 880, 0.5, 0.2); this.tone('triangle', 1320, 1320, 0.6, 0.12, 0.08); break;
          case 'up': this.tone('square', 200, 900, 0.5, 0.08); break;
          case 'down': this.tone('square', 900, 150, 0.5, 0.08); break;
          case 'zap': for (let i = 0; i < 4; i++) this.tone('sawtooth', 1200, 200, 0.07, 0.08, i * 0.07); break;
          case 'fart': this.tone('sawtooth', 90, 60, 0.5, 0.25); this.noise(0.4, 0.15, 400); break;
          case 'sizzle': this.noise(1.2, 0.18, 6000); break;
          case 'freeze': this.tone('triangle', 2000, 3000, 0.3, 0.08); this.tone('triangle', 2600, 3600, 0.3, 0.08, 0.1); break;
          case 'squeak': this.tone('sine', 900, 1800, 0.12, 0.15); this.tone('sine', 1800, 900, 0.12, 0.12, 0.12); break;
          case 'music': [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.2, 0.12, i * 0.15)); break;
          case 'sad': [392, 370, 349, 330].forEach((f, i) => this.tone('triangle', f, f * 0.98, 0.35, 0.12, i * 0.3)); break;
          case 'laugh': for (let i = 0; i < 4; i++) this.tone('square', 500 - i * 30, 400 - i * 30, 0.1, 0.05, i * 0.16); break;
          case 'sneeze': this.noise(0.4, 0.4, 3000, 0.4); break;
          case 'magic': for (let i = 0; i < 6; i++) this.tone('sine', 900 + i * 180, 1000 + i * 180, 0.15, 0.06, i * 0.06); break;
          case 'splash': this.noise(0.7, 0.3, 1500, 0, 0.5); break;
          case 'hey': this.tone('sawtooth', 300, 500, 0.15, 0.08); break;
        }
      } catch (e) { /* audio is best-effort */ }
    },
  };
  window.Sfx = Sfx;
})();
