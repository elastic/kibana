# Deep Watch Raw Log Corroboration Eval Suite

Evaluates the Raw Log Corroboration Worker — a Deep Watch Worker that takes an
investigation narrative built from alerts and pivots into raw telemetry to
either corroborate or identify gaps.

## Scenarios

1. **Full corroboration** — all narrative stages have matching raw telemetry
2. **Partial gap** — one stage has no raw telemetry (detection blind spot)
3. **No raw telemetry** — the entire narrative cannot be corroborated

## Ladder

- L0: Transition gate (workflow-driven, no router surface)
- L1: Schema conformance (worker output schema validation)
- L2: Deterministic quality (gap detection accuracy)
- L3: Composite pipeline (narrative to raw log query to corroboration report)
- L4: Durable outcome (report persisted to store)

## Running

```bash
# L1/L2 deterministic evaluators (no stack required):
node scripts/jest --config \
  x-pack/solutions/security/packages/kbn-evals-suite-security-deep-watch-raw-log-corroboration/jest.config.js

# Live L0/L3/L4 scorecard, against a running Scout stack with EIS connectors.
# Eval suites use createPlaywrightEvalsConfig, so they run via scripts/evals
# (scripts/scout run-tests rejects them). The judge must come from a different
# model family than the candidate — never self-judge.
node scripts/evals run --suite security-deep-watch-raw-log-corroboration \
  --model eis-anthropic-claude-5-sonnet --judge eis-google-gemini-3-0-flash
```

### Getting per-example numbers from a local run

A local `scripts/evals run` computes its scorecard in-test and discards it: score
documents are written by the Kibana evals API only when a run carries the
experiment/execution context that `scripts/evals start` builds in CI. A green
local run therefore leaves `.evaluation-scores*` empty — that is expected, not a
broken stack, and re-running does not help.

Set `EVAL_SCORECARD_LOG=1` to emit one line per example instead:

```bash
EVAL_SCORECARD_LOG=1 node scripts/evals run \
  --suite security-deep-watch-raw-log-corroboration \
  --model eis-anthropic-claude-5-sonnet --judge eis-google-gemini-3-0-flash \
  2>&1 | tee run.log

grep '\[SCORECARD\]' run.log | sed 's/.*\[SCORECARD\] //' | jq -s .
```

### Score and trace destinations ignore the environment

`scripts/evals` reads score/tracing cluster URLs from
`x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.local.json`, not
from `EVAL_KBN_URL` / `TRACING_ES_URL`. Exporting those variables has no effect;
if a run appears to write nowhere, edit that file to match the stack you booted.
Verify the ports you are actually pointing at before concluding a run failed.

### Iterating

Boot the stack once and re-run the suite against it rather than restarting
ES+Kibana per run. Repeated measurements (multi-rep sampling) belong on
isolated, parallel stacks — never several concurrent runs against one worktree,
where parallel `tsc -b` invocations corrupt shared project references.

`EVAL_SHARD="<index>/<total>"` runs one stride slice of the L2 dataset, so a
repeated-sampling sweep can fan out across stacks instead of serialising:

```bash
EVAL_SHARD=1/3 node scripts/evals run --suite security-deep-watch-raw-log-corroboration ...
```

Shards are assigned by stride (`position % total`), and a malformed spec throws
rather than silently running the full dataset — a fallback would make every
shard run every example while a sweep's doc-count gate still reported a
complete run. L3/L4 are single-scenario specs and ignore the variable.

Note that a sharded VM sweep also needs a `SUITE_PROFILES` entry in
`scripts/orca_vm/persona_matrix_sweep.py`, whose expected doc count must be
**measured from a canary run** rather than counted from source.

The L3/L4 specs seed endpoint telemetry via
`src/data_generators/forensic_data.ts` in `beforeAll` and reclaim it in
`afterAll`. Without that fixture `execute_esql` returns zero rows and the agent
stops at "insufficient evidence" before reaching the corroboration report, so
the scores measure the fixture, not the model.
