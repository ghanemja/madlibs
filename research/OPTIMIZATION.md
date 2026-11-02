# Optimizing a writing skill so Claude picks words like people do

Can a set of instructions make an LLM's word choices look human? This is the log of one attempt, using Mad Libs
as the measuring stick.

## Setup

- **Task:** fill in the blanks of the 50 Fun Libs stories "as funny as possible" (the same prompt as `tools/generate_ai_fills.py`).
  Model: Claude Sonnet 5.5. A skill variant is appended to the system prompt.
- **Metric:** the **same-blank rate**, the chance that two independent answers to the same blank are the same word.
  People: about 1%. Also tracked: all samples identical, distinct words, and the share taken by the 10 most-used words.
- **Split:** 40 stories (train + validation) for tuning, 4 independent samples each. The 10 test stories were held
  out and run once at the end, 6 samples each.
- **Rule:** one change per round, on top of the best version so far. A change is kept when the 95% bootstrap
  interval (resampling stories) for the drop in the same-blank rate excludes zero.
- **Guardrail:** the answers are read each round, so a "win" can't come from nonsense that merely looks varied.

Runner: `tools/optimize_skill.py`. Variants: `research/skill-variants/`. Raw answers: `research/optimization/runs/`.

## Every round

| run | change | same-blank | all same | distinct | top-10 share | drop vs parent (95% CI, points) | verdict |
|---|---|---:|---:|---:|---:|---|---|
| `base` | No skill: the plain Mad Libs prompt | 45.0% | 23.8% | 22% | 17.9% |  |  |
| `v00` | humanplease natural-voice-writing skill, unchanged | 41.6% | 20.9% | 29% | 14.2% | -1.4 to +8.1 |  |
| `v01` | Skip your first ideas: list candidates privately, drop the first 2-3 | 37.4% | 17.9% | 32% | 15.1% | -0.2 to +8.9 | rejected |
| `v02` | Be a specific invented person: pick words from their life | 35.8% | 16.7% | 32% | 15.3% | +2.1 to +9.7 | kept |
| `v03` | Name the model's comedy defaults (casserole, soggy, pickle, llama...) and avoid them | 22.1% | 6.8% | 49% | 7.7% | +10.1 to +17.4 | kept |
| `v04` | Treat the list as a family; make the humor come from this sentence, not a 'funny word' | 26.3% | 9.4% | 55% | 5.4% | -8.6 to +0.1 | rejected |
| `v05` | Seed the invented person from a random letter and number | 15.6% | 3.4% | 57% | 7.7% | +3.2 to +9.7 | kept |
| `v05-replicate` | Replication: v05 run again, unchanged, to check it wasn't a lucky draw | 16.6% | 3.4% | 55% | 7.7% | +2.2 to +8.7 | replication |
| `v06` | Add the second wave of defaults (damp, lukewarm, haunted, dentist...) | 18.8% | 4.9% | 55% | 6.5% | -6.0 to -0.7 | rejected |
| `v07` | Don't maximize funny: say what this person would blurt, uneven like a real person | 24.6% | 6.6% | 50% | 8.2% | -12.8 to -5.4 | rejected |
| `v08` | A random starting letter for every blank | 22.4% | 6.5% | 51% | 7.0% | -10.3 to -3.7 | rejected |
| `v09` | Pass the page around: a different invented person fills each blank | 22.1% | 5.6% | 48% | 8.3% | -9.5 to -3.5 | rejected |
| `v10` | Subtraction: only the three word-choice rules, without the prose-style skill | 13.9% | 2.9% | 52% | 8.7% | -0.5 to +3.9 | kept (equal, simpler) |
| `test-base` | Held-out test: no skill | 49.2% | 20.7% | 23% | 23.4% |  |  |
| `test-v00` | Held-out test: original humanplease skill | 40.5% | 14.0% | 33% | 19.9% | +0.9 to +16.1 |  |
| `test-v10` | Held-out test: final optimized word-choice skill (v10) | 14.0% | 1.3% | 58% | 9.9% | +22.4 to +30.8 |  |

People on the same stories (matched sample size): same-blank 1.1% (tuning) / 1.0% (test); distinct 69% / 80%.

## What worked, what didn't

**Kept:**
1. **Be a specific person** (`v02`). Choosing words from an invented person's life gave the first significant drop.
2. **Name the defaults** (`v03`). Listing the model's stock funny words (casserole, soggy, pickle, llama, tickle…) was the biggest single drop, about 14 points.
3. **Seed the person from chance** (`v05`). Building the person from a random letter and number stopped every run from inventing the same "quirky" person. Replicated (15.6% then 16.6%).
4. **Drop the prose rules** (`v10`). Removing the whole original prose-style skill made no difference (13.9%, n.s.), so the final skill is just the three word-choice rules.

**Rejected:** skipping first ideas (`v01`, not significant); "make the humor come from this sentence" (`v04`, every run found the same pun); a second wave of banned words (`v06`, the model moved on to a third wave); "don't maximize funny, be ordinary" (`v07`, ordinary words converge); a random letter per blank (`v08`, the model's "random" letters aren't random); a different person per blank (`v09`).

The pattern: rules that break a specific default help; rules that add structure or ask for "ordinary" make runs converge.

## Held-out result

On the 10 untouched test stories, the same-blank rate went from **49.2%** (no skill) and **40.5%** (original humanplease)
to **14.0%** with the final skill; all 6 samples agreed on 1.3% of blanks instead of 20.7%. People: 1.0%.

**It did not converge to human numbers.** The best skill plateaued at roughly 14× the human same-blank rate, and four
further ideas all made it worse. Banned-word lists also play whack-a-mole: the new favourites are *lukewarm, crunchy,
lumpy, walrus*.

## Limits

- One model, one task, one prompt; 40 tuning stories is small, and the test set is 10 stories.
- The optimizer (me, Claude) wrote the variants, so the search is a handful of hypotheses, not an exhaustive search.
- The metric rewards variety, not quality. Answers were read by hand for sense, but nobody rated funniness.
