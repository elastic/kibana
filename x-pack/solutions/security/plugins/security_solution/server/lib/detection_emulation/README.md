# Detection Emulation

Server-side library that validates a detection rule by running an emulated attack and
measuring how many expected alerts the rule produces.

Entry point: `POST /internal/detection_engine/emulation/validate_rule`
(`api/validate_rule/route.ts`). The route executes the eight-step pipeline below.

---

## Pipeline overview

```
request
  │
  ▼
1. Flag gate          feature flags per mode (log_injection / real_execution)
2. Authentication     emulation is attributable — unauthenticated callers rejected
3. RBAC               real_execution requires endpoint execute privilege
4. Scenario generator rule MITRE tags → payload set → scenarioId
5. Dispatch           log_injection or real_execution per mode
6. Telemetry          poll Detection Engine alerts for scenarioId
7. Confidence score   coverage × 0.6 + precision × 0.4
8. History write      persist detection-emulation-report saved object
  │
  ▼
ValidationReport (report_id, confidence, coverage, precision, tp, fp, caveats, …)
```

---

## Step 1 — Payload library

`payloads/payloads.json` (max 15 entries, hard-coded cap in `payloads/index.ts`).

Each entry:

```ts
{
  techniqueId:     "T1059.001",          // ATT&CK technique or sub-technique
  name:            "PowerShell",
  agentTypes:      ["endpoint"],         // EDR types that support this payload
  command:         "execute",            // response action command name
  parameters:      { … } | null,        // forwarded verbatim to the runner
  expectedSignals: ["Windows PowerShell"] // Elastic prebuilt rule names expected to fire
}
```

Wave-1 covers 12 techniques: T1059.001/003/004, T1218.005/011, T1053.005, T1547.001,
T1057, T1003.001, T1070.004, T1071.001, T1112.

---

## Step 2 — Scenario generator

`scenario_generator.ts`

1. Fetches the detection rule by `ruleId` via `RulesClient`.
2. Extracts all MITRE technique and sub-technique IDs from `rule.threat[]`,
   deduplicates and sorts them (deterministic hashing input).
3. Intersects with the payload library; optionally filters by `agentType`.
4. Computes a content-addressed `scenarioId`:
   ```
   sha256-<hex>   where hex = sha256(JSON({ ruleId, techniqueIds }))
   ```

Failure modes (typed `GenerateScenarioFailureReason`):

| Reason | HTTP status | Meaning |
|---|---|---|
| `rule_not_found` | 404 | `ruleId` does not match any alert rule |
| `no_mitre_tags` | 422 | Rule has no `threat[].technique` entries |
| `no_supported_techniques` | 422 | Techniques found but none have a library payload |

---

## Step 3 — Dispatch modes

### `log_injection` (default, flag: `detectionEmulationLogInjection`)

`log_injection/generator.ts` synthesizes one ECS document per selected payload using
technique-specific field templates (e.g. `process.name: powershell.exe` for T1059.001).
Each document is tagged with:

```
kibana.alert.emulation.id               scenarioId
kibana.alert.emulation.mode             "log_injection"
kibana.alert.emulation.scenario_fingerprint   sha256 of (ruleId, payloadIds, agentType)
```

`log_injection/executor.ts` bulk-indexes them with `refresh: wait_for` into:

```
.kibana-security-emulation-logs-<spaceId>-YYYY.MM.DD
```

ILM rolls the index after 7 days. Detection Engine evaluates the injected documents
against active rules exactly as it would evaluate real endpoint events — the tagging
fields are for analyst filtering only; no branching on them occurs in the pipeline.

### `real_execution` (flag: `detectionEmulationRealExecution`, RBAC required)

Dispatches one `execute` response action per selected payload via `EmulationRunner`
(`execution/runner.ts`). The rate limiter, allowlist, and idempotency cache in
`execution/` are inherited from the substrate and apply unchanged.

---

## Step 4 — Telemetry collector

`telemetry_collector.ts`

Queries `.alerts-security.alerts-*` for alerts produced after `scenarioStartedAt` that
carry `kibana.alert.emulation.id == scenarioId`.

**`poll` mode** (used by the route):
- Queries every 5 s.
- Stops early when all `expectedSignals` have fired.
- Hard ceiling: 60 s (internal) + `wallBudgetMs` ceiling from the route (default 120 s,
  max 300 s). An `AbortController` fires at the wall budget.

**`one_shot` mode**: single query, returns immediately. Used by tests and tooling.

Output includes `matchedSignals`, `unmatchedSignals`, and `pollDurationMs`.

---

## Step 5 — Confidence scorer

`confidence_scorer.ts`

```
coverage   = distinctMatchedSignals / expectedSignals   (0 if expectedSignals empty)
precision  = TP / (TP + FP)                             (0 if no alerts observed)
confidence = clamp(round(coverage × 0.6 + precision × 0.4, 2), 0, 1)
```

A "matched signal" is a distinct rule name that both fired (in `observedAlerts`) and
appears in `expectedSignals`. False positives (observed but not in `expectedSignals`)
are attributed to the first phase bucket so the aggregate precision formula stays
correct.

Machine-readable `caveats` (present when conditions degrade the score):

| Caveat | Condition |
|---|---|
| `expected_signals_empty` | payload library returned no expected signal names |
| `no_alerts_observed` | no alerts matched the scenarioId |
| `only_false_positives` | TP = 0, FP > 0 |

---

## Step 6 — Emulation history

`emulation_history/` + `emulation_report_type.ts`

Saved object type: `detection-emulation-report`
- Hidden (`hiddenFromHttpApis: true`), namespace-scoped, write-once.
- Persisted via the internal (hidden-type-aware) SO client — the request-scoped client
  cannot access hidden types.

**Deduplication**: before creating, `create.ts` searches for an existing SO matching
`(scenarioFingerprint, ruleId)`. A match returns the existing `id` with `created: false`
instead of writing a duplicate.

The `scenarioFingerprint` is computed over `{ ruleId, payloadIds.sort(), agentType }` —
it differs from `scenarioId` (which is computed over rule MITRE tags only). Two runs
with the same payloads but different endpoint targets share a fingerprint; two runs
triggered by different rule tag changes produce different fingerprints.

---

## Feature flags

| Flag | Controls |
|---|---|
| `detectionEmulationLogInjection` | Enables log-injection dispatch and the route for `mode: log_injection` |
| `detectionEmulationRealExecution` | Enables real-execution dispatch and the route for `mode: real_execution` |

Both are `experimental` in `config/experimental_features.ts`.
