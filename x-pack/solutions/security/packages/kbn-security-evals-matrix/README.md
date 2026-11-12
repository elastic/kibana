# kbn-security-evals-matrix

Security LLM performance matrix tooling. Generates the weekly matrix artifact
from evals experiments on a target Kibana, rejudges cells, and gates PRs on
eval regressions.

## Commands

Run via the CLI entry:

```
node x-pack/solutions/security/packages/kbn-security-evals-matrix/scripts/run_cli.cjs <command> [flags]
```

Commands: `matrix`, `rejudge`, `regression-gate`. Target and auth are
configured with `EVAL_KBN_URL` / `EVAL_KBN_API_KEY`, `--kbn-url` /
`--kbn-api-key`, or `--profile` (e.g. `dev-vault` for the golden cluster).

## regression-gate

Compares two evaluation experiments and exits non-zero when an evaluator got
significantly worse. Direction-aware: higher-is-better and lower-is-better
evaluators are both handled; neutral evaluators never trip. Repetitions of one
example are averaged over the count both runs share (examples, not
repetitions, count as pairs), and averaged Wilcoxon rows are re-run with exact
ties.

```
node x-pack/solutions/security/packages/kbn-security-evals-matrix/scripts/run_cli.cjs regression-gate \
  <target-experiment-id> <baseline-experiment-id> \
  [--min-pairs 10] [--regression-evaluators correctness,groundedness] [--no-multiplicity-correction]

# or resolve the baseline as the latest experiment on a branch
node x-pack/solutions/security/packages/kbn-security-evals-matrix/scripts/run_cli.cjs regression-gate \
  <target-experiment-id> --baseline-branch main --suite <suite-id>
```

With `--baseline-branch`, the baseline is the latest experiment of the same
model on that branch (the target itself is excluded). A target ID without `::`
is treated as a base build ID and resolved to its full execution ID.

Environment: `EVAL_KBN_URL`, `EVAL_KBN_API_KEY` (target Kibana and auth) and
`EVAL_SPACE_IDS` (same as `--space-ids`).

### Flags

| Flag | Default | Description |
| --- | --- | --- |
| `--baseline-branch` | none | Branch to find the latest baseline experiment on. Requires `--suite` and exactly one experiment ID. |
| `--suite` | none | Suite ID. Resolves base build IDs to full experiment IDs and scopes score reads. |
| `--space-ids` | `EVAL_SPACE_IDS` | Comma-separated spaces the experiments were run in (same value as `evals run`). `*` is rejected. |
| `--min-pairs` | `10` | Minimum paired examples for an evaluator to be gated. Fewer pairs are reported as "insufficient pairs" and cannot trip the gate. |
| `--regression-evaluators` | all | Comma-separated evaluator names that can trip the gate. Names absent from the comparison warn; if none match, the run fails. |
| `--no-multiplicity-correction` | off | Judge significance on raw p-values. Holm-Bonferroni adjustment across all comparisons in the run is on by default. |

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Passed — no evaluator got significantly worse. |
| `1` | Usage error or unexpected error. |
| `2` | Inconclusive — no baseline, no scores or pairs, nothing checkable, or no evaluator matched: regressions can be neither confirmed nor ruled out. |
| `3` | Significant regression. |

Score reads are strict: a failed read stays exit 1 instead of degrading into
an inconclusive gate, so a Kibana outage cannot hide behind exit 2.
