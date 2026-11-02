// charts.js — the 📊 Data page: plain-SVG charts comparing human and AI answers on Fun Libs.
// Colors follow the entity everywhere: humans = blue, AI = orange, original text = aqua.
(function () {
  const $ = (id) => document.getElementById(id);
  const FL = window.FUNLIBS, AI = window.AI_FILLS || { fills: [] };
  if (!FL || !window.App || !$('charts')) return;
  const esc = App.esc;

  const C = { human: '#2a78d6', ai: '#eb6834', orig: '#1baf7a', usJ: '#6250d6', inJ: '#008300', you: '#6250d6', grid: '#e4dfd2', axis: '#9a9384', muted: '#7a7466', ink: '#2a2a2a' };
  const stories = FL.stories;
  const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
  const norm = (w) => String(w).toLowerCase().trim().replace(/\s+/g, ' ');
  const pct = (v) => Math.round(v * 100) + '%';

  // ---------------------------------------------------------------- stats (same definitions as tools/analyze.py)
  function wordStats(fills) {
    const words = fills.flatMap((f) => f.words.map(norm));
    const c = new Map();
    for (const w of words) c.set(w, (c.get(w) || 0) + 1);
    const top = [...c.entries()].sort((a, b) => b[1] - a[1]);
    return { n: words.length, fills: fills.length, distinct: c.size / words.length, top10: top.slice(0, 10).reduce((s, [, n]) => s + n, 0) / words.length, top };
  }
  function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  // humans subsampled to the AI's answers-per-story, so sample size doesn't drive the comparison
  function matchedHuman(perStory, draws) {
    const r = rng(7); let d = 0, t = 0;
    for (let k = 0; k < draws; k++) {
      const fills = [];
      for (const st of stories) {
        const hs = [...st.human];
        for (let i = 0; i < perStory && hs.length; i++) fills.push(hs.splice(Math.floor(r() * hs.length), 1)[0]);
      }
      const s = wordStats(fills); d += s.distinct; t += s.top10;
    }
    return { distinct: d / draws, top10: t / draws };
  }

  // ---------------------------------------------------------------- SVG pieces
  let W = 520; // set from the real width at render time so text stays full size on phones
  function barH(x, y, w, h, r) { r = Math.min(r, w, h / 2); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; }
  function barV(x, y, w, h, r) { r = Math.min(r, h, w / 2); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; }

  // horizontal bars: rows [{label, value, color, tip}]
  function hbars(rows, o) {
    const rowH = 26, padL = o.padL || 130, padR = 56, H = rows.length * rowH + 6;
    const max = o.max || Math.max(...rows.map((r) => r.value), 1e-9);
    const plot = W - padL - padR;
    let g = `<line x1="${padL}" y1="2" x2="${padL}" y2="${H - 2}" stroke="${C.axis}" stroke-width="1"/>`;
    rows.forEach((r, i) => {
      const y = 3 + i * rowH, w = Math.max(2, (plot * r.value) / max);
      g += `<g class="hit" data-tip="${esc(r.tip)}"><rect x="0" y="${y}" width="${W}" height="${rowH}" fill="transparent"/>
        <text x="${padL - 8}" y="${y + rowH / 2}" text-anchor="end" dominant-baseline="central" class="t-lab">${esc(r.label)}</text>
        <path d="${barH(padL + 1, y + 5, w, rowH - 10, 4)}" fill="${r.color}"/>
        <text x="${padL + w + 7}" y="${y + rowH / 2}" dominant-baseline="central" class="t-val">${esc(o.fmt(r.value))}</text></g>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title)}">${g}</svg>`;
  }

  // vertical bars, optionally grouped: groups [{label, bars:[{value, color, tip, name}]}]
  function vbars(groups, o) {
    const H = 250, padL = 40, padR = 12, padT = 22, padB = 40, plotH = H - padT - padB, plotW = W - padL - padR;
    const max = o.max;
    const y = (v) => padT + plotH - (plotH * v) / max;
    let g = '';
    for (const t of o.ticks) g += `<line x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}" stroke="${C.grid}" stroke-width="1"/><text x="${padL - 6}" y="${y(t)}" text-anchor="end" dominant-baseline="central" class="t-ax">${esc(o.tickFmt(t))}</text>`;
    const gw = plotW / groups.length;
    groups.forEach((grp, gi) => {
      const n = grp.bars.length, bw = Math.min(70, (gw - 28) / n - 2);
      const x0 = padL + gi * gw + (gw - (bw + 2) * n + 2) / 2;
      grp.bars.forEach((b, bi) => {
        const x = x0 + bi * (bw + 2), top = y(b.value), h = Math.max(2, y(0) - top);
        g += `<g class="hit" data-tip="${esc(b.tip)}"><rect x="${x - 1}" y="${padT}" width="${bw + 2}" height="${plotH}" fill="transparent"/>
          <path d="${barV(x, y(0) - h, bw, h, 4)}" fill="${b.color}"/>
          <text x="${x + bw / 2}" y="${y(0) - h - 6}" text-anchor="middle" class="t-val">${esc(o.fmt(b.value))}</text></g>`;
      });
      g += `<text x="${padL + gi * gw + gw / 2}" y="${H - padB + 18}" text-anchor="middle" class="t-lab">${esc(grp.label)}</text>`;
    });
    g += `<line x1="${padL}" x2="${W - padR}" y1="${y(0)}" y2="${y(0)}" stroke="${C.axis}" stroke-width="1"/>`;
    if (o.ref) g += `<line x1="${padL}" x2="${W - padR}" y1="${y(o.ref.value)}" y2="${y(o.ref.value)}" stroke="${C.muted}" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W - padR}" y="${y(o.ref.value) - 6}" text-anchor="end" class="t-ax">${esc(o.ref.label)}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title)}">${g}</svg>`;
  }

  // line: points [{x, y, tip}] on 0..1, with a dashed reference
  function line(points, o) {
    const H = 230, padL = 40, padR = 16, padT = 16, padB = 34, plotH = H - padT - padB, plotW = W - padL - padR;
    const n = points.length, xmax = Math.max(n, 2);
    const X = (i) => padL + (plotW * (i - 1)) / (xmax - 1), Y = (v) => padT + plotH - plotH * v;
    let g = '';
    for (const t of [0, 0.25, 0.5, 0.75, 1]) g += `<line x1="${padL}" x2="${W - padR}" y1="${Y(t)}" y2="${Y(t)}" stroke="${C.grid}"/><text x="${padL - 6}" y="${Y(t)}" text-anchor="end" dominant-baseline="central" class="t-ax">${pct(t)}</text>`;
    g += `<line x1="${padL}" x2="${W - padR}" y1="${Y(0.5)}" y2="${Y(0.5)}" stroke="${C.muted}" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${W - padR}" y="${Y(0.5) - 6}" text-anchor="end" class="t-ax">random guessing</text>`;
    g += `<path d="${points.map((p, i) => (i ? 'L' : 'M') + X(i + 1) + ',' + Y(p.y)).join('')}" fill="none" stroke="${o.color}" stroke-width="2" stroke-linejoin="round"/>`;
    const last = points[n - 1];
    g += `<circle cx="${X(n)}" cy="${Y(last.y)}" r="5" fill="${o.color}" stroke="#fffdf6" stroke-width="2"/>`;
    points.forEach((p, i) => { g += `<rect class="hit" data-tip="${esc(p.tip)}" x="${X(i + 1) - Math.max(4, plotW / xmax / 2)}" y="${padT}" width="${Math.max(8, plotW / xmax)}" height="${plotH}" fill="transparent"/>`; });
    g += `<text x="${padL + plotW / 2}" y="${H - 6}" text-anchor="middle" class="t-ax">guess number</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title)}">${g}</svg>`;
  }

  const legend = (items) => `<div class="legend">${items.map(([name, color]) => `<span><i style="background:${color}"></i>${esc(name)}</span>`).join('')}</div>`;
  const table = (head, rows) => `<details class="tview"><summary>Show as table</summary><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
  const card = (title, sub, body, extra) => `<article class="chart paper"><h3>${esc(title)}</h3><p class="muted small">${sub}</p>${body}${extra || ''}</article>`;

  // ---------------------------------------------------------------- page
  function render() {
    const first = document.querySelector('#charts .chart');
    const avail = (first ? first.clientWidth - 32 : Math.min($('charts').clientWidth, 560) - 32) || 488;
    W = Math.max(290, Math.min(560, Math.round(avail)));
    const human = stories.flatMap((s) => s.human.map((h) => ({ story: s.id, words: h.words, h })));
    const orig = stories.map((s) => ({ story: s.id, words: s.blanks.map((b) => b.original) }));
    const aiSources = [...new Set(AI.fills.map((f) => f.source))];
    const aiAll = AI.fills.filter((f) => byId[f.story]);
    const perStory = Math.max(1, Math.round(aiAll.length / stories.length));
    const H = wordStats(human), A = wordStats(aiAll), O = wordStats(orig), M = matchedHuman(perStory, 120);
    const recs = (window.Research && Research.records()) || [];
    const guesses = recs.filter((r) => r.type === 'guess');
    const right = guesses.filter((r) => r.correct).length;
    const aiName = (s) => (s === 'claude-seed' ? 'AI (Claude seed set)' : 'AI: ' + s.replace(/^(anthropic|openai):/, ''));

    // headline numbers
    $('tiles').innerHTML = [
      [stories.length, 'research stories'],
      [human.length, 'stories filled in by humans'],
      [aiAll.length, 'stories filled in by AI'],
      [guesses.length ? pct(right / guesses.length) : '—', guesses.length ? `your score (${right}/${guesses.length})` : 'your score: play to find out'],
    ].map(([v, l]) => `<div class="tile paper"><b>${esc(String(v))}</b><span>${esc(l)}</span></div>`).join('');

    const out = [];

    // 1. variety
    const varRows = [
      { label: 'Original text', value: O.distinct, color: C.orig, tip: `Original Wikipedia words: ${pct(O.distinct)} of ${O.n} words are different` },
      { label: 'Humans', value: M.distinct, color: C.human, tip: `Humans: ${pct(M.distinct)} distinct (${perStory} random fill-ins per story, averaged over 120 draws, to match the AI sample size)` },
      ...aiSources.map((s) => { const st = wordStats(aiAll.filter((f) => f.source === s)); return { label: aiName(s).replace('AI (Claude seed set)', 'AI'), value: st.distinct, color: C.ai, tip: `${aiName(s)}: ${pct(st.distinct)} of ${st.n} words are different` }; }),
    ];
    out.push(card('How varied are the words?', `Share of typed words that are <b>different from each other</b>. Higher means more variety. Humans: <b>${pct(M.distinct)}</b> · AI: <b>${pct(A.distinct)}</b>.`,
      hbars(varRows, { max: 1, fmt: pct, title: 'Share of distinct words' }),
      table(['group', 'distinct words'], varRows.map((r) => [r.label, pct(r.value)]))));

    // 2. favourite-word share
    const favRows = [
      { label: 'Original text', value: O.top10, color: C.orig, tip: `Original text: its 10 most common words are ${pct(O.top10)} of all its words` },
      { label: 'Humans', value: M.top10, color: C.human, tip: `Humans: top 10 words are ${(100 * M.top10).toFixed(1)}% of all their words (size-matched)` },
      { label: 'AI', value: A.top10, color: C.ai, tip: `AI: top 10 words are ${(100 * A.top10).toFixed(1)}% of all its words` },
    ];
    out.push(card('Who leans on favorite words?', 'Share of all words taken up by a group\'s <b>10 most-used words</b>. Higher means more repetitive.',
      hbars(favRows, { fmt: (v) => (100 * v).toFixed(1) + '%', title: 'Top-10 word share' }),
      table(['group', 'top-10 share'], favRows.map((r) => [r.label, (100 * r.value).toFixed(1) + '%']))));

    // 3 + 4. top words per group, per 1,000 answers so different sample sizes compare
    const topRows = (S, color, who) => S.top.slice(0, 10).map(([w, n]) => ({ label: w, value: (1000 * n) / S.n, color, tip: `${who} used “${w}” ${n} times (${((1000 * n) / S.n).toFixed(1)} per 1,000 words)` }));
    const hTop = topRows(H, C.human, 'Humans'), aTop = topRows(A, C.ai, 'The AI');
    const topMax = Math.max(...hTop.map((r) => r.value), ...aTop.map((r) => r.value));
    out.push(card('Humans\' favorite words', `Uses per 1,000 words, out of ${H.n.toLocaleString()} words humans typed.`,
      hbars(hTop, { max: topMax, padL: 110, fmt: (v) => v.toFixed(1), title: 'Most used human words' }),
      table(['word', 'per 1,000 words'], hTop.map((r) => [r.label, r.value.toFixed(1)]))));
    out.push(card('The AI\'s favorite words', `Uses per 1,000 words, out of ${A.n.toLocaleString()} words the AI picked. Same scale as the human chart.`,
      hbars(aTop, { max: topMax, padL: 110, fmt: (v) => v.toFixed(1), title: 'Most used AI words' }),
      table(['word', 'per 1,000 words'], aTop.map((r) => [r.label, r.value.toFixed(1)]))));

    // 5. funniest human words (judge votes)
    const wf = new Map();
    for (const s of stories) for (const h of s.human) if (h.wordFunny) h.words.forEach((w, i) => { const k = norm(w); const e = wf.get(k) || { n: 0, sum: 0 }; e.n++; e.sum += h.wordFunny[i]; wf.set(k, e); });
    const funnyRows = [...wf.entries()].filter(([, e]) => e.n >= 4).map(([w, e]) => ({ w, n: e.n, v: e.sum / e.n })).sort((a, b) => b.v - a.v).slice(0, 10)
      .map((r) => ({ label: r.w, value: r.v, color: C.human, tip: `“${r.w}”: on average ${pct(r.v)} of judges marked it funny (used ${r.n} times)` }));
    out.push(card('Which human words got the laughs?', 'Share of judges who marked the word funny, averaged over every time it was used (words used 4+ times).',
      hbars(funnyRows, { max: 1, padL: 110, fmt: pct, title: 'Funniest words by judge votes' }),
      table(['word', 'judges who laughed'], funnyRows.map((r) => [r.label, pct(r.value)]))));

    // 6. who's judging: 10 test stories rated by both judge pools
    const cell = (filler, judges) => {
      const v = stories.filter((s) => s.split === 'test').flatMap((s) => s.human.filter((h) => h.filler === filler && h.ratings[judges]).map((h) => h.ratings[judges].funny)).filter((x) => x != null);
      return v.reduce((a, b) => a + b, 0) / (v.length || 1);
    };
    const jg = ['US', 'India'].map((f) => ({
      label: f === 'US' ? 'US players' : 'Indian players',
      bars: [['US', C.usJ], ['India', C.inJ]].map(([j, color]) => { const v = cell(f, j); return { value: v, color, tip: `${f === 'US' ? 'US' : 'Indian'} players' stories, rated by ${j === 'US' ? 'US' : 'Indian'} judges: ${v.toFixed(2)} / 3` }; }),
    }));
    out.push(card('Does it matter who\'s judging?', 'Average funniness (0–3) of the 10 test stories, which were rated by <b>both</b> judge groups.',
      legend([['US judges', C.usJ], ['Indian judges', C.inJ]]) + vbars(jg, { max: 3, ticks: [0, 1, 2, 3], tickFmt: String, fmt: (v) => v.toFixed(2), title: 'Funniness by player and judge country' }),
      table(['players', 'US judges', 'Indian judges'], jg.map((g) => [g.label, g.bars[0].value.toFixed(2), g.bars[1].value.toFixed(2)]))));

    // 7. your Turing test
    if (guesses.length) {
      const by = (t) => guesses.filter((r) => r.truth === t);
      const acc = (rs) => (rs.length ? rs.filter((r) => r.correct).length / rs.length : 0);
      const yg = [
        { label: `Human-written (${by('human').length})`, bars: [{ value: acc(by('human')), color: C.human, tip: `Stories humans wrote: you called ${by('human').filter((r) => r.correct).length} of ${by('human').length} right` }] },
        { label: `AI-written (${by('ai').length})`, bars: [{ value: acc(by('ai')), color: C.ai, tip: `Stories the AI wrote: you caught ${by('ai').filter((r) => r.correct).length} of ${by('ai').length}` }] },
      ];
      out.push(card('Your Turing test: what fools you?', 'How often you guessed right, split by who really wrote the story. The dashed line is a coin flip.',
        vbars(yg, { max: 1, ticks: [0, 0.25, 0.5, 0.75, 1], tickFmt: pct, fmt: pct, ref: { value: 0.5, label: 'random guessing' }, title: 'Your accuracy by story author' }),
        table(['story author', 'guesses', 'right'], yg.map((g, i) => [g.label, by(i ? 'ai' : 'human').length, pct(g.bars[0].value)]))));
      let c = 0;
      const pts = guesses.map((r, i) => { c += r.correct; return { y: c / (i + 1), tip: `After ${i + 1} guess${i ? 'es' : ''}: ${c} right (${pct(c / (i + 1))})` }; });
      out.push(card('Are you getting better?', 'Your running score over every guess you\'ve made.',
        line(pts, { color: C.you, title: 'Running accuracy' }),
        table(['guess', 'running score'], pts.map((p, i) => [i + 1, pct(p.y)]))));
    } else {
      out.push(`<article class="chart paper empty"><h3>Your Turing test</h3><p class="muted">Play a few rounds of “Human or AI?” and your results show up here: how often you spot the AI, and whether you get better.</p><button class="btn" id="dataPlay">▶ Play now</button></article>`);
    }

    $('charts').innerHTML = out.join('');
    const dp = $('dataPlay'); if (dp) dp.onclick = () => $('labGuess').click();
    $('dataNote').innerHTML = `Human data: ${esc(FL.source.citation)} ${aiSources.includes('claude-seed') ? '<br>The AI seed set was written in one pass by a Claude model, so it is not an independent sample. Generate more with <code>tools/generate_ai_fills.py</code> for real comparisons.' : ''}`;
  }

  // shared hover tooltip
  const tip = document.createElement('div');
  tip.className = 'tip'; tip.hidden = true;
  document.body.appendChild(tip);
  function move(e) {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t || !$('charts').contains(t)) { tip.hidden = true; document.querySelectorAll('.hit.on').forEach((x) => x.classList.remove('on')); return; }
    tip.textContent = t.dataset.tip; tip.hidden = false;
    const x = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14), y = e.clientY - tip.offsetHeight - 12;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = (y < 8 ? e.clientY + 18 : y) + 'px';
    document.querySelectorAll('.hit.on').forEach((x2) => x2 !== t && x2.classList.remove('on'));
    t.classList.add('on');
  }
  $('charts').addEventListener('pointermove', move);
  $('charts').addEventListener('pointerleave', () => { tip.hidden = true; });

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!$('data').hidden) render(); }, 200); });
  const prevShow = App.onShow;
  App.onShow = (view) => { if (prevShow) prevShow(view); tip.hidden = true; if (view === 'data') render(); };
  const openData = () => App.show('data');
  $('openData').onclick = openData;
  $('navData').onclick = openData;
  $('dataBack').onclick = () => App.show('labView');
})();
