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

The L3/L4 specs seed endpoint telemetry via
`src/data_generators/forensic_data.ts` in `beforeAll` and reclaim it in
`afterAll`. Without that fixture `execute_esql` returns zero rows and the agent
stops at "insufficient evidence" before reaching the corroboration report, so
the scores measure the fixture, not the model.
