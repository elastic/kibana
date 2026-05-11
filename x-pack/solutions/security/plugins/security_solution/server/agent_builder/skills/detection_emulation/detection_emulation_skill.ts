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
    // The skill lives under `endpoint/` because the only wired agent type today
    // is `endpoint` — the runner dispatches Elastic Defend response actions.
    // (Re-home if/when the route grows multi-EDR support.)
    basePath: 'skills/security/endpoint',
    description: `Dispatch a single Elastic Security response action against one or more endpoints to validate that a detection rule fires as expected. Currently exposes one tool: \`runEmulationCommand\`. Real execution is gated behind a feature flag (\`xpack.securitySolution.enableExperimental.detectionEmulationRealExecution\`); when disabled the route returns 403. Only the \`endpoint\` agent type is wired up today; the other Response-Actions agent types will be added once external connector resolution lands.`,
    content: `# Detection Emulation Skill

## What this skill does

Calls a single, gated tool — \`runEmulationCommand\` — that dispatches one
Elastic Security response action to one or more endpoints. Used for
validating that a detection rule fires when a known technique runs.

This is the *only* tool the skill exposes. There is no \`validateRule\`,
no \`ValidationReport\`, no scenario generator, no phase orchestration.
Those are roadmap items, not capabilities — do not invent calls to them.

## Tool: \`runEmulationCommand\`

\`\`\`typescript
runEmulationCommand({
  emulationId: string,        // unique identifier for this emulation run
  agentType: 'endpoint',      // only 'endpoint' is wired up today
  endpointIds: string[],      // 1+ Elastic Defend agent IDs
  command: ResponseActionApiCommand,
  parameters?: Record<string, unknown>,  // command-specific (see table)
}) -> {
  action_id: string,
  agent_type: 'endpoint',
  command: string,
  status: 'dispatched' | 'error',
}
\`\`\`

### Supported commands and their parameters

| \`command\` | Required \`parameters\` | Notes |
|---|---|---|
| \`isolate\` | (none) | Network-isolate the host |
| \`unisolate\` | (none) | Lift network isolation |
| \`kill-process\` | \`pid: number\` *or* \`entity_id: string\` | One of the two is required |
| \`suspend-process\` | \`pid: number\` *or* \`entity_id: string\` | One of the two is required |
| \`running-processes\` | (none) | List processes |
| \`get-file\` | \`path: string\` | Absolute path on the host |
| \`execute\` | \`command: string\`, \`timeout?: number\` | Shell command |
| \`upload\` | \`file: File\`, \`overwrite?: boolean\` | Multipart |
| \`scan\` | \`path: string\` | YARA scan path |
| \`runscript\` | \`script: string\`, \`timeout?: number\` | Run a script |
| \`cancel\` | (none) | Cancel a pending action |
| \`memory-dump\` | \`pid: number\` *or* \`entity_id: string\` | One of the two is required |

\`parameters.comment\` (optional, any command): a human-readable note
attached to the response-actions audit comment.

## Gating

The route applies four gates in this order. If any fails the call
short-circuits with the corresponding HTTP status:

1. **Feature flag** — \`xpack.securitySolution.enableExperimental.detectionEmulationRealExecution\`
   must be \`true\`. Otherwise: 403.
2. **RBAC** — the caller must hold the per-command Endpoint privilege
   resolved via \`RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ\`. Otherwise: 403.
3. **Allowlist** — \`endpointIds\` must be permitted by the configured
   \`EmulationAllowlist\`. Otherwise: 403.
4. **Rate limit** — per-space sliding window. Otherwise: 429.

## What happens after dispatch

The skill does **not** poll for action results. It returns the
\`action_id\` from the underlying \`ResponseActionsClient.<command>(...)\`
call and exits. Use the standard Response Actions APIs / UI to inspect
results, or write a follow-up tool if you need polling here.

Generated alerts that you want to attribute to an emulation run can be
tagged via the \`tagAlertsWithEmulation\` helper (server-side); the UI
exposes a filter (\`Hide emulation alerts\`) on the alerts table so
analysts can opt out.

## Things this skill does NOT do (yet)

- Run \`sentinel_one\`, \`crowdstrike\`, or \`microsoft_defender_endpoint\` commands.
  The schema accepts \`agentType: 'endpoint'\` only until the route
  resolves the external \`connectorActions\` client.
- Generate attack scenarios, walk a MITRE ATT&CK graph, or compute
  confidence / TP / FP scores.
- Persist an emulation history index. Use the \`emulationRuleBindingType\`
  saved-object type if you need to associate a run with a rule.
- Tag alerts automatically. Call \`tagAlertsWithEmulation\` from your own
  code if you want emulation metadata on alerts.

## Notes for the agent

- Default to **not** calling this skill unless the user explicitly asks
  for "emulate" / "test rule against endpoint" / "run response action".
- The schema is strict: an unknown \`command\` or a missing required
  parameter returns 400.
- Each call dispatches exactly one action. Loop on the caller side if
  you need a multi-step scenario.
- Always include a \`parameters.comment\` describing why this action is
  being dispatched — it lands in the response-actions audit trail.
`,
    getInlineTools: () => [createRunEmulationCommandTool(ctx)],
  });
