// lexicon.js — turns whatever someone typed into something we know how to draw.
// Handles tenses ("exploded", "flying"), plurals ("bananas", "mice"),
// multi-word phrases ("blow up", "ice cream"), typos ("explpde") and mixed
// inputs ("giant flaming taco" → adjectives giant+flaming, noun taco).
(function () {
  const IRREGULAR = {
    flew: 'fly', flown: 'fly', ran: 'run', ate: 'eat', eaten: 'eat', fell: 'fall', fallen: 'fall', sang: 'sing', sung: 'sing',
    slept: 'sleep', froze: 'freeze', frozen: 'freeze', swam: 'swim', blew: 'blow', threw: 'throw', thrown: 'throw', hid: 'hide',
    bit: 'bite', shook: 'shake', grew: 'grow', drove: 'drive', rode: 'ride', sat: 'sit', spun: 'spin', went: 'go', did: 'do',
    made: 'make', fought: 'fight', caught: 'catch', taught: 'teach', bought: 'buy', brought: 'bring', thought: 'think',
    laid: 'lay', lay: 'lie', stole: 'steal', woke: 'wake', broke: 'break', broken: 'break', wore: 'wear', tore: 'tear',
    sank: 'sink', sunk: 'sink', stank: 'stink', drank: 'drink', shot: 'shoot', struck: 'strike', burnt: 'burn',
    mice: 'mouse', geese: 'goose', people: 'person', children: 'kid', men: 'man', women: 'woman', teeth: 'tooth',
    feet: 'foot', cacti: 'cactus', fungi: 'fungus', octopi: 'octopus', wolves: 'wolf', loaves: 'loaf', knives: 'knife',
    leaves: 'leaf', elves: 'elf', dice: 'die', oxen: 'ox', sheep: 'sheep', fish: 'fish', deer: 'deer', moose: 'moose',
    better: 'good', best: 'good', worse: 'bad', worst: 'bad',
  };

  function clean(s) {
    return String(s || '').toLowerCase().replace(/[“”"]/g, '').replace(/[^a-z0-9'\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // possible base forms of a word
  function stems(w) {
    const out = [w];
    if (IRREGULAR[w]) out.push(IRREGULAR[w]);
    const add = (x) => { if (x && x.length > 1 && !out.includes(x)) out.push(x); };
    const undouble = (x) => (x.length > 2 && x[x.length - 1] === x[x.length - 2] ? x.slice(0, -1) : null);
    if (w.endsWith('ies')) add(w.slice(0, -3) + 'y');
    if (w.endsWith('ied')) add(w.slice(0, -3) + 'y');
    if (w.endsWith('iest')) add(w.slice(0, -4) + 'y');
    if (w.endsWith('ier')) add(w.slice(0, -3) + 'y');
    if (w.endsWith('ily')) add(w.slice(0, -3) + 'y');
    if (w.endsWith('es')) add(w.slice(0, -2));
    if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1));
    if (w.endsWith('ed')) { const b = w.slice(0, -2); add(b); add(undouble(b)); add(w.slice(0, -1)); }
    if (w.endsWith('ing')) { const b = w.slice(0, -3); add(b); add(b + 'e'); add(undouble(b)); }
    if (w.endsWith('est')) { const b = w.slice(0, -3); add(b); add(b + 'e'); add(undouble(b)); }
    if (w.endsWith('er')) { const b = w.slice(0, -2); add(b); add(b + 'e'); add(undouble(b)); }
    if (w.endsWith('ly')) add(w.slice(0, -2));
    if (w.endsWith('y') && w.length > 4) add(w.slice(0, -1)); // sparkly→sparkl (rare), fishy→fish
    if (w.endsWith('ish')) add(w.slice(0, -3));
    return out;
  }

  function dist(a, b) { // Damerau-Levenshtein (optimal string alignment)
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 9;
    const d = [];
    for (let i = 0; i <= m; i++) { d[i] = [i]; }
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n];
  }

  // A dictionary maps lowercase word/phrase → key
  function makeDict(entries) {
    const map = new Map();
    for (const [key, aliases] of entries) {
      if (!map.has(key)) map.set(key, key);
      for (const a of aliases) if (!map.has(a)) map.set(a, key);
    }
    return map;
  }

  function lookupWord(word, dict, fuzzy) {
    for (const s of stems(word)) if (dict.has(s)) return dict.get(s);
    if (fuzzy !== false && word.length >= 5) {
      let best = null, bd = 9;
      for (const k of dict.keys()) {
        if (k.includes(' ') || Math.abs(k.length - word.length) > 1) continue;
        const d = dist(word, k);
        if (d < bd) { bd = d; best = k; }
      }
      if (bd <= 1) return dict.get(best);
    }
    return null;
  }

  // Find all dictionary hits in a phrase, preferring longer phrases.
  // returns [{key, start, end, text}]
  function scan(text, dict, fuzzy) {
    const words = clean(text).split(' ').filter(Boolean);
    const hits = [];
    let i = 0;
    while (i < words.length) {
      let hit = null;
      for (let len = Math.min(3, words.length - i); len >= 1; len--) {
        const phrase = words.slice(i, i + len).join(' ');
        const k = len > 1 ? (dict.has(phrase) ? dict.get(phrase) : null) : lookupWord(phrase, dict, fuzzy);
        if (k) { hit = { key: k, start: i, end: i + len, text: phrase }; break; }
      }
      if (hit) { hits.push(hit); i = hit.end; } else i++;
    }
    return { words, hits };
  }

  const Lex = {
    clean, stems, dist,
    dicts: {},
    init(VERBS, ADJS, ADVERBS) {
      this.dicts.noun = makeDict(Object.values(THINGS).map((t) => [t.key, t.aliases]));
      this.dicts.verb = makeDict(Object.entries(VERBS).map(([k, v]) => [k, v.aliases || []]));
      this.dicts.adj = makeDict(Object.entries(ADJS).map(([k, v]) => [k, v.aliases || []]));
      this.dicts.place = makeDict(Object.values(PLACES).map((p) => [p.key, p.aliases]));
      this.dicts.adv = makeDict(Object.entries(ADVERBS).map(([k, v]) => [k, v.aliases || []]));
    },

    // "giant flaming taco" → {noun:'burger', adjs:['big','burning'], label:'giant flaming taco'}
    noun(text) {
      const { words, hits } = scan(text, this.dicts.noun);
      const raw = clean(text);
      let noun = null, nounHit = null;
      if (hits.length) { nounHit = hits[hits.length - 1]; noun = nounHit.key; }
      const rest = words.filter((w, i) => !nounHit || i < nounHit.start || i >= nounHit.end).join(' ');
      const adjs = rest ? scan(rest, this.dicts.adj, false).hits.map((h) => h.key) : [];
      const isPlural = nounHit ? /s$/.test(nounHit.text) && !THINGS[nounHit.text] || ['mice', 'geese', 'people', 'children', 'sheep'].includes(nounHit.text) : /s$/.test(raw);
      return { key: noun || 'blob', known: !!noun, adjs, label: raw || '???', head: nounHit ? nounHit.text : raw, plural: isPlural };
    },

    verb(text) {
      const { hits } = scan(text, this.dicts.verb);
      const advs = scan(text, this.dicts.adv, false).hits.map((h) => h.key);
      const adjs = scan(text, this.dicts.adj, false).hits.map((h) => h.key);
      return { key: hits.length ? hits[0].key : null, keys: hits.map((h) => h.key), advs, adjs, label: clean(text) };
    },

    adj(text) {
      const { hits } = scan(text, this.dicts.adj);
      const verbs = hits.length ? [] : scan(text, this.dicts.verb, false).hits.map((h) => h.key);
      return { keys: hits.map((h) => h.key), verbs, label: clean(text) };
    },

    place(text) {
      const raw = clean(text);
      if (this.dicts.place.has(raw)) return { key: this.dicts.place.get(raw), label: raw };
      const stripped = raw.replace(/^(the|a|an|my|our|his|her|their) /, '');
      if (this.dicts.place.has(stripped)) return { key: this.dicts.place.get(stripped), label: raw };
      const { hits } = scan(stripped, this.dicts.place);
      if (hits.length) return { key: hits[hits.length - 1].key, label: raw };
      return { key: null, label: String(text).trim() || 'Nowhere' };
    },
  };

  window.Lex = Lex;
})();
