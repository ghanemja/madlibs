#!/usr/bin/env python3
"""One round of the skill-optimization loop: run a skill variant, measure it, compare it.

Goal: make Claude's Mad Libs answers look like people's, measured by how often
two independent answers to the same blank are the same word (people: ~1%).

    export ANTHROPIC_API_KEY=...
    python3 tools/optimize_skill.py --variant research/skill-variants/v01.md --name v01 \\
        --parent v00 --note "what changed and why"

    # final, once: the held-out test stories
    python3 tools/optimize_skill.py --variant research/skill-variants/v05.md --name v05-test --split test

Each run samples every story in the split N times independently (in parallel),
saves the answers to research/optimization/runs/<name>.json, compares against the
parent run with a bootstrap over stories, appends to research/optimization/log.json,
and rebuilds data/skill_opt.js for the app's Data page.
A change counts as a significant drop when the 95% interval for the drop in the
same-blank rate excludes zero.
"""
import argparse
import concurrent.futures as cf
import datetime
import hashlib
import importlib.util
import json
import os
import random
import time

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OPT = os.path.join(ROOT, 'research', 'optimization')
spec = importlib.util.spec_from_file_location('gen', os.path.join(ROOT, 'tools', 'generate_ai_fills.py'))
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)


def norm(w):
    return ' '.join(str(w).lower().split())


def same_blank(by_story):
    same = pairs = 0
    for sets in by_story.values():
        for i in range(len(sets[0])):
            for a in range(len(sets)):
                for b in range(a + 1, len(sets)):
                    pairs += 1
                    same += norm(sets[a][i]) == norm(sets[b][i])
    return same / pairs if pairs else float('nan')


def all_same(by_story):
    tot = s = 0
    for sets in by_story.values():
        for i in range(len(sets[0])):
            tot += 1
            s += len({norm(x[i]) for x in sets}) == 1
    return s / tot


def distinct_and_top(by_story):
    words = [norm(w) for sets in by_story.values() for ws in sets for w in ws]
    c = {}
    for w in words:
        c[w] = c.get(w, 0) + 1
    top = sorted(c.items(), key=lambda kv: -kv[1])
    return len(c) / len(words), sum(n for _, n in top[:10]) / len(words), [w for w, _ in top[:8]]


def metrics(by_story):
    d, t, top = distinct_and_top(by_story)
    return {'same_blank': same_blank(by_story), 'all_same': all_same(by_story), 'distinct': d, 'top10': t, 'top_words': top}


def human_metrics(stories, n, draws=200):
    """People on the same stories, subsampled to n answers per story so sizes match."""
    r = random.Random(7)
    acc = {'same_blank': [], 'all_same': [], 'distinct': [], 'top10': []}
    for _ in range(draws):
        by = {s['id']: [h['words'] for h in r.sample(s['human'], min(n, len(s['human'])))] for s in stories}
        m = metrics(by)
        for k in acc:
            acc[k].append(m[k])
    return {k: sum(v) / len(v) for k, v in acc.items()}


def bootstrap_drop(parent, child, reps=4000, seed=11):
    """95% interval for parent.same_blank - child.same_blank, resampling stories."""
    keys = sorted(set(parent) & set(child))
    r = random.Random(seed)
    diffs = []
    for _ in range(reps):
        ks = [r.choice(keys) for _ in keys]
        diffs.append(same_blank({i: parent[k] for i, k in enumerate(ks)}) - same_blank({i: child[k] for i, k in enumerate(ks)}))
    diffs.sort()
    return diffs[int(0.025 * reps)], diffs[int(0.975 * reps)]


def run(args):
    data = gen.load_funlibs()
    splits = ['train', 'validation'] if args.split == 'tune' else [args.split]
    stories = [s for s in data['stories'] if s['split'] in splits]
    system = gen.SYSTEM
    sha = None
    if args.variant:
        text = gen.skill_text(args.variant)
        system = gen.SYSTEM + '\n\nAlso follow these writing guidelines:\n\n' + text
        sha = hashlib.sha256(open(args.variant, 'rb').read()).hexdigest()[:12]
    ask = gen.make_client('anthropic', system)
    jobs = [(s, i) for s in stories for i in range(args.n)]
    by = {s['id']: [] for s in stories}

    def one(job):
        s, i = job
        for attempt in range(4):
            try:
                return s['id'], gen.parse(ask(args.model, gen.story_prompt(s), None), len(s['blanks']))
            except Exception as e:  # noqa: BLE001
                time.sleep(2 * (attempt + 1))
                last = e
        raise RuntimeError(f'{s["id"]}: {last}')

    t0 = time.time()
    with cf.ThreadPoolExecutor(args.workers) as ex:
        for sid, words in ex.map(one, jobs):
            by[sid].append(words)
    m = metrics(by)
    hm = human_metrics(stories, args.n)
    os.makedirs(os.path.join(OPT, 'runs'), exist_ok=True)
    with open(os.path.join(OPT, 'runs', args.name + '.json'), 'w') as f:
        json.dump({'name': args.name, 'parent': args.parent, 'note': args.note, 'split': args.split, 'n': args.n,
                   'model': args.model, 'variant': args.variant and os.path.relpath(args.variant, ROOT), 'variant_sha': sha,
                   'created': datetime.datetime.now().isoformat(timespec='seconds'), 'answers': by}, f, ensure_ascii=False, indent=1)

    entry = {'name': args.name, 'parent': args.parent, 'note': args.note, 'split': args.split, 'n': args.n,
             'variant': args.variant and os.path.relpath(args.variant, ROOT), 'variant_sha': sha, **m, 'people': hm,
             'seconds': round(time.time() - t0)}
    if args.parent:
        with open(os.path.join(OPT, 'runs', args.parent + '.json')) as f:
            pby = json.load(f)['answers']
        lo, hi = bootstrap_drop(pby, by)
        entry['drop_ci'] = [round(lo, 4), round(hi, 4)]
        entry['significant'] = lo > 0
    log_path = os.path.join(OPT, 'log.json')
    log = json.load(open(log_path)) if os.path.exists(log_path) else []
    log = [e for e in log if e['name'] != args.name] + [entry]
    json.dump(log, open(log_path, 'w'), ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, 'data', 'skill_opt.js'), 'w') as f:
        f.write('// Generated by tools/optimize_skill.py. The skill-optimization loop, one entry per round.\n')
        f.write('window.SKILL_OPT = ')
        json.dump(log, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')

    print(f"{args.name} ({args.split}, {len(stories)} stories x {args.n}, {entry['seconds']}s)  {args.note or ''}")
    print(f"  same-blank {m['same_blank']:.1%}   all-same {m['all_same']:.1%}   distinct {m['distinct']:.0%}   top10 {m['top10']:.1%}")
    print(f"  people     {hm['same_blank']:.1%}   all-same {hm['all_same']:.1%}   distinct {hm['distinct']:.0%}   top10 {hm['top10']:.1%}")
    print(f"  top words: {', '.join(m['top_words'])}")
    if args.parent:
        print(f"  drop vs {args.parent}: 95% CI [{entry['drop_ci'][0]:+.1%}, {entry['drop_ci'][1]:+.1%}]  -> {'SIGNIFICANT' if entry['significant'] else 'not significant'}")
    sample = stories[0]['id']
    print(f"  sample ({sample}): " + ' | '.join(', '.join(ws[:6]) for ws in by[sample][:2]))


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--variant', help='skill file to load (omit for the bare prompt)')
    ap.add_argument('--name', required=True)
    ap.add_argument('--parent', help='run to compare against')
    ap.add_argument('--note', default='')
    ap.add_argument('--split', default='tune', choices=['tune', 'train', 'validation', 'test'], help='tune = train + validation (40 stories); test = 10 held-out stories, used once at the end')
    ap.add_argument('--n', type=int, default=4, help='independent samples per story')
    ap.add_argument('--model', default='claude-sonnet-5-5')
    ap.add_argument('--workers', type=int, default=8)
    run(ap.parse_args())
