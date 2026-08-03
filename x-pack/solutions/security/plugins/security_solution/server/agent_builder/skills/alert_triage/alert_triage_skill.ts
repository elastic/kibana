/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { ToolType } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { z } from '@kbn/zod/v4';
import { prioritizeAlerts } from './services/alert_triage_service';

export const ALERT_TRIAGE_TOOL_ID = `${internalNamespaces.security}.alert-triage`;

const prioritizeAlertsSchema = z.object({
  timeWindowHours: z
    .number()
    .min(1)
    .max(168)
    .default(24)
    .describe('How far back to look for alerts in hours (1–168, default 24)'),
  maxAlerts: z
    .number()
    .min(1)
    .max(500)
    .default(100)
    .describe(
      'Maximum number of alerts to fetch and score before grouping (1–500, default 100). ' +
        'The tool always returns at most 10 ranked groups regardless of this value.'
    ),
  workflowStatus: z
    .enum(['open', 'open+acknowledged'])
    .default('open')
    .describe(
      'Which alert workflow statuses to include. "open" is the default. ' +
        'Use "open+acknowledged" to include acknowledged alerts.'
    ),
  alertIds: z
    .array(z.string().min(1).max(512))
    .max(500)
    .optional()
    .describe(
      'Optional: specific alert IDs to triage (e.g. from an alert attachment or user selection). ' +
        'When provided, exactly these alerts are scored regardless of their workflow status or age — ' +
        'timeWindowHours and workflowStatus are ignored so a selected alert is never silently dropped.'
    ),
});

const createAlertTriageTool = (): BuiltinSkillBoundedTool<typeof prioritizeAlertsSchema> => ({
  id: ALERT_TRIAGE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Fetch the alert queue, score each alert using base risk score and MITRE tactic boost, ' +
    'cluster alerts by shared entity (host/user), enrich groups with Entity Analytics ' +
    '(entity risk level and asset criticality, when available), and return ranked groups with ' +
    'score breakdowns. Use this as the first step for any alert queue prioritization request.',
  schema: prioritizeAlertsSchema,
  handler: async ({ timeWindowHours, maxAlerts, workflowStatus, alertIds }, context) => {
    try {
      const result = await prioritizeAlerts({
        esClient: context.esClient.asCurrentUser,
        spaceId: context.spaceId,
        logger: context.logger,
        timeWindowHours,
        maxAlerts,
        workflowStatus,
        alertIds,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: result,
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to prioritize alerts: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        ],
      };
    }
  },
});

export const alertTriageSkill = defineSkillType({
  id: 'alert-triage',
  name: 'alert-triage',
  basePath: 'skills/security/alerts',
  description:
    'Alert queue triage: prioritize and rank the alert queue by weighted risk factors — ' +
    'base risk score, MITRE tactic boost, Entity Analytics entity risk, asset criticality, ' +
    'and status — then cluster alerts into entity groups. ' +
    'Use when a user asks "what should I focus on?", "which alerts are most urgent?", ' +
    'or wants a ranked starting point across the queue without investigating individual alerts.',
  content: `# Alert Triage Guide

## When to Use This Skill

Use this skill when:
- A user asks "what should I focus on right now?" or "what alerts should I look at?"
- A user wants to prioritize the alert queue for a time window (e.g. "last 8 hours")
- A user provides a set of alerts and asks "which of these are most important?"
- A user is starting a shift and needs a ranked starting point before investigation begins
- Do NOT use for investigating a single, known alert — use the alert-analysis skill for that

## Triage Process

### 1. Prioritize the Alert Queue
- Call \`${ALERT_TRIAGE_TOOL_ID}\` with:
  - \`timeWindowHours\`: how far back to look (default 24h, range 1–168)
  - \`workflowStatus\`: "open" (default) or "open+acknowledged"
  - \`alertIds\`: optional list of specific alert IDs when the user has a selection. When set, exactly
    those alerts are scored regardless of workflow status or age (timeWindowHours/workflowStatus ignored)
- The tool fetches open/acknowledged alerts sorted by risk score, applies MITRE tactic boosts,
  clusters alerts by shared host or user entities, enriches each group with Entity Analytics
  (entity risk level and asset criticality of the primary entity, when available), and returns
  ranked groups

### Scoring factors
The group score combines (all computed by the tool, no LLM math needed):
- \`baseRiskScore\`: the alert's \`kibana.alert.risk_score\`
- \`mitreBoost\`: +10 to +30 based on the highest-severity MITRE tactic on the alert
- \`statusModifier\`: −5 if acknowledged, −5 if already in a case
- \`entityRiskBoost\`: from the primary entity's Entity Analytics risk level — Critical +25, High +15, Moderate +5 (0 when no entity risk data)
- \`assetCriticalityBoost\`: from the primary entity's asset criticality (the "watchlist" signal) — extreme_impact +20, high_impact +12, medium_impact +6 (0 when unassigned)
Entity Analytics enrichment is best-effort: if the Risk Engine or asset criticality is unavailable, those boosts are simply 0 and triage still works.

### 2. Present Ranked Groups
For each group returned, explain:
- The shared entity or context (e.g. "3 alerts on host WIN-SRV01")
- The group score and what drove it (base risk score + MITRE tactic boost + entity risk / asset criticality boosts applied)
- The primary entity's risk level and asset criticality when present (e.g. "host WIN-SRV01: entity risk Critical, asset criticality high_impact")
- Whether any alerts are acknowledged or already in a case (with score penalty noted)
- The top alert rule names in the group

### 3. Communicate Scope
- Always be explicit that this is a starting point, not an investigation
- For each top group, recommend: "Investigate further with alert-analysis"
- Do not enumerate every alert in the response — summarize groups and highlight the top 2–3

## Examples

**Query**: "What should I focus on right now?"
- Tool: \`${ALERT_TRIAGE_TOOL_ID}\` (only)
- Params: \`{ timeWindowHours: 24, workflowStatus: "open" }\`

**Query**: "Prioritize alerts from the last 8 hours"
- Tool: \`${ALERT_TRIAGE_TOOL_ID}\` (only)
- Params: \`{ timeWindowHours: 8, workflowStatus: "open" }\`

**Query**: "Which alerts from the last 8 hours are most urgent? Give me a prioritized view."
- Tool: \`${ALERT_TRIAGE_TOOL_ID}\` (only)
- Params: \`{ timeWindowHours: 8, workflowStatus: "open" }\`

**Query**: "Prioritize the alert queue for the last 24 hours and list the top alert IDs I should investigate."
- Tool: \`${ALERT_TRIAGE_TOOL_ID}\` (only)
- Params: \`{ timeWindowHours: 24, workflowStatus: "open" }\`
- Note: The tool already returns alert _ids in its output — do NOT call \`security.alerts\` to look them up separately

**Query**: "Which of these alerts should I look at first?" (with alert attachment)
- Tool: \`${ALERT_TRIAGE_TOOL_ID}\` (only)
- Params: \`{ alertIds: ["<id1>", "<id2>", ...] }\`
- Note: with \`alertIds\`, exactly those alerts are scored regardless of status or age

**Query**: "What alerts should I look at? Prioritize by entity risk where available."
- Tool: \`${ALERT_TRIAGE_TOOL_ID}\` (only)
- Params: \`{ timeWindowHours: 24, workflowStatus: "open" }\`
- Response order for the top group: (1) entityName, (2) entityRiskLevel verbatim (e.g. Critical) and entityRiskBoost, (3) why it outranks peers with higher base scores, (4) top alert _id

**Query**: "Prioritize the alert queue. Call out any hosts with high asset criticality."
- Tool: \`${ALERT_TRIAGE_TOOL_ID}\` (only)
- Params: \`{ timeWindowHours: 24, workflowStatus: "open" }\`
- Response order for watchlist hosts: (1) entityName, (2) assetCriticality verbatim (e.g. extreme_impact) and assetCriticalityBoost, (3) why it outranks peers, (4) top alert _id

## Guardrails
- Do not perform deep investigation — direct the user to alert-analysis for that
- Always explain why a group is surfaced: cite the score components (base risk, MITRE boost, entity risk boost, asset criticality boost)
- When a group's primary entity carries an entity risk level or asset criticality, cite it — these are strong prioritization signals from Entity Analytics
- Copy \`entityRiskLevel\`, \`assetCriticality\`, and \`entityName\` verbatim from the tool result when present (e.g. "Critical", "extreme_impact", "EVAL-RISK-HOST"). Do not paraphrase level names.
- When entity enrichment re-ranks a group above a higher base-score peer, explain why (cite the entity risk / criticality boost from scoreBreakdown)
- Entity Analytics enrichment is internal to \`${ALERT_TRIAGE_TOOL_ID}\`; never call \`security.entity_risk_score\` or any asset-criticality tool separately
- Acknowledged alerts are deprioritized (−5) but not hidden; flag the modifier in your response
- Alerts already in a case are deprioritized (−5) but remain visible — they may group with new open alerts
- Building-block alerts are excluded automatically (they are sub-components of parent alerts)
- This skill does NOT require alerts to form a multi-rule chain — any actionable alert qualifies
- If the tool returns 0 alerts, tell the user no open alerts match the criteria and suggest widening the window
- **ALWAYS call ONLY \`${ALERT_TRIAGE_TOOL_ID}\`** — never call \`security.alerts\`, \`security.entity_risk_score\`, or any other tool. The alert-triage tool handles all time-window filtering, severity filtering, scoring, and returns alert _ids in its output. There are no exceptions to this rule.

## Response Format

Present results as ranked groups. **You MUST include the top alert _id for every group — this is mandatory, not optional.**

**Group 1 — [entity or context]** (score: N)
- Alerts: N alerts | Top rule: [rule name] | Severity: critical/high
- Score drivers: base risk [N], MITRE tactic boost [+N for tactic name], entity risk [+N, level], asset criticality [+N, level]
- Entity signals: entity risk level [Critical/High/...], asset criticality [extreme_impact/...] (omit if none)
- **Top alert ID: [exact _id string from the tool result]** ← always emit verbatim
- Recommended next step: Investigate with alert-analysis

**Group 2 — [entity or context]** (score: N)
...

The top alert _id for each group is required in every response — even brief summaries. Analysts use it to escalate directly to alert-analysis or file a case. Copy the _id verbatim from the tool result; do not paraphrase or abbreviate it.

End with a brief summary of total alerts assessed and how many groups were identified.`,

  getRegistryTools: () => [],

  getInlineTools: () => [createAlertTriageTool()],
});
