# Improving MITRE accuracy on the rule-creation workflow — experiment + guidance

**Context:** measured against the golden cluster across builds 459/460/461 (3 reps each).

## The measured problem

| Evaluator | golden | hard-cases | Noise band (95% CI, n=9) |
|---|---|---|---|
| MITRE Accuracy | 0.74–0.83 | **0.61–0.63** | ±0.10 single run |
| Gap Addressed | 1.0 | 1.0 | saturated |
| everything else | 1.0 | 1.0 | saturated |

Hard-cases MITRE hovers at ~0.62, stably (std 0.009 across runs — real model
behavior, not variance).

## Root cause — hypotheses, all three tested at once in v4

Every hard case asks for exactly one technique. Ordinal scoring
(exact=1, parent=0.5, miss=0) at 0.62 means models land the canonical
confusion for each case:

| Case | Stated | Canonical wrong neighbor |
|---|---|---|
| npm lifecycle hook | T1195.002 (Supply Chain) | T1059 (Scripting) |
| route53 log deletion | T1562.008 (Impair Defenses) | generic T1562 |
| container admin | T1609 | T1611 (Escape to Host) |
| shadow copy deletion | T1490 (Impact) | T1070.004 / T1486 |
| local account creation | T1136.001 | T1136 / T1098 |

- **H1** — models answer the behavior, not the framework: the prompt asked
  for a mapping but never taught sub-technique vs parent granularity or the
  tactic-stage distinction.
- **H2** — no negative anchoring: the canonical wrong neighbor for each case
  was never named, so the model had no signal to discriminate.
- **H3** — no verification step: nothing forced the agent to check
  rule.threat[0].technique[0].id equals the stated id before returning.

## The change (v4, on #287997)

Prompt-only, three rules added to the draft step:

1. Granularity rule — rule.threat[0].technique[0].id MUST equal the stated
   id verbatim; if it is a sub-technique, never fall back to the parent.
2. Wrong-neighbor table — the exact confusion for each of the five hard
   behaviors, stated as "it is X, not Y, and not Z".
3. Self-check — re-read the draft and verify the first technique id equals
   the stated one; fix rather than ship a mismatch.

Version bumped 3 -> 4 so versionStrategy:auto reinstalls on stack start.

## How to read the result

- Success: hard-cases MITRE mean moves beyond ±0.10 vs build 461
  (0.63 -> >0.73), with no golden regression (0.74 must not drop below 0.64).
- If the delta is inside the band: run again — single-run swings up to 0.09
  are noise at this sample size.
- If it moves for golden but not hard: the change generalized; hard set is
  model-limited, and further prompt work will not move it.

## Longer-term, if prompts plateau

- Weight tactic tier separately from technique tier in MITRE scoring —
  "right tactic, wrong technique" is diagnostically different from "wrong
  tactic entirely" and the current F1 collapses them.
- Hard-cases need more examples before sub-0.1 deltas are resolvable; 5
  examples means one flip = 0.20 mean swing.

## Measured resolution limits (build 479, first instrumented run)

The reliability layer now prints 95% CI half-widths per evaluator. Measured at
n=15 (3 reps x 5 examples):

- MITRE Accuracy golden: 0.738 ± 0.162
- MITRE Accuracy hard:   0.683 ± 0.185

**Consequence: no unpaired MITRE delta below ~0.35 is resolvable at this sample
size.** Any prompt A/B judged by comparing dataset means at n=15 will read noise.

### The design that resolves at this sample size: paired per-example deltas

Each run now emits `PAIRED_SCORES {dataset, scores}` (one JSON payload per
dataset, keys `evaluator::exampleId`). To compare two arms:

1. Grep `PAIRED_SCORES` from both build logs (baseline arm and candidate arm).
2. Feed the two payloads to `pairedDeltas` (src/score_stats.ts): it pairs by
   example, skips examples missing on either arm, and returns the per-example
   delta distribution plus a paired t-style mean and std.
3. A prompt change is proven only if the paired mean delta exceeds
   2 * (paired std / sqrt(n)) — example-difficulty variance is removed by
   pairing, so the effective resolution is far tighter than the ±0.16-0.19
   unpaired band.

Why not just raise n? Detecting +0.10 unpaired needs n≈90 per dataset
(18 examples x 5 reps) — roughly 6x the runtime cost of pairing.

### Executing the comparison

`~/.hermes/scripts/paired_ab.py <baseline_log.json> <candidate_log.json> [substr]`
implements this protocol against two saved job logs (extracted via the Buildkite
API). Smoke-tested: it refuses to call a +0.33 delta at n=3 distinguishable,
which is the discipline this guide exists to enforce. `run_mitre_ab.sh` next to
it outlines the v3-baseline rerun, since the v3 baseline must carry the
PAIRED_SCORES instrumentation to be comparable.
