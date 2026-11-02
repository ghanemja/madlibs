// sketch.js — wobbly, hand-drawn canvas primitives.
// Every line is jittered slightly, and the jitter seed changes a few times a
// second so the whole cartoon "boils" like a hand-drawn animation.
(function () {
  const Sk = {
    ctx: null,
    seed: 1,
    n: 0,
    amp: 1.4,     // jitter in px
    ink: '#2a2a2a',
    lw: 3,        // line width in px
    unit: 1,      // current transform scale, so lines stay ~lw px wide
    toon: true,   // bold "cartoon" style: thick ink, cel shading, big eyes
    shade: false, // cel-shade filled shapes (turned on while drawing actors)
    font: '"Patrick Hand", "Comic Sans MS", "Chalkboard SE", cursive',

    begin(ctx, seed) { this.ctx = ctx; this.seed = seed; this.n = 0; this.unit = 1; },

    // deterministic pseudo-random in [0,1) for the current seed
    r() {
      this.n++;
      const v = Math.sin(this.n * 12.9898 + this.seed * 78.233) * 43758.5453;
      return v - Math.floor(v);
    },
    j() { return (this.r() - 0.5) * 2 * this.amp / this.unit; },

    _finish(fill, opts, bb) {
      const c = this.ctx;
      opts = opts || {};
      if (fill) {
        c.fillStyle = fill; c.fill();
        if (this.toon && this.shade && bb && !opts.flat) this._cel(bb);
      }
      if (opts.noStroke) return;
      c.strokeStyle = opts.ink || this.ink;
      c.lineWidth = (opts.lw || this.lw) / this.unit;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.stroke();
    },

    // cel shading: a soft highlight top-left and a hard-edged shadow band bottom-right
    _cel(bb) {
      const c = this.ctx;
      const w = bb[2] - bb[0], h = bb[3] - bb[1];
      if (w < 4 && h < 4) return;
      c.save();
      c.clip();
      const g = c.createLinearGradient(bb[0], bb[1], bb[2], bb[3]);
      g.addColorStop(0, 'rgba(255,255,255,.35)');
      g.addColorStop(0.28, 'rgba(255,255,255,0)');
      g.addColorStop(0.6, 'rgba(30,10,70,0)');
      g.addColorStop(0.6, 'rgba(30,10,70,.2)');
      g.addColorStop(1, 'rgba(30,10,70,.3)');
      c.fillStyle = g;
      c.fillRect(bb[0] - 2, bb[1] - 2, w + 4, h + 4);
      c.restore();
    },
    _bb(pts) {
      let a = Infinity, b = Infinity, cc = -Infinity, d = -Infinity;
      for (const [x, y] of pts) { if (x < a) a = x; if (y < b) b = y; if (x > cc) cc = x; if (y > d) d = y; }
      return [a, b, cc, d];
    },

    line(x1, y1, x2, y2, opts) {
      const c = this.ctx;
      c.beginPath();
      c.moveTo(x1 + this.j(), y1 + this.j());
      c.quadraticCurveTo((x1 + x2) / 2 + this.j() * 1.5, (y1 + y2) / 2 + this.j() * 1.5, x2 + this.j(), y2 + this.j());
      this._finish(null, opts);
    },

    // smooth curve through points (open or closed)
    path(pts, fill, closed, opts) {
      const c = this.ctx;
      if (pts.length < 2) return;
      const p = pts.map(([x, y]) => [x + this.j(), y + this.j()]);
      c.beginPath();
      if (closed) {
        const n = p.length;
        const m0 = mid(p[n - 1], p[0]);
        c.moveTo(m0[0], m0[1]);
        for (let i = 0; i < n; i++) {
          const m = mid(p[i], p[(i + 1) % n]);
          c.quadraticCurveTo(p[i][0], p[i][1], m[0], m[1]);
        }
        c.closePath();
      } else {
        c.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < p.length - 1; i++) {
          const m = mid(p[i], p[i + 1]);
          c.quadraticCurveTo(p[i][0], p[i][1], m[0], m[1]);
        }
        const l = p[p.length - 1];
        c.lineTo(l[0], l[1]);
      }
      this._finish(closed ? fill : null, opts, closed && fill ? this._bb(p) : null);
    },

    // straight-edged polygon with wobbly edges
    poly(pts, fill, opts) {
      const c = this.ctx;
      const p = pts.map(([x, y]) => [x + this.j(), y + this.j()]);
      c.beginPath();
      c.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i <= p.length; i++) {
        const a = p[i - 1], b = p[i % p.length];
        c.quadraticCurveTo((a[0] + b[0]) / 2 + this.j(), (a[1] + b[1]) / 2 + this.j(), b[0], b[1]);
      }
      c.closePath();
      this._finish(fill, opts, fill ? this._bb(p) : null);
    },

    rect(x, y, w, h, fill, opts) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, opts); },

    ellipse(cx, cy, rx, ry, fill, opts) {
      const pts = [];
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const k = 1 + (this.r() - 0.5) * 0.05;
        pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
      }
      this.path(pts, fill, true, opts);
    },
    circle(cx, cy, r, fill, opts) { this.ellipse(cx, cy, r, r, fill, opts); },

    // clean filled dot (eyes etc.)
    dot(x, y, r, color) {
      const c = this.ctx;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = color || this.ink;
      c.fill();
    },

    arc(cx, cy, r, a0, a1, opts) {
      const pts = [];
      const n = 8;
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * (i / n);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      this.path(pts, null, false, opts);
    },

    text(str, x, y, size, color, opts) {
      const c = this.ctx;
      opts = opts || {};
      c.font = `${opts.weight || ''} ${size}px ${this.font}`;
      c.textAlign = opts.align || 'center';
      c.textBaseline = opts.baseline || 'middle';
      if (opts.outline) {
        c.lineWidth = opts.outline;
        c.strokeStyle = opts.outlineColor || '#fff';
        c.lineJoin = 'round';
        c.strokeText(str, x, y);
      }
      c.fillStyle = color || this.ink;
      c.fillText(str, x, y);
    },

    heart(x, y, s, fill) {
      this.path([[x, y + s * 0.9], [x - s, y], [x - s * 0.6, y - s * 0.7], [x, y - s * 0.3], [x + s * 0.6, y - s * 0.7], [x + s, y]], fill, true);
    },

    star(x, y, r, fill, points) {
      points = points || 5;
      const pts = [];
      for (let i = 0; i < points * 2; i++) {
        const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.45 : r;
        pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
      }
      this.poly(pts, fill);
    },

    // Cartoon face. expr: smile happy frown sad angry surprised scream sleep
    // laugh cry sing silly dizzy love blush x meh worried
    face(x, y, s, expr) {
      const ink = this.ink;
      const ex = s * 0.32, ey = y - s * 0.12, er = Math.max(1.6, s * 0.09);
      const eyes = (fn) => { fn(x - ex, ey); fn(x + ex, ey); };
      switch (expr) {
        case 'sleep': case 'happy': case 'laugh':
          eyes((px, py) => this.arc(px, py + er, er * 1.6, Math.PI * 1.15, Math.PI * 1.85, { lw: 2 }));
          break;
        case 'x':
          eyes((px, py) => { const d = er * 1.4; this.line(px - d, py - d, px + d, py + d, { lw: 2 }); this.line(px + d, py - d, px - d, py + d, { lw: 2 }); });
          break;
        case 'dizzy':
          eyes((px, py) => this.path([[px, py], [px + er, py], [px + er, py + er], [px - er, py + er], [px - er * 1.2, py - er * 1.2], [px + er * 1.6, py - er * 1.4]], null, false, { lw: 1.8 }));
          break;
        case 'love':
          eyes((px, py) => this.heart(px, py, er * 1.5, '#e8466b'));
          break;
        case 'surprised': case 'scream': case 'worried':
          eyes((px, py) => { this.circle(px, py, er * 1.9, '#fff', { lw: 1.8 }); this.dot(px, py, er * 0.9, ink); });
          break;
        default:
          if (this.toon && s > 12) {
            eyes((px, py) => {
              this.ellipse(px, py, er * 1.9, er * 2.3, '#fff', { lw: 1.6, flat: true });
              this.dot(px + er * 0.45, py + er * 0.2, er * 1.15, '#1b1530');
              this.dot(px + er * 0.1, py - er * 0.4, er * 0.45, '#fff');
            });
          } else eyes((px, py) => this.dot(px, py, er, ink));
      }
      if (expr === 'angry') {
        this.line(x - ex - er * 2, ey - er * 3.2, x - ex + er * 1.5, ey - er * 1.8, { lw: 2.2 });
        this.line(x + ex + er * 2, ey - er * 3.2, x + ex - er * 1.5, ey - er * 1.8, { lw: 2.2 });
      }
      if (expr === 'worried' || expr === 'sad' || expr === 'cry') {
        this.line(x - ex - er * 1.6, ey - er * 2, x - ex + er * 1.4, ey - er * 3, { lw: 1.8 });
        this.line(x + ex + er * 1.6, ey - er * 2, x + ex - er * 1.4, ey - er * 3, { lw: 1.8 });
      }
      const my = y + s * 0.28, mw = s * 0.32;
      switch (expr) {
        case 'frown': case 'sad': case 'angry': case 'worried':
          this.arc(x, my + mw * 0.8, mw * 0.8, Math.PI * 1.2, Math.PI * 1.8, { lw: 2 });
          break;
        case 'cry':
          this.path([[x - mw, my + 3], [x - mw * 0.4, my - 2], [x, my + 2], [x + mw * 0.4, my - 2], [x + mw, my + 3]], null, false, { lw: 2 });
          break;
        case 'surprised': case 'sing':
          this.circle(x, my, mw * 0.4, '#5a2a2a', { lw: 1.8 });
          break;
        case 'scream':
          this.ellipse(x, my + 2, mw * 0.55, mw * 0.8, '#5a2a2a', { lw: 1.8 });
          break;
        case 'laugh':
          this.path([[x - mw, my - 3], [x + mw, my - 3], [x, my + mw]], '#5a2a2a', true, { lw: 1.8 });
          break;
        case 'meh': case 'x': case 'sleep': case 'dizzy':
          this.line(x - mw * 0.6, my, x + mw * 0.6, my, { lw: 2 });
          break;
        case 'silly':
          this.arc(x, my - mw * 0.6, mw, Math.PI * 0.15, Math.PI * 0.85, { lw: 2 });
          this.ellipse(x + mw * 0.3, my + mw * 0.45, mw * 0.25, mw * 0.35, '#ef7a95', { lw: 1.5 });
          break;
        case 'happy': case 'love':
          this.path([[x - mw, my - 3], [x + mw, my - 3], [x, my + mw * 0.8]], '#fff', true, { lw: 1.8 });
          break;
        default: // smile, blush
          this.arc(x, my - mw * 0.6, mw, Math.PI * 0.2, Math.PI * 0.8, { lw: 2 });
      }
      if (expr === 'blush' || expr === 'love' || expr === 'happy') {
        this.dot(x - ex - er * 1.6, my - er, er * 1.4, 'rgba(240,110,130,.45)');
        this.dot(x + ex + er * 1.6, my - er, er * 1.4, 'rgba(240,110,130,.45)');
      }
    },
  };

  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

  // ---- color helpers ----
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function shade(hex, amt) {
    if (!hex || hex[0] !== '#') return hex;
    const [r, g, b] = hexToRgb(hex);
    const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  window.Sk = Sk;
  window.Color = { shade, hexToRgb, hashStr };
})();
