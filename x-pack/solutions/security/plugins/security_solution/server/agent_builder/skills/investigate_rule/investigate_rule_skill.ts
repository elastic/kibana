/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { z } from '@kbn/zod/v4';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
} from '../../tools';
import { fetchExecutionEvents } from './fetch_execution_events';

// Matches the content of brain_definition.md; edit that file first and keep them in sync.
const SKILL_CONTENT = `# investigate-rule Skill

## When to Use This Skill

Use this skill when a detection rule is attached to the conversation and the
user asks an investigative question about it:

- **Execution health:** "Why did this rule fail to run?" / "It shows execution
  errors." / "There are gaps in the execution history."
- **Noise / FP:** "Why is this rule firing so much?" / "Most of these alerts
  seem like false positives." / "How do I reduce noise from this rule?"
- **Performance:** "Why is this rule so slow?" / "This rule is consuming too
  many resources." / "Can I make this rule cheaper to run?"
- **Gap analysis:** "This rule should be firing but isn't." / "I expected
  alerts but the rule looks quiet." / "Why are there no matches?"

Do **not** use this skill to create or edit the rule. Those intents belong to
the \`detection-rule-edit\` skill.

---

## Core Workflow

### Step 1: Read the Rule Attachment

Always begin by calling \`attachment_read\` on the rule attachment. The attachment
contains the rule definition (query, index patterns, schedule, type, enabled
state, MITRE mappings). Never assume attachment contents; always read the latest
version.

Extract and retain: \`rule_id\` (or \`id\`), \`name\`, \`type\`, \`language\`, \`query\`,
\`index\`, \`interval\`, \`from\`, \`enabled\`.

### Step 2: Identify the Diagnostic Branch

Classify the user's intent into one of four branches. A single conversation
can traverse multiple branches; resolve them in order of user priority.

| User intent | Branch |
|---|---|
| Rule failed, errors, gaps in execution | Execution health |
| Too many alerts, false positives, noisy | FP / noise |
| Slow, expensive, high resource use | Performance |
| No alerts, quiet rule, expected matches missing | Gap analysis |

When intent is ambiguous, ask one clarifying question: "Are you seeing too
many alerts, or too few?" Use the answer to select the branch. Do not attempt
both branches without confirmation.

### Step 3: Execute the Branch (see below)

### Step 4: Produce Output

All output is either **informational** (diagnosis + explanation) or
**actionable** (a \`proposed_changes\` payload for \`tune-rule\`). Never apply
mutations directly. All write operations belong to \`tune-rule\`.

---

## Branch A: Execution Health

**Entry condition:** User reports execution errors, missing runs, or gaps.

1. Call \`investigate-rule.get_rule_execution_logs\` with the rule ID from the
   attachment and a \`time_window_hours\` of 24 (extend to 168 if the user
   mentions a longer window or recurring issue).

2. For each failed execution, call \`investigate-rule.classify_execution_failure\`
   with the \`error_message\`. This returns a structured \`error_class\`.

3. **Triage by error class:**

   | Error class | Root cause | Recommended fix |
   |---|---|---|
   | \`index_not_found\` | The rule's index pattern resolves to no indices. | Propose an index pattern correction via \`tune-rule\`. |
   | \`query_timeout\` | The query takes longer than the rule's execution window allows. | Refer to Performance branch; also consider schedule change. |
   | \`permission_denied\` | The rule's API key lacks read access to the index. | Informational only: surface the affected index and a checklist for re-generating the API key. |
   | \`schedule_gap\` | The rule did not run during its scheduled window. | Check engine-wide schedule pressure. If other rules show the same pattern, refer to \`diagnose-engine-health\`. If isolated, propose \`adjust_rule_schedule\` via \`tune-rule\`. |
   | \`circuit_breaker\` | Elasticsearch circuit breaker tripped during the query. | Refer to Performance branch. |
   | \`executor_internal_error\` | Internal Detection Engine error. | Informational only: surface the support evidence (logs + rule details). |
   | \`unknown\` | Error message did not match any known pattern. | Surface raw error + manual checklist. |

4. **Cross-rule referral check:** If the same \`error_class\` appears in the
   execution logs of multiple rules (the user mentions other rules failing, or
   the error message suggests a shared resource like an index or API key),
   refer to \`diagnose-engine-health\` rather than diagnosing further here.
   Say: "This looks like it may affect more than one rule. The
   \`diagnose-engine-health\` skill can cluster failures across your engine and
   identify the shared root cause."

5. **Output:**
   - Execution timeline: list of recent executions with status, duration, and
     error class.
   - Root cause statement: one clear sentence per distinct error class observed.
   - Recommended action (per the table above), preview-gated via \`tune-rule\`
     for any mutation.

---

## Branch B: FP / Noise Analysis

**Entry condition:** User reports too many alerts, false positives, or high
noise from the rule.

1. Call \`investigate-rule.get_rule_alerts\` with the rule ID and
   \`time_window_hours: 24\`. Extend to 72 or 168 if the user asks about a
   longer period or the 24h sample is too small (< 10 alerts).

2. Examine the \`top_entities\` aggregation in the result. Recurring
   \`host.name\`, \`user.name\`, or \`source.ip\` values that account for a
   disproportionate share of alerts are the primary FP signal.

3. Cross-reference with Security Labs (\`security_labs_search\`) if the rule
   name or MITRE technique is available. Known-good activity documented in
   Labs content (admin tooling, expected automation) shifts classification
   toward **benign true positive**, not a rule defect.

4. **Classify root cause:**

   | Pattern observed | Root cause | Recommended action |
   |---|---|---|
   | One or two entities generating >= 70% of alerts | Benign activity from known entities | Add an exception for those entities via \`tune-rule\` |
   | Alerts spread across many entities, query very broad | Overly broad query or missing index filter | Propose query refinement via \`tune-rule\` |
   | Alert volume spikes during business hours only | Noisy but legitimate behavior | Add alert suppression rule via \`tune-rule\` |
   | Threshold is too low for the environment baseline | Threshold misconfiguration | Propose threshold increase via \`tune-rule\` |
   | No clear pattern | Insufficient data | Request a wider time window or manual review |

5. Call \`investigate-rule.get_rule_execution_metrics\` to check whether the
   alert volume is also causing performance pressure (high search hits).
   Surface this as a secondary finding if present.

6. **Output:**
   - Alert volume summary: total count, trend over the window, top entities.
   - Root cause statement and classification (FP vs. benign TP vs. rule defect).
   - \`proposed_changes\` payload for \`tune-rule\`.
   - Include the estimated alert volume reduction where calculable.

---

## Branch C: Performance Analysis

**Entry condition:** User reports the rule is slow, expensive, or consuming
excess engine resources.

1. Call \`investigate-rule.get_rule_execution_metrics\` for the rule.
   Key signals: \`avg_duration_ms\`, \`p95_duration_ms\`, \`total_search_hits\`,
   \`execution_count\`.

2. Read the rule query and index patterns from the attachment. Identify
   expensive patterns:

   | Pattern | Diagnosis | Fix |
   |---|---|---|
   | Index pattern is \`logs-*\` or \`*\` with no field filter | Overly broad index scan | Narrow to specific data stream |
   | No \`@timestamp\` filter in query | Full-index scan per run | Add time-bounded filter matching the rule's \`from\` field |
   | High-cardinality \`terms\` or \`cardinality\` aggregation without \`size\` limit | Expensive agg | Add \`size\` cap or convert to sampled approach |
   | \`interval\` is shorter than \`avg_duration_ms\` | Rule cannot complete before next run | Increase interval or reduce query scope |
   | \`total_search_hits\` >> typical for rule type | Query matching too broadly | Tighten index pattern or add filter conditions |

3. If \`p95_duration_ms\` is close to or exceeds the query timeout threshold,
   also run the Execution health branch (Branch A).

4. **Output:**
   - Performance summary: avg/p95/max duration, search hit count.
   - Ranked list of identified expensive patterns with estimated impact.
   - \`proposed_changes\` payload for \`tune-rule\`.

---

## Branch D: Gap Analysis

**Entry condition:** User expects the rule to fire but sees few or no alerts.

1. Call \`investigate-rule.get_rule_execution_logs\` to check whether the rule
   is executing at all. Look for \`gap_duration_s > 0\` entries.

   - **If gaps exist:** the rule is failing to run -> go to Branch A.
   - **If no gaps** (rule is running successfully): proceed to step 2.

2. Call \`investigate-rule.get_rule_alerts\` for the same window. Confirm alert
   count is zero or near-zero.

3. Read the query and index patterns from the attachment. Diagnose likely causes.

4. **Output:**
   - Execution health summary.
   - Alert count in window: confirm zero/near-zero.
   - Likely cause with supporting evidence.
   - \`proposed_changes\` payload for \`tune-rule\` where a concrete fix is available.

---

## Referral Conditions

### Refer to \`diagnose-engine-health\`

Refer when any of the following are true:
- The user mentions that multiple rules are failing.
- The \`error_class\` is \`schedule_gap\` and the user confirms it's not isolated.
- The \`error_class\` is \`index_not_found\` or \`permission_denied\` and the affected
  index pattern is broad (e.g., \`logs-*\`).

### Refer to \`tune-rule\`

Emit a \`proposed_changes\` payload when a concrete, actionable fix has been
identified and the user has confirmed they want to proceed.

Never call mutation tools directly. The payload format is:

\`\`\`json
{
  "rule_id": "<id from attachment>",
  "proposed_changes": { "<field>": "<new value>" },
  "rationale": "<one sentence explaining why>",
  "estimated_impact": "<e.g., estimated 80% alert reduction>"
}
\`\`\`

### Refer to \`detection-rule-edit\`

Refer when the fix requires a substantive query rewrite, not a field-level patch.

---

## Output Format

1. **Summary** (1-3 sentences): what the rule is doing and what the problem is.
2. **Evidence** (bulleted): specific signals that support the diagnosis.
3. **Root cause**: one clear statement.
4. **Recommended action**: next step, with \`proposed_changes\` payload if needed.

---

## Fallback

If no branch can reach a confident diagnosis:
1. Surface raw evidence: last N execution log entries, alert count, rule query.
2. Provide a manual investigation checklist appropriate to the observed symptoms.
3. Do not emit a \`proposed_changes\` payload.
`;

export const investigateRuleSkill = defineSkillType({
  id: 'investigate-rule',
  name: 'investigate-rule',
  basePath: 'skills/security/rules',
  description:
    'Rule investigation: diagnose execution failures, classify error types, surface noisy or underperforming rules, ' +
    'and identify coverage gaps. Use when a detection rule is attached and the user asks why it is failing, ' +
    'noisy, slow, or not producing alerts.',
  content: SKILL_CONTENT,
  getRegistryTools: () => [
    SECURITY_ALERTS_TOOL_ID,
    SECURITY_LABS_SEARCH_TOOL_ID,
    SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
    platformCoreTools.generateEsql,
  ],
  getInlineTools: () => [
    {
      id: 'investigate-rule.get_rule_execution_logs',
      type: ToolType.builtin,
      description:
        'Fetches execution history for a detection rule over a given time window. ' +
        'Returns up to 100 execution records sorted descending by timestamp. ' +
        'Each record includes the execution status (succeeded/failed/partial failure), ' +
        'duration in milliseconds, gap duration in seconds, and an error message when present. ' +
        'Use for Execution Health (Branch A) and Gap Analysis (Branch D) workflows.',
      schema: z.object({
        rule_id: z
          .string()
          .describe('The UUID of the detection rule (id field from the rule attachment)'),
        time_window_hours: z
          .number()
          .min(1)
          .max(168)
          .default(24)
          .describe('Time window in hours to fetch execution history (1-168, default 24)'),
      }),
      handler: async ({ rule_id: ruleId, time_window_hours: timeWindowHours }, context) => {
        const hours = Number(timeWindowHours);
        try {
          const { records, total } = await fetchExecutionEvents(context.esClient, {
            ruleId: String(ruleId),
            spaceId: context.spaceId,
            timeWindowHours: hours,
            size: 100,
          });

          if (records.length === 0) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message: `No execution records found for rule ${ruleId} in the last ${hours} hour(s).`,
                    executions: [],
                    total: 0,
                  },
                },
              ],
            };
          }

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: `Found ${records.length} execution record(s) for rule ${ruleId} (${total} total in window).`,
                  executions: records,
                  total,
                },
              },
            ],
          };
        } catch (error) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Failed to fetch execution logs for rule ${ruleId}: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                },
              },
            ],
          };
        }
      },
    },
  ],
});
