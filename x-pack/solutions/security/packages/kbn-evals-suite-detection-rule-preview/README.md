# Detection rule preview converse evals (scaffold)

Multi-model `@kbn/evals` suite for `detection-rule-edit` + `security.run_rule_preview` CLI hardening.

## Matrix

8 cases = 4 connectors × 2 prompt modes:

| Model | Connector |
|---|---|
| Claude Sonnet 5 | `.anthropic-claude-5-sonnet-chat_completion` |
| Claude Haiku 4.5 | `.anthropic-claude-4.5-haiku-chat_completion` |
| Gemini 2.5 Flash | `.google-gemini-2.5-flash-chat_completion` |
| GPT-5.4 Mini | `.openai-gpt-5.4-mini-chat_completion` |

Prompt modes: **vague** (no index) and **indexed** (`logs-endpoint.events.process-default`).

## Graders

- `SkillInvoked` — `detection-rule-edit` loaded
- `RunRulePreviewCalled` — `security.run_rule_preview` invoked
- `PreviewUsesCommand` — first preview uses CLI `command`, not `rule` object
- `FirstPreviewNoError` — first preview tool result is not `error`
- `PreviewAlertCount` — ES count for `previewId` ≥ 1 (after seed)
- `RenderAttachment` — response includes preview `<render_attachment>`

## Prerequisites

- Kibana with `rulePreviewAttachmentEnabled` and EIS inference connectors
- Scout ES with `logs-endpoint.events.process-default` writable
- `beforeAll` seeds 8 `event.outcome: failure` docs (last hour)

## Run (focused)

```bash
cd ~/Projects/kibana.worktrees/daybreak-spike
node scripts/evals run \
  --suite x-pack/solutions/security/packages/kbn-evals-suite-detection-rule-preview/evals/rule_preview_converse.spec.ts \
  --grep "multi-model" \
  --repetitions 1
```

After adding the package, regenerate `package-map.json` if typecheck cannot resolve the new package:

```bash
node scripts/regenerate_package_map.mjs
```

## Related

- Handoff: `x-pack/solutions/security/plugins/daybreak/docs/handoff-run-rule-preview-cli-fixes.md`
- Parser hardening: `normalizeEsqlPreviewQuery` in `parse_rule_preview_command.ts`
