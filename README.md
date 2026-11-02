# Doodle Libs ✏️

Mad Libs that draw themselves. You get a sentence with a blank, someone makes up a word, and **the moment the word comes in, a stick-figure cartoon acts it out.**

> In the middle of the park stood a gigantic **tree**.
> Suddenly, the tree began to **explode**! → 💥 *BOOM. The tree is gone.*

## Play

It's plain HTML/JS with no build step and no dependencies.

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. You can also just double-click `index.html`.

### Hosting on GitHub Pages

It's all static files with relative paths, so Pages works out of the box: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**. Your site will be at `https://<user>.github.io/<repo>/`, and share links work there too.

- **Two looks**: bold *Toon* style (thick ink, cel shading, big eyes) or the original pencil *Doodle* style. Use the 🎨 button to switch.
- **6 built-in stories**: The Thing in the Park, Blast Off!, Beach Day, Birthday Bash, Monster in the Kitchen, Super Stick Person
- **Write your own**: type any story with `[noun]`, `[verb]`, `[adjective]`, `[place]`… blanks and it figures out what to animate
- **Secret mode**: classic Mad Libs, where the sentence stays hidden until you've given your word
- **Narrate**: the browser reads each sentence out loud
- **Replay**: at the end, watch the whole cartoon from the start
- **Share link**: the story and your words are packed into the URL, so a friend who opens it sees your cartoon

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
```

### Adding a story

Stories live in `js/stories.js`. Blanks are written `[type:key]`, and `{key}` reuses an answer later in the story. Each sentence has a list of `ops`. An op runs as soon as the blank it uses is filled, which is what makes the cartoon react word by word:

```js
{ text: 'Suddenly, the {thing} began to [verb:v1]!', ops: [{ op: 'act', who: 'thing', key: 'v1' }] }
```

### Adding a word

- **New noun**: add a `def('name', { w, h, fill, aliases, draw(A, P) { … } })` to `things.js`
- **New verb**: add an entry to `VERBS` in `verbs.js` with `dur`, `aliases`, and an `update(A, p, t)` that moves the actor
