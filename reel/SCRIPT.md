# "Human or AI?" Reel: voiceover script

Video: `node tools/make_reel.js doodle-libs-reel.mp4` (46.7 s, 1080×1920, made from `reel/`).
Timestamps match the rendered video. Read at a natural, slightly playful pace; the countdowns are the
moments to slow down and let viewers think. The video already has sound effects (boom, pops, dings),
so turn that track down to about 30% under your voice.

| Time | On screen | Say (voiceover) |
|---|---|---|
| **0.0** | "Can you tell who wrote it? HUMAN or AI?" A stick person and a robot wave | "Real people and an AI filled in the same Mad Libs. Can *you* tell who's who?" |
| **3.0** | ROUND 1 of 3 | "Round one." |
| **4.4** | "A hot air balloon is a type of **sandwich**." | "A hot air balloon is a type of… *sandwich*." |
| **6.2** | "It is lifted by **exploding** the air inside the **bread**…" (BOOM!) | "It's lifted by *exploding* the air inside the *bread*." |
| **9.5** | Countdown 3-2-1, HUMAN / AI buttons | "Human… or AI? Three… two… one…" |
| **12.5** | "It was a HUMAN!" Player from India, judges 2.8/3 | "Human! A real player from India, and the judges gave it the top score." |
| **15.6** | ROUND 2 of 3 | "Round two." |
| **16.9** | "In golf, a golfer **licks** a number of **burritos**…" | "In golf, a golfer *licks*… a number of *burritos*." |
| **20.7** | "…a small **pancake** called a tee and swing a **salami**…" | "Then puts the ball on a *pancake*… and swings a *salami*." |
| **23.6** | Countdown 3-2-1 | "Human or AI? Three… two… one…" |
| **26.7** | "It was the AI!" | "That one was the AI. Notice how it can't stop talking about food?" |
| **29.7** | ROUND 3 of 3 | "Last one." |
| **31.1** | "A zombie is a mythical **overripe** person who has returned to **Idaho**…" | "A zombie is a mythical, *overripe* person who has returned to… *Idaho*." |
| **34.2** | "Zombies can walk, think, and **swindle** living persons." | "Zombies can walk, think, and *swindle* living persons." |
| **36.9** | Countdown 3-2-1 | "Human or AI? Three… two… one…" |
| **39.9** | "It was a HUMAN!" Player from the US, judges 2.6/3 | "Human again! Only a person would send zombies to Idaho." |
| **42.9** | "How many did you get? Comment your score!" + link | "How many did you get right? Comment your score, and play the Mad Libs Turing Test yourself. Link in bio!" |
| **46.7** | end | |

## Shorter version (no voiceover)

Post it with a trending sound instead. The on-screen text already carries the game: the title says
"Who filled in the blanks?", the countdown says "Comment your guess!", and the reveal says who it was.

## Post caption

> Real people vs. AI: who filled in these Mad Libs? 🤖🧑 Every word becomes a cartoon. Watch, guess, then check the answer. Comment your score! 👇
> Play the Mad Libs Turing Test: link in bio
>
> #madlibs #turingtest #ai #chatgpt #humanvsai #stickfigure #animation #wordgames #nlp #humor

## Notes

- The human answers and judges' scores are real, from the YodaLib / Fun Libs humor-research dataset
  (Garimella et al., COLING 2020; Hossain et al., EMNLP 2017).
- The AI answer in round 2 is from the site's demo seed set. To make a fresh video, edit `ROUNDS` at the
  top of `reel/reel.js` (any story id from `data/funlibs.js`, `source: 'human'` or `'ai'`) and re-run
  `node tools/make_reel.js`. It prints the new timestamps for re-timing this script.
