# Detection Emulation — Demo Guide

End-to-end walkthrough for demonstrating the `validateRule` Agent Builder skill
against a candidate detection rule.

---

## 1. Enable the feature flags

Add to `config/kibana.dev.yml` (both flags default to `false`):

```yaml
xpack.securitySolution.enableExperimental:
  - detectionEmulationRealExecution    # required for real_execution mode (substrate)
  - detectionEmulationLogInjection     # required for log_injection mode (default mode of validateRule)
```

Optional tuning (defaults are sane):

```yaml
xpack.securitySolution.detectionEmulation:
  logInjection:
    indexTemplateName: .kibana-security-emulation-logs
    retentionDays: 7
  validation:
    wallBudgetMsDefault: 120000
    wallBudgetMsMax: 300000
```

Restart Kibana. On `start()` the plugin registers the
`.kibana-security-emulation-logs-<spaceId>-*` index template and the
`detection-emulation-report` saved object type.

---

## 2. Pick a rule to validate

Any prebuilt rule with at least one MITRE technique that overlaps the
Wave-1 payload library:

| ATT&CK technique | Wave-1 payload | Example rule |
|---|---|---|
| T1059.001 PowerShell | yes | "Windows PowerShell" |
| T1059.003 cmd.exe | yes | "Suspicious cmd.exe Activity" |
| T1218.011 rundll32 | yes | "Suspicious rundll32 Activity" |
| T1003.001 LSASS dump | yes | "LSASS Memory Dump" |
| T1547.001 RegRun keys | yes | "Persistence via Registry Run Keys" |

Copy its rule UUID (`security_solution > Detections > Rules > details`).

---

## 3. Call `validateRule` from Agent Builder

In the Agent Builder UI, ask:

> "Validate detection rule `<ruleId>` against endpoint `<endpointId>` using log injection."

The skill auto-routes to the `validateRule` tool with:

```json
{
  "ruleId": "<rule-uuid>",
  "endpointIds": ["<endpoint-id>"],
  "mode": "log_injection",
  "wallBudgetMs": 120000
}
```

Mode defaults to `log_injection` when omitted. Real EDR dispatch requires
`mode: "real_execution"` AND the rule's payloads on the endpoint allowlist.

---

## 4. Expected `ValidationReport` response

```json
{
  "scenarioId": "a3f1e8b7…",
  "ruleId": "<rule-uuid>",
  "mode": "log_injection",
  "score": {
    "confidence": 0.78,
    "coverage": 0.83,
    "precision": 0.71,
    "tp": 5,
    "fp": 2,
    "perPhase": [
      { "techniqueId": "T1059.001", "matched": true, "alertCount": 3 },
      { "techniqueId": "T1003.001", "matched": false, "alertCount": 0 }
    ],
    "caveats": []
  },
  "dispatchedActions": [{ "techniqueId": "T1059.001", "actionId": "log-injection:…" }],
  "observedAlerts": [
    { "alertId": "…", "ruleName": "Windows PowerShell", "@timestamp": "…" }
  ],
  "startedAt": "2026-05-13T04:18:00.000Z",
  "completedAt": "2026-05-13T04:19:33.412Z",
  "historyId": "abc-123-def"
}
```

`historyId` references the persisted `detection-emulation-report` saved
object — query it via the `getEmulationHistory` skill tool.

---

## 5. Common error responses

| HTTP | `errorCode` | When |
|---|---|---|
| 403 | `feature_flag_disabled` | mode requires a flag that's off |
| 403 | `endpoint_not_allowed` | endpointId not on substrate allowlist |
| 422 | `no_mitre_tags` | rule has no MITRE techniques |
| 422 | `no_supported_techniques` | rule MITRE tags don't intersect Wave-1 |
| 404 | `rule_not_found` | ruleId doesn't resolve |
| 429 | `rate_limit_exceeded` | substrate rate limiter (1 rps) |
| 200 + caveat | `wall_budget_exceeded` | partial result, score includes whatever fired |
| 500 | `es_bulk_error` | log_injection ES write failure |

---

## 6. Verify via `getEmulationHistory`

In the Agent Builder UI:

> "Show recent emulation runs for rule `<ruleId>`."

Returns paginated history of `detection-emulation-report` saved objects
filtered by `ruleId` and current spaceId.

---

## 7. Cleanup (optional)

Log injection writes to `.kibana-security-emulation-logs-<spaceId>-*` with
a 7-day ILM delete policy. To reclaim disk before then:

```bash
DELETE .kibana-security-emulation-logs-<spaceId>-*
```

Saved objects are retained — they're the audit trail for compliance.
