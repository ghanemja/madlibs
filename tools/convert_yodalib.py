#!/usr/bin/env python3
"""Convert the YodaLib / Fun Libs Mad Libs dataset into data/funlibs.js for the site.

Dataset: "Judge me by my size (noun), do you?" YodaLib: A Demographic-Aware Humor
Generation Framework (Garimella, Banea, Hossain & Mihalcea, COLING 2020). It reuses
the Fun Libs stories of Hossain et al. (EMNLP 2017) and adds human fill-ins from
US and Indian Mechanical Turk players, each graded by five judges.

Download and unzip:
    https://web.eecs.umich.edu/~mihalcea/downloads/yodalib.crosslingual.humor.zip

Then run:
    python3 tools/convert_yodalib.py path/to/yodalib.crosslingual.humor

File naming in the release:
    train_US.json / validation_India.json ...   filled AND judged by that country
    test_FT_<filler>_<judges>.json              test stories, cross-judged
"""
import glob
import json
import os
import re
import sys

HINTS = {
    'nn': 'noun', 'nns': 'plural noun', 'vb': 'verb', 'vbz': 'verb ending in s',
    'vbd': 'past tense verb', 'vbg': 'verb ending in ing', 'vbn': 'past tense verb',
    'jj': 'adjective', 'rb': 'adverb', 'body': 'body part', 'body_plural': 'plural body part',
    'animal': 'animal', 'animal_plural': 'plural animal', 'food': 'food', 'food_plural': 'plural food',
    'liquid': 'liquid',
}
BLANK = re.compile(r'<([^:<>]+)::([^/<>]+)/>')
GRADES = {'storyFunninessGrades': 'funny', 'storyCoherenceGrades': 'coherence',
          'storyIncongruityGrades': 'incongruity', 'storyDeviationGrades': 'deviation'}


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def mean_digits(s):
    d = [int(c) for c in str(s) if c.isdigit()]
    return round(sum(d) / len(d), 3) if d else None


def parse_name(path):
    name = os.path.basename(path)[:-5]
    m = re.match(r'test_FT_(\w+?)_(\w+)$', name)
    if m:
        return 'test', m.group(1), m.group(2)
    split, country = name.split('_')
    return split, country, country


def main(src, out):
    stories = {}
    for path in sorted(glob.glob(os.path.join(src, '*.json'))):
        split, filler, judges = parse_name(path)
        with open(path) as f:
            data = json.load(f)
        for title, v in data.items():
            st = stories.get(title)
            if st is None:
                blanks, n = [], [0]

                def repl(m):
                    n[0] += 1
                    blanks.append({'hint': m.group(2), 'label': HINTS.get(m.group(2), 'word'), 'original': m.group(1)})
                    return '[%s:b%d]' % (HINTS.get(m.group(2), 'word'), n[0])

                # the site picks "a" or "an" itself once the word is known
                template = BLANK.sub(repl, re.sub(r'\b([Aa])/an ', r'\1 ', v['text']))
                st = stories[title] = {'id': slug(title), 'title': title, 'split': split, 'template': template, 'blanks': blanks, 'human': {}}
            for k in sorted(x for x in v if x.startswith('set')):
                s = v[k]
                words = s['filledIn']
                key = (filler, tuple(words))
                h = st['human'].get(key)
                if h is None:
                    h = st['human'][key] = {'filler': filler, 'words': words, 'ratings': {}, '_wf': []}
                h['ratings'][judges] = {name: mean_digits(s.get(field)) for field, name in GRADES.items()}
                h['_wf'].append([mean_digits(g) for g in s['wordFunninessGrades']])

    out_stories = []
    for st in stories.values():
        humans = []
        counts = {}
        for h in st['human'].values():
            i = counts.get(h['filler'], 0)
            counts[h['filler']] = i + 1
            wf = h.pop('_wf')
            # fraction of judges (across judge pools) who found each word funny
            wf = [w for w in wf if w and all(x is not None for x in w)]
            h['wordFunny'] = [round(sum(col) / len(col), 3) for col in zip(*wf)] if wf else None
            funny = [r['funny'] for r in h['ratings'].values() if r['funny'] is not None]
            h['funny'] = round(sum(funny) / len(funny), 3) if funny else None
            h['id'] = '%s-%s-%d' % (st['id'], h['filler'].lower(), i)
            humans.append(h)
        st['human'] = humans
        out_stories.append(st)
    out_stories.sort(key=lambda s: s['title'].lower())

    payload = {
        'source': {
            'name': 'YodaLib / Fun Libs',
            'citation': 'Garimella, Banea, Hossain & Mihalcea (2020). "Judge me by my size (noun), do you?" YodaLib: A Demographic-Aware Humor Generation Framework. COLING 2020. Stories from Hossain, Krumm, Vanderwende, Horvitz & Kautz (2017). Filling the Blanks (hint: plural noun) for Mad Libs Humor. EMNLP 2017.',
            'url': 'https://web.eecs.umich.edu/~mihalcea/downloads/yodalib.crosslingual.humor.zip',
            'notes': 'Ratings are 0-3 averaged over 5 judges per judge pool. wordFunny is the fraction of judges who marked the word funny. original is the word from the source Wikipedia text.',
        },
        'stories': out_stories,
    }
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as f:
        f.write('// Generated by tools/convert_yodalib.py. Do not edit by hand.\n')
        f.write('window.FUNLIBS = ')
        json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    n_h = sum(len(s['human']) for s in out_stories)
    print('wrote %s: %d stories, %d human fill-ins' % (out, len(out_stories), n_h))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'data', 'funlibs.js'))
