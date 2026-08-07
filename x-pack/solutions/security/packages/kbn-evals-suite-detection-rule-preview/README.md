# Detection rule preview converse evals

`@kbn/evals` suite for `detection-rule-edit` + `security.run_rule_preview` CLI hardening.

> **Suite type: gate (not statistical quality).** This suite uses 2 examples to verify the end-to-end CLI path works (skill loads, tool is called with the right shape, preview returns alerts, attachment renders). Scores from this suite should be used for pass/fail gating, not aggregated into the continuous quality matrix alongside larger suites.

## What it tests

Two prompt modes exercised per connector:

- **vague** — asks for an ES|QL detection rule without naming the index; the model must discover `logs-endpoint.events.process-default` and use the CLI preview syntax.
- **indexed** — names the index explicitly; the model must create the rule attachment then preview it via CLI command string.

## Models / connectors

Connectors are discovered dynamically by the `@kbn/evals` framework from the Scout Playwright project config (sourced from `kibana.yml` / `kibana.dev.yml` via `getAvailableConnectors()`). One Playwright project is created per available connector, so every configured model is exercised automatically — no hardcoded model list.

## Graders

**Code-based (deterministic):**

- `SkillInvoked` — `detection-rule-edit` loaded
- `RunRulePreviewCalled` — `security.run_rule_preview` invoked
- `PreviewUsesCommand` — first preview uses CLI `command`, not `rule` object
- `FirstPreviewNoError` — first preview tool result is not `error`
- `PreviewAlertCount` — ES count for `previewId` >= 1 (after seed)
- `RenderAttachment` — response includes preview `<render_attachment>`

**Trace-based (operational metrics):**

- `ToolCalls`, `Latency`, `InputTokens`, `OutputTokens`, `CachedTokens`

## Prerequisites

- Scout config set `evals_rule_preview` (enables `rulePreviewAttachmentEnabled` + `agentBuilder:experimentalFeatures`)
- EIS connectors configured via CCM in Elasticsearch (discovered automatically by the framework)
- Scout ES with `logs-endpoint.events.process-default` writable
- `beforeAll` seeds 8 `event.outcome: failure` docs (last hour)

## Run

```bash
node scripts/evals run \
  --suite x-pack/solutions/security/packages/kbn-evals-suite-detection-rule-preview/evals/rule_preview_converse.spec.ts \
  --grep "vague + indexed" \
  --repetitions 1
```

After adding the package, regenerate `package-map.json` if typecheck cannot resolve the new package:

```bash
node scripts/regenerate_package_map.mjs
```

## Related

- Parser hardening: `normalizeEsqlPreviewQuery` in `parse_rule_preview_command.ts`
