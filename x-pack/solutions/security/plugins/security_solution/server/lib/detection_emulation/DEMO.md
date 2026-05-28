# Detection Emulation — Developer Demo Guide

Hands-on walkthrough for enabling and exercising the `validateRule` pipeline via
Agent Builder UI. Covers feature-flag setup, a step-by-step Agent Builder session,
and the full `ValidationReport` response format.

---

## 1. Prerequisites

### 1.1 Kibana dev server flags

Both feature flags are off by default. Add them to `config/kibana.dev.yml` before
starting your dev server:

```yaml
# config/kibana.dev.yml

xpack.securitySolution.enableExperimental:
  - detectionEmulationLogInjection      # enables log_injection mode (safe, no real endpoints)
  - detectionEmulationRealExecution     # enables real_execution mode (live EDR actions)
```

> **You only need `detectionEmulationLogInjection` for the happy-path demo below.**
> `detectionEmulationRealExecution` is required only when you want live response
> actions dispatched to actual enrolled agents.

Start the dev server:

```sh
KBN_USE_RSPACK=true yarn start
```

### 1.2 Optional runtime config

`config/kibana.dev.yml` also accepts the following tuning knobs. The defaults are
fine for local demos; override only when needed:

```yaml
xpack.securitySolution.detectionEmulation:
  # Fast kill-switch for real_execution (independent of the feature flag).
  # Set to false to block live dispatch without restarting Kibana.
  realExecutionEnabled: true

  # Hosts allowed to receive real_execution response actions.
  allowlist:
    allowAll: false                     # set true only in dev/CI, never production
    endpointIds: []                     # explicit list when allowAll is false

  # Per-space + per-host rate limits for real_execution dispatches.
  rateLimiter:
    maxCommands: 100                    # per space per hour
    windowMs: 3600000
    perHost:
      capacity: 3                       # per host per hour
      windowMs: 3600000

  # Log-injection index settings (applies only with detectionEmulationLogInjection).
  logInjection:
    indexTemplateName: .kibana-security-emulation-logs
    retentionDays: 7

  # Telemetry-collector wall-clock budget.
  validation:
    wallBudgetMsDefault: 60000          # 60 s default per run
    wallBudgetMsMax: 300000             # 5 min hard ceiling
```

### 1.3 Confirm flags are active

```sh
curl -s -u elastic:changeme \
  http://localhost:5601/internal/security_solution/experimental_features \
  | jq '.detectionEmulationLogInjection, .detectionEmulationRealExecution'
```

Expected output (with both flags added to `kibana.dev.yml`):

```
true
true
```

---

## 2. Find a rule ID to test

Go to **Security → Rules** and open any prebuilt rule that has MITRE ATT&CK tags
(e.g. *Windows PowerShell*). Copy the rule ID from the URL or from the rule's detail
panel.

Wave-1 payload library techniques (rules tagging these will succeed):

| Technique | Example prebuilt rule |
|---|---|
| T1059.001 | Windows PowerShell |
| T1059.003 | Windows Command Shell |
| T1059.004 | Unix Shell |
| T1218.005 | Mshta Process Started |
| T1218.011 | Regsvr32 Started |
| T1053.005 | Scheduled Task Creation |
| T1547.001 | Persistence via Run Keys |
| T1057 | Running Processes Enumeration |
| T1003.001 | LSASS Memory |
| T1070.004 | File Deletion |
| T1071.001 | Application-Layer Protocol |
| T1112 | Modify Registry |

---

## 3. Agent Builder UI walkthrough

Open the **AI Assistant** panel (or Agent Builder chat) and try the prompts below.
The detection-emulation skill activates automatically when it recognises a
validation intent.

### 3.1 Happy path — log_injection (recommended starting point)

```
Validate my PowerShell detection rule (ID: <paste-rule-id-here>)
against host ws-dev-001 and tell me whether it fires on T1059.001.
```

What the agent does:
1. Calls `security.detection-emulation.get-history` — reports prior runs if any.
2. Calls `security.detection-emulation.validate-rule` with
   `mode: "log_injection"` (safe default; no real endpoint needed).
3. Synthesises ECS documents in `.kibana-security-emulation-logs-default-*`,
   waits up to 60 s for Detection Engine to fire alerts, then scores.
4. Returns confidence score + matched/unmatched signals + audit `report_id`.

### 3.2 Check history before re-running

```
Before re-running emulation on rule <rule-id>, check whether it was
validated recently. If the last score was above 0.8, just tell me the
cached result — don't re-run.
```

### 3.3 Real execution (requires enrolled agent + feature flag)

```
Run a live emulation test for rule <rule-id> on endpoint <elastic-agent-id>.
I want real endpoint execution, not log injection.
```

The framework shows a **confirmation prompt** before dispatching. Confirm to
proceed or cancel; if you cancel, the agent will not retry.

### 3.4 Failure cases — observe graceful handling

```
Validate rule <rule-id-with-no-mitre-tags>.
```

Expected: agent reports `no_mitre_tags` and suggests adding ATT&CK tags.

```
Validate rule <rule-id-with-T1600-tag>.
```

Expected: agent reports `no_supported_techniques` (T1600 is not in Wave-1
library) and lists which techniques were found but unsupported.

---

## 4. `ValidationReport` response format

A successful `validate-rule` tool call returns the following JSON object under
`results[0].data`. All fields are always present on a `success: true` response.

```jsonc
{
  "success": true,

  // Audit reference — use this to retrieve the run from Saved Objects.
  "report_id": "so-uuid-of-detection-emulation-report",

  // Content-addressed fingerprint of (ruleId + MITRE technique IDs).
  // Two runs of the same rule share a scenarioId until rule tags change.
  "scenario_id": "sha256-<hex>",

  // Detection Engine rule UUID that was tested.
  "rule_id": "rule-uuid",

  // Dispatch mode used for this run.
  "mode": "log_injection",       // or "real_execution"

  // ── Confidence score (0–1, 2 dp) ───────────────────────────────────────
  "confidence": 0.84,

  // coverage = matched_signals / expected_signals (0 when no expected signals)
  "coverage": 0.80,

  // precision = TP / (TP + FP)  (0 when no alerts observed)
  "precision": 0.90,

  // True positives: alert rule names that fired AND appear in expectedSignals.
  "tp": 4,

  // False positives: alerts observed that are NOT in expectedSignals.
  "fp": 1,

  // Rule names (substrings) that fired and matched an expected signal.
  "matched_signals": ["Windows PowerShell"],

  // Expected rule names that did NOT fire within the wall budget.
  "unmatched_signals": [],

  // Machine-readable caveats (may be empty).
  // Possible values:
  //   "expected_signals_empty"   — payload library had no expected signal names
  //   "no_alerts_observed"       — no alerts matched the scenario within budget
  //   "only_false_positives"     — TP = 0, FP > 0
  //   "wall_budget_exceeded"     — telemetry collector timed out (partial score)
  //   "partial_dispatch"         — one or more payloads failed; others succeeded
  "caveats": [],

  // Actual polling duration in milliseconds.
  "poll_duration_ms": 14320,

  // ISO 8601 timestamps.
  "started_at": "2026-05-28T12:00:00.000Z",
  "completed_at": "2026-05-28T12:00:14.320Z"
}
```

### 4.1 Typed error responses

When the pipeline fails before producing a score, the tool returns a structured
error instead. The shape is `{ success: false, status_code, error_type, message }`.

| `error_type` | HTTP equivalent | When it occurs |
|---|---|---|
| `feature_disabled` | 403 | Flag not enabled in `enableExperimental` |
| `authentication_required` | 401 | No authenticated user on the request |
| `authorization_error` | 403 | Missing RBAC privilege, host not on allowlist |
| `rate_limit_exceeded` | 429 | Per-space or per-host rate limit hit |
| `concurrency_exceeded` | 429 | A run with the same fingerprint is already in-flight |
| `no_mitre_tags` | 422 | Rule has no `threat[].technique` entries |
| `no_supported_techniques` | 422 | None of the rule's techniques are in the Wave-1 library |
| `user_declined` | 403 | User cancelled the real_execution HITL confirmation prompt |
| `execution_error` | 500 | Unexpected internal pipeline failure (see Kibana logs) |

---

## 5. Inspecting injected documents (log_injection mode)

The injected ECS documents land in `.kibana-security-emulation-logs-<spaceId>-*`
(ILM-managed, auto-deleted after 7 days). Query them in Dev Tools:

```json
GET .kibana-security-emulation-logs-default-*/_search
{
  "query": {
    "term": { "kibana.alert.emulation.id": "<scenario_id from ValidationReport>" }
  },
  "_source": [
    "@timestamp",
    "event.category",
    "process.name",
    "process.command_line",
    "kibana.alert.emulation.id",
    "kibana.alert.emulation.mode"
  ]
}
```

---

## 6. Inspecting the history saved object

Each run persists a `detection-emulation-report` saved object. Query via the
Saved Objects Find API:

```sh
curl -s -u elastic:changeme \
  "http://localhost:5601/api/saved_objects/_find?type=detection-emulation-report&search_fields=ruleId&search=<rule-id>" \
  | jq '.saved_objects[] | {id: .id, confidence: .attributes.score.confidence, mode: .attributes.mode, startedAt: .attributes.startedAt}'
```

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `feature_disabled` in tool response | Feature flag absent from `kibana.dev.yml` | Add `detectionEmulationLogInjection` to `enableExperimental` and restart |
| `no_mitre_tags` for a known rule | Rule lacks `threat[].technique` entries | Edit the rule to add ATT&CK tags matching a Wave-1 technique |
| `no_supported_techniques` | Rule's ATT&CK technique is not in Wave-1 library | Use a rule with T1059.001, T1218.005, or another Wave-1 technique |
| `confidence: 0`, `caveats: ["no_alerts_observed"]` | Detection Engine did not fire the rule on injected events | Verify the rule is **enabled** in Security → Rules |
| `wall_budget_exceeded` caveat | Rule evaluation latency > default 60 s budget | Pass a longer `wallBudgetMs` (up to 300000) or increase `validation.wallBudgetMsDefault` |
| `authorization_error` for `real_execution` | User lacks `endpoint execute` privilege | Assign a role with the response-actions execute privilege, or use `log_injection` |
| Log-injection index missing | `detectionEmulationLogInjection` flag not set at start | Enable the flag and restart Kibana so the ILM template registers on `plugin.start()` |
