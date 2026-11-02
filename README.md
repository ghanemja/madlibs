# Doodle Libs ✏️

Mad Libs that draw themselves. You get a sentence with a blank, someone makes up a word, and **the moment the word comes in, a stick-figure cartoon acts it out.**

> In the middle of the park stood a gigantic **tree**.
> Suddenly, the tree began to **dance**! → 🎵 *The tree grows a face and starts to boogie.*

## Play

It's plain HTML/JS with no build step and no dependencies.

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. You can also just double-click `index.html`.

### Hosting on GitHub Pages

It's all static files with relative paths, so Pages works out of the box: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**. Your site will be at `https://<user>.github.io/<repo>/`, and share links work there too.

- **Choose your path**: the home page offers two doors, *Try the Turing Test* (research game) or *Make a Cartoon* (just for fun)
- **Two looks**: bold *Toon* style (thick ink, cel shading, big eyes) or the original pencil *Doodle* style. Use the 🎨 button to switch.
- **6 built-in stories**: The Thing in the Park, Blast Off!, Beach Day, Birthday Bash, Monster in the Kitchen, Super Stick Person
- **Write your own**: type any story with `[noun]`, `[verb]`, `[adjective]`, `[place]`… blanks and it figures out what to animate
- **Secret mode**: classic Mad Libs, where the sentence stays hidden until you've given your word
- **Narrate**: the browser reads each sentence out loud
- **Replay**: at the end, watch the whole cartoon from the start
- **Download**: at the end, 🎬 *Download video* records the whole cartoon (1280×720, with sound effects and the story as subtitles), or 📸 *Save picture* saves the current frame as a PNG
- **Share link**: the story and your words are packed into the URL, so a friend who opens it sees your cartoon

## 🔬 Research lab: Human or AI?

A Mad Libs Turing test, built on real humor-research data.

- **Human or AI?**: watch a filled-in story as a cartoon, rate how funny it is, and guess whether a human or an AI chose the words. Half the rounds are human, half AI.
- **Fill in a research story**: play any of the 50 research stories yourself, then see a table comparing your words with a human player's, an AI's, and the original text.
- **📊 Data page**: charts comparing human and AI word choices (variety, favorite words, the words judges laughed at, whether the judges' country matters) plus your own Turing-test results. Hover any bar for details; every chart has a table view.
- **Download my research data**: your guesses, ratings and answers are kept in your browser and download as JSON.

### The data

| | |
|---|---|
| Stories + human answers | **YodaLib** (Garimella, Banea, Hossain & Mihalcea, COLING 2020), which reuses the **Fun Libs** stories of Hossain, Krumm, Vanderwende, Horvitz & Kautz (EMNLP 2017). 50 Mad Libs made from Wikipedia paragraphs, each filled in by 3 US and 3 Indian Mechanical Turk players (300 answers), each rated 0–3 for funniness, coherence, incongruity and deviation by 5 judges. Download: [yodalib.crosslingual.humor.zip](https://web.eecs.umich.edu/~mihalcea/downloads/yodalib.crosslingual.humor.zip) |
| AI answers | `data/ai_fills.json`: 150 from Claude Sonnet 5.5 (API), 150 from independent Claude agents, 150 from Claude Sonnet 5.5 with the [humanplease](https://github.com/ghanemja/humanplease) writing skill loaded; 3 independent samples per story each, never shown the human answers. (A one-pass demo seed set is kept only for the Instagram reel.) Add any model with `tools/generate_ai_fills.py` |

If you use the dataset, please cite both papers.

### Research tools

```bash
# rebuild data/funlibs.js from the unzipped dataset
python3 tools/convert_yodalib.py path/to/yodalib.crosslingual.humor

# add AI answers (runs on your machine with your own API key; the site never sees it)
pip install anthropic && export ANTHROPIC_API_KEY=...
python3 tools/generate_ai_fills.py --provider anthropic --model claude-sonnet-5-5 --n 3
python3 tools/generate_ai_fills.py --provider openai --model gpt-4o --n 3

# compare word choices (and score guess-game downloads) -> research/REPORT.md
python3 tools/analyze.py --guesses doodle-libs-research-*.json
```

`research/REPORT.md` compares groups on variety of words, how often two answers to the same blank match, how much a group leans on favorite words, and overlap with the original text.

**Results so far** (3 samples per story, humans matched to the same size):

| | People | Claude Sonnet 5.5 | + humanplease skill |
|---|---:|---:|---:|
| distinct words | 70% | 22% | 30% |
| two answers to the same blank match | 1.0% | 47.5% | 41.6% |
| all 3 samples identical | 0.1% | 35% | 28% |
| top-10 words' share | 3.9% | 18% | 15% |

The writing skill moved word choice a little (same-blank matches down ~6 points, story-bootstrap 95% CI 0.5–11 points) but left it about 40× more repetitive than people. It targets prose style; this tell is about which word gets chosen.

### Optimizing a skill to pick words like people

[`research/OPTIMIZATION.md`](research/OPTIMIZATION.md) logs a loop that rewrote a writing skill one rule at a time, keeping only changes that significantly cut how often Claude gives the same answer to the same blank. On 10 held-out stories: no skill 49.2%, original humanplease 40.5%, optimized skill (`research/skill-variants/v10.md`) **14.0%**, people 1.0%. Closer, not converged. Run a round with `tools/optimize_skill.py`.

### Instagram Reel

`reel/` renders a vertical 1080×1920 "Human or AI?" video with the same cartoon engine: 3 rounds, a 3-2-1 countdown for viewers to guess, then the reveal. `reel/SCRIPT.md` has a timed voiceover script and a post caption.

```bash
npm install playwright && npx playwright install chromium   # once; also needs ffmpeg
node tools/make_reel.js doodle-libs-reel.mp4
```

Change the rounds by editing `ROUNDS` at the top of `reel/reel.js`. You can also preview or record in the browser at `/reel/`.

## How words become cartoons

| You type | What happens |
| --- | --- |
| a **noun** (`tree`, `toilet`, `dragon`) | it's drawn from a library of ~95 doodles that knows ~700 words (`puppy` → dog, `t-rex` → dinosaur, `hotdog` → burger…) |
| a **verb** (`explode`, `dance`, `sneeze`, `eat`) | one of ~40 animations (~600 verb words): explode, melt, fly, fall, freeze, catch fire, teleport, multiply, toot, kick, hug, chase… |
| an **adjective** (`purple`, `giant`, `stinky`, `spooky`) | one of ~580 adjective words making a lasting change: color, size, mood face, flames, ice, stink lines, sparkles, sunglasses, horns… |
| a **place** (`the moon`, `a volcano`) | the scenery changes (space, beach, city, jungle, ocean, arctic, volcano, kitchen, party, school, castle, farm, candy land) |
| a **sound** (`KABOOM`, `yee-haw`) | a speech bubble or a big comic burst |

Messy input works too:

- **Tenses and plurals**: `exploded`, `flying`, `bananas`, `mice`
- **Phrases**: `blow up`, `fall asleep`, `ice cream`
- **Typos**: `explpde` → explode
- **Mixed words**: `giant flaming taco` gives you a big, burning taco
- **Speed words**: `explode slowly`, `dance quickly`
- **Words it doesn't know** still get something: an unknown noun shows up as a googly-eyed blob with your word written on it, and an unknown verb does a silly wiggle with `*your word*` floating above it.

## Code map

```
js/sketch.js    wobbly hand-drawn line primitives + cartoon faces
js/things.js    the doodle library (people, animals, objects, food)
js/places.js    backdrops
js/verbs.js     verb animations, adjectives, lasting status effects
js/lexicon.js   word matching (stems, phrases, typos)
js/stage.js     animation engine: actors, particles, bubbles, shake
js/director.js  story templates → stage actions, custom story compiler
js/stories.js   built-in stories + word-type hints
js/sfx.js       synthesized sound effects (Web Audio)
js/app.js       UI flow
js/research.js  Human or AI? game, research play mode, data export
js/charts.js    the 📊 Data page (plain SVG charts, no libraries)
data/           Fun Libs stories + human answers, AI answers
tools/          dataset converter, AI answer generator, analysis
```

### Adding a story

Stories live in `js/stories.js`. Blanks are written `[type:key]`, and `{key}` reuses an answer later in the story. Each sentence has a list of `ops`. An op runs as soon as the blank it uses is filled, which is what makes the cartoon react word by word:

```js
{ text: 'Suddenly, the {thing} began to [verb:v1]!', ops: [{ op: 'act', who: 'thing', key: 'v1' }] }
```

### Adding a word

- **New noun**: add a `def('name', { w, h, fill, aliases, draw(A, P) { … } })` to `things.js`
- **New verb**: add an entry to `VERBS` in `verbs.js` with `dur`, `aliases`, and an `update(A, p, t)` that moves the actor

## License

[MIT](LICENSE)
