# @kbn/evals-suite-security-alert-triage

End-to-end evaluation suite for the Security AI Assistant's **bulk alert triage**
capability: whether the assistant correctly prioritizes critical/high-severity
alerts buried inside large alert sets, identifies hosts targeted by multiple
correlated alerts, and — when an alert set is large enough to trigger
"summary mode" — reads every alert batch (`attachment_read`) before reasoning
over the data.

## Prerequisites

- No dedicated `serverConfigSet`; the suite uses the evals CLI default
  (`evals_tracing`), which enables OTel tracing required by the trace-based
  evaluators.
- An AI connector available (see `@kbn/evals` docs). `EVALUATION_CONNECTOR_ID`
  must be set.

## Running

From the Kibana repo root:

```sh
# Start the evals server (tracing config set)
node scripts/scout start-server \
  --arch stateful \
  --domain classic \
  --serverConfigSet evals_tracing

# In another terminal, run the suite
node scripts/evals run --suite security-alert-triage
```

`node scripts/evals start --suite security-alert-triage` manages the Scout server
for you.

All evaluation specs live under [`evals`](./evals).

## Scenarios

Synthetic alert data is defined in
[`src/synthetic_alerts.ts`](./src/synthetic_alerts.ts) and seeded into
`.alerts-security.alerts-default` in `beforeAll` (cleaned up in `afterAll`).

[`evals/alert_triage_quality.spec.ts`](./evals/alert_triage_quality.spec.ts) — 3 scenarios:

| Scenario | Setup | What it asserts |
| --- | --- | --- |
| priority triage | 100 alerts, inline mode | Finds the single critical alert buried at index 49; names specific hosts; no hallucinated entities |
| entity correlation | 100 alerts, inline mode | Identifies the host appearing in 20/100 alerts and the attack progression |
| end-to-end / summary mode | 200 alerts (10 batches) | Calls `attachment_read` 10 times, then surfaces the critical alert and correlated host |

[`evals/bulk_alerts_attachment_read.spec.ts`](./evals/bulk_alerts_attachment_read.spec.ts) — 1 scenario:

| Scenario | Setup | What it asserts |
| --- | --- | --- |
| bulk attachment read | 120 synthetic IDs (6 batches), summary mode | Deterministic compliance: `attachment_read` is called once per batch |

## Evaluators

Assembled inline per spec:

| Evaluator | Kind | Measures |
| --- | --- | --- |
| `criteria` (per scenario) | LLM | Triage quality against scenario-specific criteria (quality spec only) |
| `AttachmentReadCompliance` | CODE | `attachment_read` calls in the trace ÷ expected batches ([`src/evaluators.ts`](./src/evaluators.ts)) |
| `Tool Calls`, `Latency`, `Input/Output/Cached Tokens` | CODE (trace-based) | Non-functional metrics from the OTel trace |

`AttachmentReadCompliance` passes through (`score: 1`) when an example sets no
`expectedAttachmentReads`, so it is a no-op for inline-mode scenarios.
