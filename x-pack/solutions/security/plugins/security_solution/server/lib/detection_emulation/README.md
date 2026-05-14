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

---

## OOB notification path (Risk #3)

Every emulation run writes a `detection-emulation-report` saved object before returning. That SO is the primary out-of-band audit record — it is distinct from the injected emulation events and persists regardless of whether the emulation produced any alerts.

### Key SO fields for SOC queries

| Field | Type | Content |
|---|---|---|
| `actor.kind` | `keyword` | `"user"` (direct REST/UI call) or `"agent-builder"` (AI tool dispatch) |
| `actor.conversationId` | `keyword` | Agent Builder conversation ID — pivots back to the chat that triggered the run |
| `actor.executionId` | `keyword` | Per-agent-run ID — correlates with Agent Builder execution logs |
| `actor.runId` | `keyword` | Top-level run ID from the agent runtime |
| `actor.toolCallId` | `keyword` | Per-tool-call ID — uniquely identifies one emulation dispatch within a run |
| `scenarioFingerprint` | `keyword` | SHA-256 of `{ ruleId, payloadIds (sorted), agentType }` — content-addressed, stable across re-runs of identical scenarios |
| `scenarioId` | `keyword` | SHA-256 of `{ ruleId, techniqueIds }` — identifies the MITRE surface evaluated |
| `operator` | `keyword` | Username of the Kibana user whose session triggered the run |
| `startedAt` | `date` | ISO 8601 timestamp of the emulation start |
| `mode` | `keyword` | `"log_injection"` or `"real_execution"` |

All fields are mapped as `keyword` (or `date` for `startedAt`) with `dynamic: false`, so they are available for filtering in Kibana Discover and ES query DSL without scripting.

### Kibana security audit log integration

When `xpack.security.audit.enabled: true` is set in `kibana.yml`, the Kibana security plugin emits an `saved_object_create` audit event every time a `detection-emulation-report` SO is written. Each event includes:

- `event.action: "saved_object_create"`
- `kibana.saved_object.type: "detection-emulation-report"`
- `kibana.saved_object.id` — the new SO ID
- `user.name` — the operator who made the request
- `kibana.space_ids` — the Kibana space

These events land in the Kibana audit log file (`xpack.security.audit.appender`) or in the `filebeat`-indexed stream if the ECS output appender is configured. They are separate from the `.kibana-security-emulation-logs-*` index that receives synthetic endpoint events.

To capture both the SO write and the injection side in a single SIEM rule, join on `scenarioId` or `scenarioFingerprint`:

```esql
FROM .kibana-security-solution* METADATA _index
| WHERE kibana.saved_object.type == "detection-emulation-report"
| EVAL fingerprint = detection-emulation-report.attributes.scenarioFingerprint,
       actor_kind  = detection-emulation-report.attributes.actor.kind
| WHERE actor_kind == "agent-builder"
| STATS count = COUNT(*) BY actor_kind, fingerprint
```

> **Note:** The `.kibana-security-solution-*` index requires `superuser` or a role with `read` access to that index. Prefer routing alerts through a Watcher or Kibana rule that queries via the saved-objects Find API (`GET /api/saved_objects/_find?type=detection-emulation-report`) so the query runs under a dedicated service account with narrowly-scoped privileges.

### SOC tooling consumption surface

Three consumption patterns are supported:

1. **Kibana rule (recommended)** — Create an Elasticsearch rule in the Security Solution that searches `.kibana-security-solution-*` for new `detection-emulation-report` documents where `actor.kind == "agent-builder"`. Alert on the first occurrence of a `scenarioFingerprint` seen within a rolling 24-hour window.

2. **Watcher** — A cluster-level Watcher job that polls the SO index on a schedule and POSTs a payload to a webhook (PagerDuty, Slack) when `actor.kind == "agent-builder"` appears. Use the `scenarioFingerprint` as the deduplication key.

3. **Fleet / Filebeat audit pipeline** — If `xpack.security.audit.appender.type: rolling-file` is configured, Filebeat's `kibana` module ingests the audit log. Filter on `event.action: "saved_object_create"` and `kibana.saved_object.type: "detection-emulation-report"` to forward notifications to the SIEM.

The `actor.kind` discriminator is the single field that distinguishes a human operator (who presumably knows they triggered a test) from an AI-driven dispatch (which may warrant a page to the SOC). Build alerting thresholds around `actor.kind == "agent-builder"` rather than on all emulation activity.

---

## Index read-access guidance (Risk #16)

The `.kibana-security-emulation-logs-*` index stores synthetic endpoint events that emulation injects. Operators should understand which principals can read that index and take steps to limit unintended access.

### Discovering actual access on your cluster

The smoke spec at `log_injection/__tests__/index_access.smoke.test.ts` probes which built-in Elasticsearch roles have read access. Run it against a representative cluster before configuring role restrictions:

```sh
EMULATION_SMOKE_ES_URL=https://elastic:changeme@localhost:9200 \
  node scripts/jest \
  x-pack/solutions/security/plugins/security_solution/server/lib/detection_emulation/log_injection/__tests__/index_access.smoke.test.ts
```

The probe creates a temporary test user for each built-in role, calls `security.hasPrivileges` via `run_as`, then uses `cat.indices` to count actual matching indices. Output is structured JSON written to stdout:

```json
{
  "probe": "index_access",
  "index_pattern": ".kibana-security-emulation-logs-*",
  "findings": [
    { "role": "superuser",    "canRead": true,  "indexCount": 3, "write": true,  "create_index": true },
    { "role": "kibana_system","canRead": true,  "indexCount": 3, "write": false, "create_index": false },
    { "role": "viewer",       "canRead": false, "indexCount": 0, "write": false, "create_index": false }
  ],
  "summary": {
    "can_read": ["superuser", "kibana_system"],
    "cannot_read": ["kibana_admin", "monitoring_user", "viewer", "editor", ...]
  }
}
```

### Expected access surface

Based on Elasticsearch's built-in role definitions:

| Role | Expected `canRead` | Reason |
|---|---|---|
| `superuser` | yes | Unrestricted cluster-wide access; intentional |
| `kibana_system` | yes | Broad `.kibana*` read required for Kibana internals |
| `kibana_admin` | no | Kibana-level admin privilege; limited ES index access |
| `viewer` | no | Reads non-system indices only; dot-prefix excluded by default |
| `editor` | no | Same as `viewer` for index access |
| All others | no | No explicit `.kibana*` grants |

`kibana_system` read access is a known residual: the role requires broad `.kibana*` read and cannot be narrowed without forking the role definition. The 7-day ILM auto-delete policy (configured in `index_template.ts`) bounds the exposure window.

### Least-privilege recommendations for operator-defined roles

Elasticsearch RBAC is additive — there is no index-level deny. To prevent a custom service account from reading emulation logs:

1. **Do not grant** `read` or `indices:data/read/*` on `.kibana*` or `.kibana-security-emulation-logs-*` in custom roles. Grant only the specific `.kibana` sub-indices that the service account actually needs.

2. **Scope cross-cluster-search (CCS) roles** explicitly. If you have a CCS reader role with `indices: [".kibana*"]`, add an explicit exclusion by splitting it into two narrower patterns instead of using the wildcard.

3. **Prefer document-level security (DLS)** if a service account legitimately needs `.kibana*` access but should not see emulation data. Add a DLS filter:
   ```json
   {
     "indices": [{
       "names":      [".kibana-security-emulation-logs-*"],
       "privileges": ["read"],
       "query":      { "match_none": {} }
     }]
   }
   ```
   This grants the `read` privilege but returns zero documents — the service account passes privilege checks but sees nothing.

4. **Audit index access** using Elasticsearch audit logging (`xpack.security.audit.enabled: true` at the ES layer, not just Kibana). Filter on `event.type: "access"` and `indices: [".kibana-security-emulation-logs-*"]` to detect reads from unexpected principals.

5. **Re-run the probe after role changes** to verify the access surface matches expectations. The probe's `indexCount` field distinguishes "role has the privilege" (privilege check returns true, but no indices exist yet) from "role can actually read data" (indices exist and the role can count them).
