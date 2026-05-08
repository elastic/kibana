# Alerts RAG Eval Suite — `src/` internals

This document describes the dataset schema, example categories, and the procedure for updating
fixtures. It is aimed at maintainers who need to extend or modify the evaluation dataset.

---

## Dataset overview

The dataset is defined in `src/datasets/alerts_rag_dataset.ts` and contains inline TypeScript
fixtures that were ported from the LangSmith dataset:

- **Name:** Alerts RAG Regression (Episodes 1–8)
- **LangSmith ID:** `bd5bba1d-97aa-4512-bce7-b09aa943c651`
- **Examples:** 9 (6 from LangSmith + 3 temporal-query examples added during migration)

Each example carries a `langsmithExampleId` field that traces it back to the source dataset.
New examples added after the migration do not have a real LangSmith UUID; use a deterministic
placeholder UUID so the field is always present.

---

## Alert document schema

Every alert document passed as RAG context must satisfy `AlertDocument` (`src/dataset.ts`):

```ts
interface AlertDocument {
  _id: string;               // unique alert ID, e.g. "rag-alert-001"
  _source: {
    '@timestamp': string;    // ISO-8601, e.g. "2024-08-20T00:00:00.000Z"
    host?: { name: string }; // host the alert fired on
    user?: { name: string }; // user associated with the alert
    kibana: {
      alert: {
        rule: { name: string }; // detection rule name
        severity: string;       // "critical" | "high" | "medium" | "low"
        status: string;         // "open" | "acknowledged" | "closed"
      };
    };
  };
}
```

`_id` values in the fixture dataset follow the pattern `rag-alert-NNN` (zero-padded to 3 digits).
The evaluators rely on this pattern to extract retrieved document IDs from the model's answer text;
any new fixture IDs must match `/rag-alert-\d+/` for the RAG precision/recall metrics to work.

At runtime, `validateAlertContext` (`src/dataset.ts`) checks every document in the `context` array
and throws a descriptive error on the first missing required field.

---

## Example categories

Each `AlertsRagExample` carries a `metadata.category` field typed as `AlertsRagCategory`
(`src/dataset.ts`). The four categories represent distinct reasoning capabilities:

| Category | What it tests | Current count |
|---|---|---|
| `multi_alert_correlation` | Aggregate counts, severity breakdowns, triage prioritisation across the full alert set | 4 |
| `temporal_query` | Time-range reasoning: first/last alert, count within a time window | 3 |
| `field_specific_lookup` | Identifying distinct field values (hosts, users) that appear in the alert set | 2 |
| `single_alert_query` | Questions about a specific individual alert (none currently; reserved for future coverage) | 0 |

The shared scenario context (`SCENARIO_CONTEXT` in `alerts_rag_dataset.ts`) provides 95 open
alerts (85 critical, 10 high) across 15 hosts spanning 2024-08-20 in 15-minute intervals.
All examples in the dataset reason over this same alert backdrop.

---

## Evaluators

Three evaluators run on every example:

- **RAG Precision@K / Recall@K / F1@K** — retrieval quality measured by comparing alert IDs
  extracted from the model's answer against those present in the `expected.reference`.
  `K` defaults to 10 and can be overridden via `ALERTS_RAG_EVAL_K`.
- **Faithfulness** (`src/evaluators/alerts_rag_faithfulness_evaluator.ts`) — LLM-as-judge check
  that the answer does not contradict the provided alert context.
- **Correctness** (`src/evaluators/alerts_rag_correctness_evaluator.ts`) — LLM-as-judge check
  that the answer matches the expected reference.

Passing thresholds are defined in `src/thresholds.ts` and derived from LangSmith P10 baselines.

---

## Adding or updating examples

1. **Add the alert documents** to `SCENARIO_CONTEXT` in `alerts_rag_dataset.ts` if the new
   example requires alerts not already present. Follow the `makeAlert` / `mkTimestamp` helpers to
   keep IDs and timestamps consistent. IDs must match `rag-alert-NNN`.

2. **Append the example** to the `alertsRagDataset` array with:
   - `langsmithExampleId` — the real LangSmith UUID if the example was exported from LangSmith;
     otherwise a new deterministic UUID (generate once and hard-code it).
   - `input` — the verbatim user question.
   - `expected.reference` — the ground-truth answer the model should produce. The reference should
     mention alert IDs (`rag-alert-NNN`) wherever retrieval quality is meaningful, so the RAG
     precision/recall metrics have signal to work with.
   - `context` — set to `SCENARIO_CONTEXT` for examples that reason over the full alert set; pass
     a subset array for examples that deliberately test retrieval over a smaller context window.
   - `metadata.category` — one of the four `AlertsRagCategory` values above.
   - `metadata.dataset_split` — `['base']` for regression examples; add further splits as needed.

3. **Run `validateAlertContext`** locally to catch missing fields before committing:

   ```ts
   import { validateAlertContext } from './dataset';
   import { alertsRagDataset } from './datasets/alerts_rag_dataset';

   for (const ex of alertsRagDataset) {
     if (ex.context) validateAlertContext(ex.context);
   }
   ```

4. **Update the thresholds** in `src/thresholds.ts` if the new examples meaningfully change the
   expected score distribution. Thresholds represent the P10 floor — a score below the floor
   signals a regression.

5. **Run the suite** once against a known-good connector to establish a baseline before opening a
   PR. Compare scores against `src/thresholds.ts` to confirm no regression.

---

## File map

```
src/
├── dataset.ts                  # Types: AlertDocument, AlertsRagExample, AlertsRagCategory
├── datasets/
│   ├── alerts_rag_dataset.ts   # 9 inline fixture examples + SCENARIO_CONTEXT (95 alerts)
│   └── index.ts                # Re-exports alertsRagDataset
├── evaluate.ts                 # Playwright fixture extending @kbn/evals evaluate
├── evaluate_dataset.ts         # createEvaluateAlertsRagDataset — task + evaluator wiring
├── evaluators/
│   ├── alerts_rag_correctness_evaluator.ts
│   └── alerts_rag_faithfulness_evaluator.ts
└── thresholds.ts               # Passing/partial score floors derived from LangSmith P10
```
