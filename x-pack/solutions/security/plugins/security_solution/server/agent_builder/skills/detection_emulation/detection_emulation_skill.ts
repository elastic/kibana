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
import type { DetectionEmulationGuardrails } from '../../../lib/detection_emulation/execution/shared_guardrails';
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
  /**
   * Shared guardrail bundle constructed in `plugin.ts` and threaded through
   * here so all five inline tool factories share the SAME allowlist set,
   * the SAME per-space + per-host rate-limit windows, and the SAME
   * concurrency gate as the two REST routes. Without this, each tool
   * factory used to instantiate its own pair, multiplying the advertised
   * 100/space/hour budget by the number of dispatch surfaces.
   */
  guardrails: DetectionEmulationGuardrails;
}

export const getDetectionEmulationSkill = (ctx: DetectionEmulationSkillContext) =>
  defineSkillType({
    id: 'detection-emulation',
    name: 'detection-emulation',
    basePath: 'skills/security/endpoint',
    description: `Validate Elastic Security detection rules by running attack emulation scenarios and measuring whether the rules fire on MITRE ATT&CK techniques. Provides tools to validate rules, review past emulation history, and dispatch low-level response actions (process, file, network, execution families) against endpoint agents.`,
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

1. **Check history first** — Call \`security.detection-emulation.get-history\` with the \`ruleId\`. If recent
   runs already show high confidence, tell the user and ask whether to re-run.
2. **Run validation** — Call \`security.detection-emulation.validate-rule\` with \`mode: 'log_injection'\` (safe default;
   no real endpoints touched). For \`endpointIds\`, log_injection accepts any non-empty
   string — use the relevant host name or a synthetic ID like \`"emulation-host-1"\`.
3. **Present results** — Report \`confidence\`, \`coverage\`, \`precision\`, \`tp\`, \`fp\`,
   \`matched_signals\`, \`unmatched_signals\`, and link the \`report_id\` for audit.

If \`confidence < 0.5\` and the user explicitly requests real execution, re-run with
\`mode: 'real_execution'\` and real enrolled \`endpointIds\`. The framework prompts the
user once per scenario; if they decline, surface the cancellation and continue with
unrelated work — do **not** retry.

### Low-level command dispatch

Use the per-family tools (\`security.detection-emulation.run-process-command\`,
\`security.detection-emulation.run-file-command\`,
\`security.detection-emulation.run-network-command\`,
\`security.detection-emulation.run-execution-command\`) only when the user needs to fire a specific
response action outside of a full validation flow (e.g. testing a single
\`execute\` command by hand). They do not score, collect telemetry, or write history,
so they are not a substitute for \`security.detection-emulation.validate-rule\`.

## Examples

**Validate a rule:**
> "Test my PowerShell rule (ID: abc-123) against host ws-001"
1. \`security.detection-emulation.get-history({ ruleId: 'abc-123' })\` — check prior runs
2. \`security.detection-emulation.validate-rule({ ruleId: 'abc-123', endpointIds: ['ws-001'], mode: 'log_injection' })\`
3. Report confidence score and which signals fired / missed

**Show history:**
> "Show me the last 10 emulation runs for rule abc-123"
1. \`security.detection-emulation.get-history({ ruleId: 'abc-123', limit: 10 })\`
2. Summarise: confidence range, trend, any regressions

**Re-run with real execution:**
> "Re-validate rule abc-123 with live endpoints"
1. \`security.detection-emulation.validate-rule({ ruleId: 'abc-123', endpointIds: ['<real-id>'], mode: 'real_execution' })\`
2. The framework prompts the user; if they cancel, acknowledge and stop.
3. If accepted, report confidence + matched/unmatched signals once the run finishes.

## Scheduled / Alerted Use

For "validate this rule every night" or "validate when this rule itself fires
in production", wrap \`security.detection-emulation.validate-rule\` in a workflow rather than orchestrating
inside this skill — see the bundled \`detection_rule_periodic_validation\`
example (workflow-authoring skill → \`getExamples({ search: 'detection-emulation' })\`).

## Operator Guardrails (informational)

These are enforced by the framework — you do not need to check them yourself, but
explain them when an error references them:

- **Default-deny allowlist.** \`real_execution\` is blocked unless the operator
  populates \`xpack.securitySolution.detectionEmulation.allowlist\` (or the matching
  Advanced Setting). On rejection, the response names the blocked hosts.
- **Endpoint fanout cap.** A single call may target at most 5 endpoints. Larger
  arrays fail at request validation; suggest splitting the request.
- **Per-space + per-host rate limits.** 100 dispatches/space/hour and 3/host/hour.
  A 429 response names \`blocked_endpoints\` (per-host) or returns a
  \`reset_ms\` hint (per-space). Suggest waiting, switching hosts, or using
  \`log_injection\` (which is exempt from per-host limiting).
- **Concurrency gate.** Only one \`real_execution\` validation scenario per
  space at a time. A 429 with \`reason: concurrency_exceeded\` includes
  \`retry_after_seconds\`; suggest waiting.
- **HITL.** Real-execution paths require user confirmation (handled
  declaratively by the framework). \`log_injection\` does not prompt.

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
    /**
     * Referenced content for MITRE ATT&CK technique documentation.
     *
     * Inspired by andrew-goldstein's `referencedContent` pattern in the
     * Skills PR (#260811), which attaches external reference documents to
     * skill definitions so the LLM can ground its reasoning in canonical
     * sources without relying on parametric knowledge.
     *
     * Each entry maps a content key (used in tool descriptions and
     * `content` to cite via `{{ref:key}}`) to a markdown document. The
     * Agent Builder framework injects referenced content into the LLM
     * context when the skill is activated, giving the model access to
     * technique descriptions, tactic mappings, and known emulation
     * payloads without stuffing them into every tool's system prompt.
     */
    referencedContent: [
      {
        name: 'mitre-attack-overview',
        relativePath: '.',
        content: `# MITRE ATT&CK Technique Reference

## Supported Technique Families

The detection emulation library organises payloads by MITRE ATT&CK tactic/technique family:

| Family       | Tactic            | Example Techniques                          |
|------------- |------------------ |-------------------------------------------- |
| Process      | Execution         | T1059 (Command and Scripting Interpreter)   |
| File         | Defense Evasion   | T1070 (Indicator Removal), T1036 (Masquerading) |
| Network      | Command & Control | T1071 (Application Layer Protocol)          |
| Execution    | Execution         | T1053 (Scheduled Task/Job), T1569 (System Services) |

## Interpreting Confidence Scores

- **Coverage** = fraction of the rule's mapped techniques that the library has payloads for.
- **Precision** = TP / (TP + FP) — how many alerts the rule raised were true positives.
- **Confidence** = harmonic mean of coverage and precision, penalised by unmatched signals.

A confidence of 1.0 means: every mapped technique was emulated, every expected signal fired,
and no unexpected alerts were raised.

## Modes

- **log_injection** — Injects synthetic log documents that mimic attack telemetry.
  Safe, fast, no real endpoints needed. Cannot test response-action–dependent rules.
- **real_execution** — Dispatches response actions to real enrolled Elastic Agents.
  Requires allowlist, RBAC, rate limits, concurrency gate, and HITL confirmation.
`,
      },
    ],
    getInlineTools: () => [
      createValidateRuleTool(ctx),
      createGetEmulationHistoryTool(ctx),
      createRunProcessCommandTool(ctx),
      createRunFileCommandTool(ctx),
      createRunNetworkCommandTool(ctx),
      createRunExecutionCommandTool(ctx),
    ],
    // The skill is gated upstream in `register_skills.ts` so it only
    // surfaces in the catalog when EITHER `detectionEmulationLogInjection`
    // OR `detectionEmulationRealExecution` is on. Each individual tool
    // additionally enforces its specific feature-flag gate at call time
    // (validateRule per-mode; the four run*Command tools require
    // realExecution).
  });
