/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { ConfigType } from '../../../config';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { createRunEmulationCommandTool } from './run_emulation_command_tool';
import { createValidateRuleTool } from './validate_rule_tool';
import { createGetEmulationHistoryTool } from './get_emulation_history_tool';

export interface DetectionEmulationSkillContext {
  core: SecuritySolutionPluginCoreSetupDependencies;
  endpointService: EndpointAppContextService;
  config: ConfigType;
  logger: Logger;
}

export const getDetectionEmulationSkill = (ctx: DetectionEmulationSkillContext) =>
  defineSkillType({
    id: 'detection-emulation',
    name: 'detection-emulation',
    basePath: 'skills/security/endpoint',
    description: `Validate Elastic Security detection rules by running attack emulation scenarios and measuring whether the rules fire. Exposes three tools: \`validateRule\` (full 8-step pipeline — scenario generation, dispatch, telemetry collection, confidence scoring, history write), \`getEmulationHistory\` (retrieve past validation runs for a rule), and \`runEmulationCommand\` (dispatch a single low-level response action against endpoint agents). Both log-injection (safe, no real endpoints) and real-execution modes are supported; each is gated by an independent feature flag (\`detectionEmulationLogInjection\` / \`detectionEmulationRealExecution\`).`,
    content: `# Detection Emulation Skill

## When to Use

Use this skill when the user asks to:
- Validate, test, or score a detection rule against a known attack technique
- Check whether a rule fires on MITRE ATT\&CK techniques mapped to its tags
- Review the history of past emulation runs for a rule ("has this rule improved?")
- Run a specific low-level response action against an endpoint (advanced use)

Do **not** use this skill for:
- General alert investigation or threat hunting (no emulation involved)
- Modifying or creating rules (use detection rule management tools)
- Checking rule syntax or ES|QL correctness

## Process

### Standard flow: validate a rule

1. **Check history first** — Call \`getEmulationHistory\` with the \`ruleId\`. If recent
   runs already show high confidence, tell the user and ask whether to re-run.
2. **Run validation** — Call \`validateRule\` with \`mode: 'log_injection'\` (safe default;
   no real endpoints touched). For \`endpointIds\`, log_injection accepts any non-empty
   string — use the relevant host name or a synthetic ID like \`"emulation-host-1"\`.
3. **Present results** — Report \`confidence\`, \`coverage\`, \`precision\`, \`tp\`, \`fp\`,
   \`matched_signals\`, \`unmatched_signals\`, and link the \`report_id\` for audit.

### When log_injection confidence is insufficient

If \`confidence < 0.5\` and the user explicitly requests real execution:
1. Confirm the user has the required privileges and understands the risks.
2. Call \`validateRule\` with \`mode: 'real_execution'\` and real enrolled \`endpointIds\`.
3. Report the same output fields.

### Low-level command dispatch

Use \`runEmulationCommand\` only when the user needs to fire a specific response action
outside of a full \`validateRule\` flow (e.g. testing a single \`execute\` command by hand).
Do not use it as a substitute for \`validateRule\` — it does not score, collect telemetry,
or write history.

## Examples

**Validate a rule:**
> "Test my PowerShell rule (ID: abc-123) against host ws-001"
1. \`getEmulationHistory({ ruleId: 'abc-123' })\` — check prior runs
2. \`validateRule({ ruleId: 'abc-123', endpointIds: ['ws-001'], mode: 'log_injection' })\`
3. Report confidence score and which signals fired / missed

**Show history:**
> "Show me the last 10 emulation runs for rule abc-123"
1. \`getEmulationHistory({ ruleId: 'abc-123', limit: 10 })\`
2. Summarise: confidence range, trend, any regressions

**Re-run with real execution:**
> "Re-validate rule abc-123 with live endpoints"
1. Confirm user intent + privilege
2. \`validateRule({ ruleId: 'abc-123', endpointIds: ['<real-id>'], mode: 'real_execution' })\`

## Tools

### \`validateRule\`

Runs the full validation pipeline and returns a confidence score:
1. Feature flag gate
2. Auth check (emulation is always attributable)
3. RBAC check (real_execution only)
4. Scenario generation from MITRE ATT\&CK tags
5. Dispatch (log_injection or real_execution)
6. Telemetry collection (polls Detection Engine alerts up to \`wallBudgetMs\`)
7. Confidence scoring: \`confidence = coverage × 0.6 + precision × 0.4\`, clamped [0, 1]
8. History write

**Output:** \`confidence\`, \`coverage\`, \`precision\`, \`tp\`, \`fp\`, \`caveats\`,
\`matched_signals\`, \`unmatched_signals\`, \`report_id\`, \`poll_duration_ms\`.

Returns \`no_mitre_tags\` (422) if the rule has no ATT\&CK technique tags, or
\`no_supported_techniques\` (422) if none of the tags map to a library payload.

### \`getEmulationHistory\`

Returns past validation runs for a rule, newest-first.

**Output:** \`items[].confidence\`, \`items[].mode\`, \`items[].payload_ids\`,
\`items[].started_at\`, \`items[].operator\`, \`total\`.

Results are space-scoped — reports from other spaces are not visible.

### \`runEmulationCommand\`

Dispatches a single Elastic Security response action to one or more Elastic Defend
endpoints. Returns \`action_id\` and \`status\`; does **not** poll for results.

Currently only the \`endpoint\` agent type is wired — \`sentinel_one\`, \`crowdstrike\`, and
\`microsoft_defender_endpoint\` are not yet supported until external connector resolution lands.
Do not attempt to dispatch against these agent types; the call will fail with 400.

**Supported commands and required parameters:**

| \`command\` | Required \`parameters\` |
|---|---|
| \`isolate\` | (none) |
| \`unisolate\` | (none) |
| \`kill-process\` | \`pid: number\` *or* \`entity_id: string\` |
| \`suspend-process\` | \`pid: number\` *or* \`entity_id: string\` |
| \`running-processes\` | (none) |
| \`get-file\` | \`path: string\` |
| \`execute\` | \`command: string\`, \`timeout?: number\` |
| \`upload\` | \`file: File\`, \`overwrite?: boolean\` |
| \`scan\` | \`path: string\` |
| \`runscript\` | \`script: string\`, \`timeout?: number\` |
| \`cancel\` | (none) |
| \`memory-dump\` | \`pid: number\` *or* \`entity_id: string\` |

\`parameters.comment\` (optional, any command): attached to the response-actions audit trail.

## Guardrails

Guards applied by each tool (in order; first failure short-circuits):

| Guard | \`validateRule\` | \`getEmulationHistory\` | \`runEmulationCommand\` |
|---|---|---|---|
| Feature flag | ✓ (per-mode) | — | ✓ (realExecution) |
| Auth required | ✓ | — | ✓ |
| RBAC (real_execution) | ✓ | — | ✓ (per-command) |
| Allowlist | ✓ (real_execution) | — | ✓ |
| Rate limit | ✓ (real_execution, 1 slot/scenario) | — | ✓ (1 slot/command) |

Feature flags: \`detectionEmulationLogInjection\` gates log_injection;
\`detectionEmulationRealExecution\` gates real_execution and \`runEmulationCommand\`.

## Response Format

Always include in your response to the user:
- **Confidence score** (0–1) with a plain-English interpretation:
  - ≥ 0.8 → rule fires reliably on covered techniques
  - 0.5–0.79 → partial coverage — some expected signals did not fire
  - < 0.5 → rule likely misses the attack; investigate \`unmatched_signals\`
- **Matched signals** — rule names that fired as expected
- **Unmatched signals** — expected rule names that did not fire (flag for investigation)
- **Report ID** — for audit trail reference (\`report_id\`)
- **Caveats** — surface any entries from the \`caveats\` array (scoring edge cases)
`,
    getInlineTools: () => [
      createRunEmulationCommandTool(ctx),
      createValidateRuleTool(ctx),
      createGetEmulationHistoryTool(ctx),
    ],
  });
