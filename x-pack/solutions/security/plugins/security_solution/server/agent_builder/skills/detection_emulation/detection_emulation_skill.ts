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
import { createRunProcessCommandTool } from './run_process_command_tool';
import { createRunFileCommandTool } from './run_file_command_tool';
import { createRunNetworkCommandTool } from './run_network_command_tool';
import { createRunExecutionCommandTool } from './run_execution_command_tool';
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
    description: `Validate Elastic Security detection rules by running attack emulation scenarios and measuring whether the rules fire on MITRE ATT&CK techniques. Provides tools to validate rules, review past emulation history, and dispatch low-level response actions (process, file, network, execution families) against endpoint agents.`,
    content: `# Detection Emulation Skill

> **Tool IDs:** when the LLM judge or downstream consumers reference these tools by their canonical registered IDs:
> - \`validateRule\` → \`security.detection-emulation.validate-rule\`
> - \`getEmulationHistory\` → \`security.detection-emulation.get-history\`
> - \`runProcessCommand\` → \`security.detection-emulation.run-process-command\`
> - \`runFileCommand\` → \`security.detection-emulation.run-file-command\`
> - \`runNetworkCommand\` → \`security.detection-emulation.run-network-command\`
> - \`runExecutionCommand\` → \`security.detection-emulation.run-execution-command\`

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
1. Call \`validateRule\` with \`mode: 'real_execution'\` and real enrolled \`endpointIds\`.
2. The agent-builder framework automatically prompts the user for confirmation
   before any live response actions are dispatched (no prose persuasion needed).
   If the user declines, the tool returns a \`user_declined\` error — do **not**
   retry; surface the cancellation and continue with unrelated work.
3. Report the same output fields once the run completes.

### Low-level command dispatch

Use the per-family \`run*Command\` tools only when the user needs to fire a specific
response action outside of a full \`validateRule\` flow (e.g. testing a single
\`execute\` command by hand). Do not use them as a substitute for \`validateRule\` —
they do not score, collect telemetry, or write history.

Pick the right family by the command:
- **Process** (\`runProcessCommand\`): \`kill-process\`, \`suspend-process\`,
  \`running-processes\`, \`memory-dump\`.
- **File** (\`runFileCommand\`): \`get-file\`, \`scan\`, \`upload\`.
- **Network** (\`runNetworkCommand\`): \`isolate\`, \`unisolate\`.
- **Execution** (\`runExecutionCommand\`): \`execute\`, \`runscript\`, \`cancel\`.

Each family has a typed \`parameters\` shape — the tool schema documents what the
specific command requires (no free-form parameter records).

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
1. \`validateRule({ ruleId: 'abc-123', endpointIds: ['<real-id>'], mode: 'real_execution' })\`
2. The framework prompts the user; if they cancel, acknowledge and stop.
3. If accepted, report confidence + matched/unmatched signals once the run finishes.

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

\`agentType\` defaults to \`endpoint\` and currently only \`endpoint\` is wired end-to-end
for \`real_execution\` (the synthesizer pipeline lacks per-vendor command translation
for \`sentinel_one\`, \`crowdstrike\`, and \`microsoft_defender_endpoint\`). Omit the
field unless you are explicitly targeting a non-Elastic-Defend integration that has
been confirmed to be available — otherwise the call will be rejected upstream.

Returns \`no_mitre_tags\` (422) if the rule has no ATT\&CK technique tags, or
\`no_supported_techniques\` (422) if none of the tags map to a library payload.

### \`getEmulationHistory\`

Returns past validation runs for a rule, newest-first.

**Output:** \`items[].confidence\`, \`items[].mode\`, \`items[].payload_ids\`,
\`items[].started_at\`, \`items[].operator\`, \`total\`.

Results are space-scoped — reports from other spaces are not visible.

### \`runProcessCommand\` / \`runFileCommand\` / \`runNetworkCommand\` / \`runExecutionCommand\`

Each of the four \`run*Command\` tools dispatches a single Elastic Security response
action to one or more Elastic Defend endpoints. Returns \`action_id\` and \`status\`;
does **not** poll for results.

Currently only the \`endpoint\` agent type is wired — \`sentinel_one\`, \`crowdstrike\`, and
\`microsoft_defender_endpoint\` are not yet supported until external connector resolution
lands. Do not attempt to dispatch against these agent types; the call will fail with 400.

**Per-family commands and required \`parameters\` shapes (validated by Zod):**

| Tool | \`command\` | Required \`parameters\` |
|---|---|---|
| \`runProcessCommand\` | \`kill-process\` | \`pid: number\` *or* \`entity_id: string\` |
| \`runProcessCommand\` | \`suspend-process\` | \`pid: number\` *or* \`entity_id: string\` |
| \`runProcessCommand\` | \`running-processes\` | (optional \`comment\`) |
| \`runProcessCommand\` | \`memory-dump\` | \`pid: number\` *or* \`entity_id: string\` |
| \`runFileCommand\` | \`get-file\` | \`path: string\` |
| \`runFileCommand\` | \`scan\` | \`path: string\` |
| \`runFileCommand\` | \`upload\` | \`file: opaque\`, \`overwrite?: boolean\` |
| \`runNetworkCommand\` | \`isolate\` | (optional \`comment\`) |
| \`runNetworkCommand\` | \`unisolate\` | (optional \`comment\`) |
| \`runExecutionCommand\` | \`execute\` | \`command: string\`, \`timeout?: number\` |
| \`runExecutionCommand\` | \`runscript\` | \`scriptId: string\`, \`scriptInput?: string\`, \`timeout?: number\` |
| \`runExecutionCommand\` | \`cancel\` | \`id: string\` |

The schema is a discriminated union on \`command\`, so misspelled fields, extra keys,
or wrong types fail fast with a Zod error before reaching the EDR connector.

\`parameters.comment\` (optional, where supported): attached to the response-actions
audit trail.

## Guardrails

Guards applied by each tool (in order; first failure short-circuits). The four
\`run*Command\` tools share the same gate sequence (centralised in
\`with_command_gates.ts\`):

| Guard | \`validateRule\` | \`getEmulationHistory\` | \`run*Command\` (all four) |
|---|---|---|---|
| Feature flag (static) | ✓ (per-mode) | — | ✓ (realExecution) |
| **Runtime kill switch** | ✓ (real_execution) | — | ✓ |
| Auth required | ✓ | — | ✓ |
| RBAC | ✓ (real_execution) | — | ✓ (per-command) |
| Allowlist | ✓ (real_execution) | — | ✓ |
| **Endpoint fanout cap (5/call)** | ✓ (schema-enforced, both modes) | — | ✓ (schema-enforced) |
| **HITL prompt** | ✓ (real_execution; on-demand, skipped in standalone mode) | — | ✓ (declarative, once per conversation) |
| Rate limit (per-space) | ✓ (real_execution, 1 slot/scenario; 100/space/hour) | — | ✓ (1 slot/command; 100/space/hour) |
| **Rate limit (per-host)** | ✓ (real_execution; 3/host/hour) | — | ✓ (3/host/hour) |
| **Concurrency gate** | ✓ (real_execution; ≤ 1 in flight per Kibana space) | — | — |

Feature flags: \`detectionEmulationLogInjection\` gates log_injection;
\`detectionEmulationRealExecution\` gates real_execution and all four
\`run*Command\` tools. Both ship dark by default and require a Kibana
restart to flip.

**Runtime kill switch.**
\`xpack.securitySolution.detectionEmulation.realExecutionEnabled\` defaults
to \`true\`. Operators flip it to \`false\` via \`kibana.yml\` reload (no
restart) to halt new \`real_execution\` dispatches in response to anomalous
behaviour. When the kill switch is engaged, \`validateRule\` and the four
\`run*Command\` tools return a 403 whose \`likely_cause\` reports
\`runtime_kill_switch_engaged\` so operators know to flip the runtime
knob — not restart Kibana.

**HITL behaviour** is enforced by the agent-builder framework, not by skill
prose. \`validateRule\` uses an on-demand prompt so the safe \`log_injection\`
mode never asks; the four \`run*Command\` tools use declarative
\`{ askUser: 'once' }\` so a single confirmation covers the whole conversation.
Both surfaces honour \`executionMode === 'standalone'\` (sub-agent / eval / A2A
runs) by skipping the prompt — RBAC + allowlist remain in force.

**Allowlist is default-deny.** When no operator config is supplied
(\`xpack.securitySolution.detectionEmulation.allowlist\`), every endpoint is
blocked from \`real_execution\` — the tool will return an
\`authorization_error\` naming the blocked hosts. Operators must opt
endpoints into the allowlist explicitly. The previous experimental default
(\`allowAll: true\`) is still available for test fixtures via
\`createTestAllowlistConfig()\` but is intentionally absent from production
construction paths.

**Audit attribution.** Every dispatched response action carries an
\`actor\` block describing who triggered it. Tool invocations are tagged
\`actor.kind: 'agent-builder'\` plus \`conversationId\` / \`executionId\` /
\`runId\` / \`toolCallId\` IDs from the agent runtime; direct REST calls are
tagged \`actor.kind: 'user'\`. The same block is persisted on the
\`detection-emulation-report\` Saved Object (model version \`2\`) and embedded
in the response action's audit comment as a \`[via=agent-builder ...]\`
suffix, so an auditor can pivot from a single response action back to the
exact conversation and tool call that produced it. Legacy v1 reports are
backfilled to \`actor: { kind: 'user' }\` on first read.

**Endpoint fanout cap.** A single \`validateRule\` or
\`run*Command\` call may target at most **5** endpoints
(\`MAX_ENDPOINT_FANOUT\`). The cap is enforced by the central Zod schema
shared between the tool boundary and the REST routes, so an oversized
\`endpointIds\` array is rejected at request-validation time (HTTP 400 from
the route, \`invalid_input\` from the tool) before any downstream gate
runs. The bound exists because a single \`validateRule\` already fans out
to N (payloads) × M (endpoints) response-action dispatches; capping M
keeps a single call from N-multiplying the per-host rate budget. If a
user asks to validate against more endpoints, suggest splitting the
request, or use \`mode: 'log_injection'\` (which writes synthetic ECS
docs and doesn't dispatch real response actions — but is still subject
to the same cap to keep behaviour predictable across modes).

**Per-host rate limit.** In addition to the per-space window
(100/hour), each enrolled endpoint has its own bucket of **3
real-execution dispatches per hour**. A call targeting endpoints whose
buckets are saturated is rejected atomically (per-space slot rolled back
before responding) with HTTP 429 + \`blocked_endpoints\` listing every
host at capacity. The bound matches the lower end of major EDR vendors'
documented response-action queue depth before host-side backpressure
kicks in; raising it requires confirming the target vendor can absorb
the load AND raising \`MAX_ENDPOINT_FANOUT\` (the endpoint fanout cap) in
lockstep, since the realistic ceiling on a single emulation is fanout
× per-host. When
a 429 names \`blocked_endpoints\`, suggest the user either (a) wait
for the per-host window to roll, (b) target different hosts, or (c)
switch to \`mode: 'log_injection'\` which is exempt from per-host
limiting (it does not touch the host).

**Concurrency gate.** \`validateRule\` in \`real_execution\` mode
allows **at most one in-flight scenario per Kibana space**. The gate
sits AFTER the allowlist + rate limiters (cheap rejects already drained)
and AFTER scenario generation (we need a fingerprint to attribute the
slot) but BEFORE dispatch, so concurrent scenarios cannot N-multiply
host-side response-action queues even when per-space and per-host
budgets would otherwise allow it. A second concurrent call returns HTTP
429 with \`reason: concurrency_exceeded\`, the
\`inflight_scenario_fingerprint\` of the in-flight scenario, and a
\`retry_after_seconds\` hint. The slot is released on every exit path
(success, scenario-failure, thrown error); a stale-entry sweeper
(default 10 min) backstops process crashes that bypass the catch.
\`log_injection\` and the four \`run*Command\` tools are intentionally
not gated — log injection does not touch the host, and per-family
commands are already bounded by the per-host rate limit. When a
429 names \`concurrency_exceeded\`, suggest waiting until the in-flight
scenario completes (the fingerprint is included so the operator can
correlate the run in audit logs) or retrying after the
\`retry_after_seconds\` hint.

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
      createValidateRuleTool(ctx),
      createGetEmulationHistoryTool(ctx),
      createRunProcessCommandTool(ctx),
      createRunFileCommandTool(ctx),
      createRunNetworkCommandTool(ctx),
      createRunExecutionCommandTool(ctx),
    ],
  });
