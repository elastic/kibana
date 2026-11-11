# Detection Watch Rule Coverage Evaluation Suite

Evaluates the AlertZero Detection Coverage Review, the managed workflow
`system-security-coverage-review`. The review takes a detection gap and decides if a rule already
covers it. Its `coverage_check` step returns one verdict:

- `covered_enabled`: an installed, enabled rule detects the gap. No action.
- `covered_disabled`: an installed rule detects the gap, but it is disabled.
- `prebuilt_available`: an Elastic prebuilt rule that is not installed detects the gap.
- `no_coverage`: no rule detects the gap.

## What one example does

1. Writes a `security.coverage` knowledge indicator to `ai-index-idx-security-investigations`,
   with a fresh uuid as its id.
2. Runs the installed review with `autonomy_level: assisted`.
3. Polls the run until the `coverage_check` step has a result, and reads its structured output.
4. Cancels the run, and deletes the indicator and the conversations the run wrote.

The suite runs the review document that the alertzero plugin installs. It does not carry its own
copy of the workflow.

## Evaluators

| Evaluator | Kind | Scores |
| --- | --- | --- |
| Verdict | CODE | The verdict is the expected one. |
| Rule Match | CODE | The rule that `rule_id` points to is the expected rule or an accepted alternate. A decoy, any other rule, or an id with no rule scores 0. |
| Installable | CODE | For `prebuilt_available`: `rule_id` is a catalog rule that is not installed, and `prebuilt_version` is its catalog version. |
| Rationale | LLM | The judge model answers 3 questions about `rationale_summary` and `rationale`: it names a behavior from the gap, its claims about the rule agree with the rule description and query, and it does not contradict the verdict. |

The judge sees the gap, the answer, and the rule that the answer names. It does not see the
answer key. It cannot see the other rules in the space, so it does not catch a false "no installed
rule detects this". Verdict catches that case.

## Datasets

- `prebuilt suggestion` (20 examples): Linux gaps from the product answer key. Only a prebuilt rule
  covers each gap. Each example lists the primary rule, accepted alternates, and decoys.
- `verdicts` (7 examples): the test installs 4 custom rules (2 enabled, 2 disabled) and removes
  them at the end. The examples expect `covered_enabled`, `covered_disabled`, and `no_coverage`.
- `rationale judge calibration` (7 examples): written answers, no workflow run. 2 are correct
  and 5 have one known fault each. The `Judge Calibration` evaluator scores 1 when the judge
  passes a correct answer, or fails a bad answer on the question that the fault breaks. A judge
  that passes everything scores 0 here.

## Model under test

The `coverage_check` step takes its model from the `alertzero_efficient` inference feature, not
from `--model`. Before the first example, the suite sets that feature to the `--model` endpoint, and
it restores the previous setting at the end. An example on any other model stops the run.

## Runs as the eval user, not as a service account

In production, the Detection Watch sweep starts the review as the worker service account. The
suite starts the review through the workflows API as the eval user. The steps after the check
create proposals and start rule creation, and they need a service account, so they fail. That is
intended: the suite scores only the check, and the failure stops the review before it changes
anything on the stack.

## Cleanup

- Each example removes its run, indicator, and investigation in a `finally` block.
- An API error fails that example only. A run on the wrong model ends the experiment, and the worker
  teardown removes the runs that are still open.
- Before the first example, the suite deletes the indicators that a killed run left behind. They
  carry the tag `eval:detection-watch-rule-coverage`. A pending indicator would otherwise start real
  reviews when the Detection Watch sweep runs on this stack.
- The conversation of the check step is private. With basic authentication, the delete API answers
  404 for it, so it can stay on a local stack.

## Running

```bash
# Starts a local stack, runs all tests 3 times
node scripts/evals start --suite detection-watch-rule-coverage \
  --model <connector> --judge <connector>

# Only the judge calibration
node scripts/evals start --suite detection-watch-rule-coverage \
  --model <connector> --judge <connector> --grep "rationale judge fails bad answers"
```

On CI, add the label `evals:detection-watch-rule-coverage` to a PR. The suite has no weekly run.
