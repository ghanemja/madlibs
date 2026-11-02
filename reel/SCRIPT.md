# "Human or AI?" Reel: voiceover script

Video: `node tools/make_reel.js doodle-libs-reel.mp4` (46.4 s, 1080×1920, made from `reel/`; `--linkedin` makes the 64 s LinkedIn cut with the story opener).
Timestamps match the rendered video. Read at a natural, slightly playful pace; the countdowns are the
moments to slow down and let viewers think. The video already has an original synthesized music loop and sound effects (pops, dings, boings),
so turn that track down to about 30% under your voice.

| Time | On screen | Say (voiceover) |
|---|---|---|
| **0.0** | "Can you tell who wrote it? HUMAN or AI?" A stick person and a robot wave | "Real people and an AI filled in the same Mad Libs. Can *you* tell who's who?" |
| **3.0** | ROUND 1 of 3 | "Round one." |
| **4.3** | "A game of baseball is played by two teams on a **magnetic** field." | "A game of baseball is played by two teams on a… *magnetic* field." |
| **6.4** | "Each team has nine **magnets**." | "Each team has nine *magnets*." |
| **8.4** | Countdown 3-2-1, HUMAN / AI buttons | "Human… or AI? Three… two… one…" |
| **11.5** | "It was a HUMAN!" Player from India, judges 2.4/3 | "Human! A real player from India." |
| **14.5** | ROUND 2 of 3 | "Round two." |
| **15.8** | "In golf, a golfer **tickles** a number of **pickles**…" | "In golf, a golfer *tickles*… a number of *pickles*." |
| **19.2** | "…a small **meatball** called a tee and swing a **banana**…" | "Then puts the ball on a *meatball*… and swings a *banana*." |
| **22.0** | Countdown 3-2-1 | "Human or AI? Three… two… one…" |
| **25.1** | "It was the AI!" Claude Sonnet 5.5 | "That one was the AI. It really likes pickles." |
| **28.1** | ROUND 3 of 3 | "Last one." |
| **29.4** | "…swim under **lava** for a long time, using a tank filled with compressed **dough**." | "Scuba diving: you swim under *lava*, breathing from a tank of compressed *dough*." |
| **32.2** | "The tank is a **rusty** cylinder made of steel or **coconut**." | "The tank is a *rusty* cylinder made of steel or… *coconut*." |
| **35.3** | Countdown 3-2-1 | "Human or AI? Three… two… one…" |
| **38.3** | "It was a HUMAN!" Player from the US, judges 2.4/3 | "Human again!" |
| **41.3** | "How many did you get? Comment your score!" + link | "How many did you get right? Comment your score, and play the Mad Libs Turing Test yourself. Link in bio!" |
| **46.4** | end (music fades out) | |

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
- The AI answer in round 2 is a real Claude Sonnet 5.5 answer, sampled through the API. To make a fresh video, edit `ROUNDS` at the
  top of `reel/reel.js` (any story id from `data/funlibs.js`, `source: 'human'` or `'ai'`) and re-run
  `node tools/make_reel.js`. It prints the new timestamps for re-timing this script.
