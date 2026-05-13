# Detection Emulation Skill — Demo Guide

This guide covers enabling the feature flags locally, invoking `validateRule` through
the Agent Builder UI, and interpreting the `ValidationReport` response.

---

## 1. Enable feature flags in `kibana.dev.yml`

Both dispatch modes are gated by independent experimental flags. Add the flags that
match the mode you want to test.

### Log injection (safe — no real endpoints required)

```yaml
xpack.securitySolution.enableExperimental:
  - detectionEmulationLogInjection
```

### Real execution (requires enrolled Elastic Defend agents + endpoint RBAC)

```yaml
xpack.securitySolution.enableExperimental:
  - detectionEmulationRealExecution
```

### Both modes at once

```yaml
xpack.securitySolution.enableExperimental:
  - detectionEmulationLogInjection
  - detectionEmulationRealExecution
```

> **Note:** If neither flag is set, `validateRule` returns HTTP 403
> (`feature_disabled`) for either mode. The skill tool surfaces this as an
> error with `likely_cause: "Feature flag detectionEmulationLogInjection is not enabled."`.

Restart the Kibana dev server after editing `kibana.dev.yml`:

```bash
KBN_USE_RSPACK=true yarn start
```

---

## 2. Ensure the rule has MITRE ATT&CK tags

The scenario generator maps `rule.threat[].technique[].id` (and `.subtechnique[].id`)
against the payload library. The rule must have at least one technique tag from the
Wave-1 set:

| Technique | Name |
|---|---|
| T1059.001 | PowerShell |
| T1059.003 | Windows Command Shell |
| T1059.004 | Unix Shell |
| T1218.005 | Mshta |
| T1218.011 | Rundll32 |
| T1053.005 | Scheduled Task |
| T1547.001 | Registry Run Keys |
| T1057 | Process Discovery |
| T1003.001 | LSASS Memory |
| T1070.004 | File Deletion |
| T1071.001 | Web Protocols |
| T1112 | Modify Registry |

Rules with no `threat[]` entries return `no_mitre_tags` (422). Rules with tags that
don't match any library entry return `no_supported_techniques` (422).

To find a rule's ID: **Security → Rules → (open rule) → Rule details → Rule ID**.

---

## 3. Invoke `validateRule` from the Agent Builder UI

### Open Agent Builder

Navigate to **Security → AI Assistant → (manage agents)** and open the default agent
or any agent that includes the `detection-emulation` skill.

### Example prompts

**Basic validation (log injection):**
```
Validate my PowerShell detection rule (ID: <rule-uuid>) against host ws-001.
Tell me if it fires on T1059.001.
```

**Explicit mode:**
```
Test rule <rule-uuid> on endpoint <agent-id>. Use log injection mode.
```

**Budget override (slow cluster):**
```
Validate rule <rule-uuid> against host lab-1. Give it 3 minutes to collect results.
```

**Real execution:**
```
Run a live emulation for rule <rule-uuid> on endpoint <enrolled-agent-id>.
I need real endpoint execution, not log injection.
```
> This requires the `detectionEmulationRealExecution` flag and the caller to hold the
> endpoint execute RBAC privilege.

### What the skill does

1. Checks `getEmulationHistory` for recent runs before calling `validateRule`.
2. Calls `validateRule` with the extracted `ruleId`, `endpointIds`, and `mode`.
3. Polls Detection Engine alerts for up to 2 minutes (default `wallBudgetMs`).
4. Returns the confidence score with a plain-English interpretation.

---

## 4. Call the route directly (optional — for API testing)

```bash
curl -s -X POST \
  "http://localhost:5601/internal/detection_engine/emulation/validate_rule" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "elastic-api-version: 1" \
  -u elastic:changeme \
  -d '{
    "ruleId": "<rule-uuid>",
    "endpointIds": ["ws-001"],
    "mode": "log_injection"
  }'
```

---

## 5. ValidationReport response format

### Success

```jsonc
{
  "report_id":        "abc123",         // saved-object ID for audit / history lookup
  "scenario_id":      "sha256-<hex>",   // deterministic per (ruleId, mitreTechniques)
  "rule_id":          "<rule-uuid>",
  "mode":             "log_injection",
  "confidence":       0.72,             // weighted score, clamped [0, 1]
  "coverage":         0.80,             // matched / expected signals
  "precision":        0.60,             // TP / (TP + FP)
  "tp":               4,                // true-positive alert count
  "fp":               2,                // false-positive alert count
  "caveats":          [],               // empty = clean run (see below for caveat values)
  "matched_signals":  ["Windows PowerShell"],
  "unmatched_signals":[],
  "poll_duration_ms": 8234,
  "started_at":       "2025-01-15T10:00:00.000Z",
  "completed_at":     "2025-01-15T10:00:08.500Z"
}
```

**Confidence interpretation:**

| Range | Meaning |
|---|---|
| ≥ 0.80 | Rule fires reliably on covered techniques |
| 0.50 – 0.79 | Partial coverage — some expected signals did not fire |
| < 0.50 | Rule likely misses the attack; investigate `unmatched_signals` |

**Caveats (machine-readable edge-case flags):**

| Value | Meaning |
|---|---|
| `expected_signals_empty` | Payload library returned no expected signal names |
| `no_alerts_observed` | No alerts matched the scenario ID after polling |
| `only_false_positives` | Alerts fired but none matched any expected signal |

### Failure (tool result)

```jsonc
{
  "error_type": "no_mitre_tags",       // or no_supported_techniques, feature_disabled,
                                        //    authorization_error, execution_error
  "message":    "The rule has no MITRE ATT&CK technique tags.",
  "status_code": 422,
  "rule_id":    "<rule-uuid>"
}
```

| `error_type` | Cause | Fix |
|---|---|---|
| `feature_disabled` | Feature flag off | Add flag to `kibana.dev.yml`, restart |
| `no_mitre_tags` | Rule has no `threat[]` | Add ATT&CK technique tags to the rule |
| `no_supported_techniques` | No library payload for any tag | Use a Wave-1 technique |
| `authorization_error` | Not authenticated or missing RBAC | Log in; check endpoint RBAC for `real_execution` |
| `execution_error` | Internal pipeline failure | Check Kibana server logs |
