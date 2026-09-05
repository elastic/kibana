# @kbn/evals-suite-security-watch-escalation-chain

Coverage for the **Watch escalation chain** — the Floor → Dark → Deep → Detection
hand-off that threads a single investigation across specialist Watch tiers. Unlike
a converse-driven skill, the chain is driven by `workflow.execute`, so its coverage
layout is deliberately different from a routing suite. This README declares which
test layer lives where, and — importantly — which L0 form applies, so the layout
reads as intentional rather than as a missing layer.

## Test layout by layer

| Layer | File | Substrate | What it pins |
| --- | --- | --- | --- |
| **L0 — transition gate** | `src/transition_gate.test.ts` | Deterministic (no LLM, no Kibana boot) | The chain's entrypoint control-flow decision: Floor's `escalate_to_dark` step fires the Floor → Dark hop **iff** `classification == 'true_positive' AND confidence >= escalateThreshold`. Positive control that the synthetic fixture trips the gate, plus sub-threshold, boundary (`>=` inclusive), and wrong-verdict negatives. |
| **L1 — schema conformance** | `src/schema_conformance.test.ts` | Deterministic (no LLM, no Kibana boot) | The cross-tier handoff *contract*: `buildSyntheticEscalation` conforms to the pnd plugin's canonical `watchEscalationSchema` (bug #9 regression — the untyped `"[object Object]"` payload). |
| **L1 — fixture invariants** | `src/constants.test.ts` | Deterministic | Fixture shape/self-consistency. |
| **L3/L4 — live pipeline** | `evals/escalation_chain_composite.spec.ts`, `evals/watch_floor_durable_outcome.spec.ts` | Live LLM + Scout/golden ES | The real chain executing end-to-end and persisting a durable outcome. |

## Why there is no *routing* L0 here (and what replaces it)

L0 normally asserts that the Agent Builder default-agent router picks the right
skill/tool for a natural-language turn. This chain has **no converse router
surface** — it is sequenced by `workflow.execute`, so there is no skill or tool
for a router to select. A `routing_smoke.spec.ts` here would test nothing real.

That does **not** mean L0 is empty. The chain's entrypoint still makes a
deterministic control-flow decision (the `escalate_to_dark` predicate above), and
that decision is the true layer-below signal: if it is wrong, every L1/L3/L4 score
is meaningless because the chain either never starts or starts on the wrong
verdict. `transition_gate.test.ts` is that L0. It is mirrored from
`watch_floor_orchestrator.yaml`'s `escalate_to_dark` `if:` expression via the
`FLOOR_ESCALATION_POLICY` constant in `src/constants.ts` — keep the two in
lockstep; a drift in either is caught by the gate's positive control.

**Routing L0 for the orchestrators' `kind: skill` steps stays upstream.** The Floor
and Dark orchestrators invoke `alert-analysis` as a `kind: skill` step (and the
Dark tier drives `threat-intel-hunt` from its worker). Their **routing** L0 belongs
to their own suites (`security-alert-triage`, `security-threat-intel-hunt`, each
with its own routing smoke). Duplicating it here would be cohort-mixing — reference
it, do not re-test it.

## Run

```bash
# Deterministic L0/L1 gates (fast, no stack):
node scripts/jest --config \
  x-pack/solutions/security/packages/kbn-evals-suite-security-watch-escalation-chain/jest.config.js

# Live L3/L4 scorecard, against a running Scout stack with EIS connectors.
# Eval suites use createPlaywrightEvalsConfig, so they run via scripts/evals
# (scripts/scout run-tests rejects them):
node scripts/evals run --suite security-watch-escalation-chain \
  --model eis-anthropic-claude-5-sonnet --judge eis-google-gemini-3-0-flash
```

Set `TRACING_ES_URL` to the golden trace ES so per-example traces and score docs
land where the reporter reads them.
