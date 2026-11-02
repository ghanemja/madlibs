#!/usr/bin/env python3
"""Compare human and AI word choices on the Fun Libs stories, and score guess-game results.

    python3 tools/analyze.py                                  # writes research/REPORT.md
    python3 tools/analyze.py --guesses export1.json export2.json   # also score "Human or AI?" downloads

Groups compared: the original Wikipedia words, human players (US, India, all),
and every AI source in data/ai_fills.json (e.g. claude-seed, anthropic:<model>).

Metrics (lower-cased, trimmed words):
  distinct %      share of answers that are different words (types / tokens)
  same-blank %    chance two answers to the same blank from the same group are identical
                  (higher = more predictable / homogeneous)
  top-10 share    share of all answers taken up by the group's 10 favourite words
  = original %    share of answers identical to the original Wikipedia word
  length          mean characters per answer
Sample size changes distinct % and top-10 share, so the human rows also show a
"matched" version: as many random human answers per story as each AI source has,
averaged over 300 random draws.
"""
import argparse
import collections
import itertools
import json
import os
import random
import statistics

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def load_js(path, var):
    with open(path) as f:
        s = f.read()
    return json.loads(s[s.index('=') + 1:].rstrip().rstrip(';'))


def norm(w):
    return ' '.join(str(w).lower().strip().split())


def metrics(fills, stories):
    """fills: list of (story_id, [words])."""
    words = [norm(w) for _, ws in fills for w in ws]
    if not words:
        return None
    c = collections.Counter(words)
    # same-blank agreement
    by_blank = collections.defaultdict(list)
    for sid, ws in fills:
        for i, w in enumerate(ws):
            by_blank[(sid, i)].append(norm(w))
    same = pairs = 0
    for ans in by_blank.values():
        for a, b in itertools.combinations(ans, 2):
            pairs += 1
            same += a == b
    orig = sum(norm(w) == norm(stories[sid]['blanks'][i]['original']) for sid, ws in fills for i, w in enumerate(ws))
    return {
        'fills': len(fills), 'answers': len(words),
        'distinct': len(c) / len(words),
        'same_blank': same / pairs if pairs else float('nan'),
        'top10': sum(n for _, n in c.most_common(10)) / len(words),
        'orig': orig / len(words),
        'length': statistics.mean(len(w) for w in words),
        'top': c.most_common(12),
    }


def matched(human_by_story, stories, k=2, draws=300, seed=7):
    rnd = random.Random(seed)
    acc = collections.defaultdict(list)
    for _ in range(draws):
        fills = []
        for sid, hs in human_by_story.items():
            for h in rnd.sample(hs, min(k, len(hs))):
                fills.append((sid, h['words']))
        m = metrics(fills, stories)
        for key in ('distinct', 'top10'):
            acc[key].append(m[key])
    return {k: statistics.mean(v) for k, v in acc.items()}


def score_guesses(paths):
    recs = []
    for p in paths:
        with open(p) as f:
            d = json.load(f)
        recs += [r for r in d.get('records', []) if r.get('type') == 'guess']
    if not recs:
        return '_No guesses in the given files._\n'
    out = ['| | guesses | correct |', '|---|---:|---:|']

    def row(label, rs):
        if rs:
            out.append('| %s | %d | %.0f%% |' % (label, len(rs), 100 * sum(r['correct'] for r in rs) / len(rs)))
    row('**all**', recs)
    row('stories written by humans', [r for r in recs if r['truth'] == 'human'])
    row('stories written by AI', [r for r in recs if r['truth'] == 'ai'])
    for src in sorted({r['source'] for r in recs}):
        row('source: `%s`' % src, [r for r in recs if r['source'] == src])
    rated = [r for r in recs if r.get('myFunny') is not None]
    if rated:
        for t in ('human', 'ai'):
            rs = [r['myFunny'] for r in rated if r['truth'] == t]
            if rs:
                out.append('\nPlayers rated %s-written stories **%.2f / 3** funny on average (%d ratings).' % (t, statistics.mean(rs), len(rs)))
    return '\n'.join(out) + '\n'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--guesses', nargs='*', default=[], help='research JSON files downloaded from the site')
    ap.add_argument('--out', default=os.path.join(ROOT, 'research', 'REPORT.md'))
    args = ap.parse_args()

    fl = load_js(os.path.join(ROOT, 'data', 'funlibs.js'), 'FUNLIBS')
    ai = load_js(os.path.join(ROOT, 'data', 'ai_fills.js'), 'AI_FILLS')
    stories = {s['id']: s for s in fl['stories']}

    groups = collections.OrderedDict()
    groups['original text'] = [(sid, [b['original'] for b in s['blanks']]) for sid, s in stories.items()]
    human_by_story = {sid: s['human'] for sid, s in stories.items()}
    groups['humans (all)'] = [(sid, h['words']) for sid, s in stories.items() for h in s['human']]
    groups['humans: US'] = [(sid, h['words']) for sid, s in stories.items() for h in s['human'] if h['filler'] == 'US']
    groups['humans: India'] = [(sid, h['words']) for sid, s in stories.items() for h in s['human'] if h['filler'] == 'India']
    for src in sorted({f['source'] for f in ai['fills']}):
        groups['AI: ' + src] = [(f['story'], f['words']) for f in ai['fills'] if f['source'] == src and f['story'] in stories]

    res = {name: metrics(f, stories) for name, f in groups.items()}
    per = max(1, round(len([f for f in ai['fills'] if f['source'] != 'claude-seed' and f['story'] in stories]) / max(1, len(stories) * max(1, len({f['source'] for f in ai['fills'] if f['source'] != 'claude-seed'})))))
    mt = matched(human_by_story, stories, k=per)

    lines = ['# Human vs AI word choice on Fun Libs', '',
             'Generated by `tools/analyze.py`. Data: %s' % fl['source']['citation'], '',
             '| group | fill-ins | distinct % | same-blank % | top-10 share | = original % | length |',
             '|---|---:|---:|---:|---:|---:|---:|']
    for name, m in res.items():
        if not m:
            continue
        lines.append('| %s | %d | %.0f%% | %s | %.1f%% | %.1f%% | %.1f |' % (
            name, m['fills'], 100 * m['distinct'],
            '—' if name == 'original text' else '%.1f%%' % (100 * m['same_blank']),
            100 * m['top10'], 100 * m['orig'], m['length']))
    lines.append('| humans, matched to %d per story | %d | %.0f%% | | %.1f%% | | |' % (per, per * len(stories), 100 * mt['distinct'], 100 * mt['top10']))
    lines += ['', '## Favourite words', '']
    for name, m in res.items():
        if m and name != 'original text':
            lines.append('- **%s**: %s' % (name, ', '.join('%s (%d)' % (w, n) for w, n in m['top'])))
    if any(name.startswith('AI: claude-seed') for name in res):
        lines += ['', '> Note: `claude-seed` was written in a single pass by one model, so it is not an independent '
                  'sample. Treat its numbers as a demo; generate independent samples with `tools/generate_ai_fills.py` '
                  'before drawing conclusions.']
    if args.guesses:
        lines += ['', '## "Human or AI?" guess results', '', score_guesses(args.guesses)]
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
