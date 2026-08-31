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
