# @kbn/evals-suite-security-deep-watch-forensics

Coverage for **Deep Watch forensics** — the specialist tier that receives an
escalated investigation, packages evidence, generates and executes ES|QL, and
produces a durable forensic report. Unlike the escalation chain (which is
`workflow.execute`-sequenced and has no router surface), Deep Watch is invoked
through the Agent Builder router, so this suite carries a full L0–L4 ladder plus
deterministic gate families. This README declares which test layer lives where so
the layout reads as intentional.

## Test layout by layer

| Layer | File | Substrate | What it pins |
| --- | --- | --- | --- |
| **L0 — routing smoke** | `evals/routing_smoke.spec.ts` | Live LLM (Scout) | The Agent Builder router invokes the Deep Watch forensics skill for the natural-language turns that should reach it (`skillInvoked` + correct tool). |
| **L1 — schema conformance** | `src/evaluators/schema_conformance.test.ts` | Deterministic (Jest, no LLM) | Tool I/O contracts (`package_evidence`, `produce_draft_forensic_report`), ES\|QL query validation, the tool allow-list contract, and Gate Family A's output-validation + approval-boundary guards. |
| **L2 — deterministic quality** | `src/evaluators/leaf_quality_deterministic.test.ts` | Deterministic (Jest, no LLM) | Code-scored leaf quality: `TimelineAccuracy`, `IocValidationAccuracy`, etc. — model-independent, reproducible. |
| **Gate Family A (behavioral)** | `evals/gate_family_a.spec.ts` | Live LLM | The behavioral half of Family A (dedup: a duplicate escalation produces no additional evidence package), complementing the deterministic L1 guards. |
| **Family D — orchestrator identity** | `evals/orchestrator_identity.spec.ts` | Live LLM | Orchestrator-identity gates (D1: execution identity ≠ approval identity, subject separation). |
| **Watch invocation** | `evals/watch_invocation.spec.ts` | Live LLM | The Watch is actually invoked on the expected trigger. |
| **L3 — multi-turn agent quality** | `evals/leaf_quality.spec.ts`, `evals/composite_pipeline.spec.ts` | Live LLM (`converse`) | Multi-turn reasoning quality of the forensic report (`leaf_quality`), and the composite pipeline `C3:L3` (package evidence → ES\|QL gen/exec → draft). |
| **L4 — durable outcome** | `evals/durable_outcome.spec.ts` | Live LLM + persisted store | `C3:L4` — the forensic report is written to a durable store, not just an ephemeral chat/tool response. Per the pyramid, a worker whose findings exist only in an ephemeral response has no L4. |

## Why the deterministic and live layers are split on purpose

L1/L2 (Jest) prove the **gates** are correct — schema conformance, ES|QL validity,
allow-list, timeline/IOC accuracy — with the LLM out of the loop. They are
model-independent safety checks: they must pass identically for every model, so a
live LLM would add noise, not signal. The `evals/*.spec.ts` specs prove the
**other half**: how well the *real* model performs the forensic work and whether it
persists a durable outcome. You need both, and they run on different substrates by
design. `leaf_quality.spec.ts` was reclassified from L2 to L3 because it uses
`converse()` (LLM-invoked); the deterministic L2 evaluators live in
`leaf_quality_deterministic.test.ts`.

## Run

```bash
# Deterministic L1/L2 gates (fast, no stack):
node scripts/jest --config \
  x-pack/solutions/security/packages/kbn-evals-suite-security-deep-watch-forensics/jest.config.js

# Live L0/L3/L4 scorecard, against a running Scout stack with EIS connectors.
# Eval suites use createPlaywrightEvalsConfig, so they run via scripts/evals
# (scripts/scout run-tests rejects them):
node scripts/evals run --suite security-deep-watch-forensics \
  --model eis-anthropic-claude-4-6-sonnet --judge eis-anthropic-claude-4-6-sonnet
```

Set `TRACING_ES_URL` to the golden trace ES so per-example traces and score docs
land where the reporter reads them.
