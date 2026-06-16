/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ToolType } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { z } from '@kbn/zod/v4';
import {
  SECURITY_ALERTS_TOOL_ID,
  SECURITY_LABS_SEARCH_TOOL_ID,
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
} from '../../tools';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';
import {
  DEFAULT_ALERTS_INDEX,
  SecurityAgentBuilderAttachments,
} from '../../../../common/constants';

interface InvestigateRuleSkillDeps {
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  logger: Logger;
}

const SKILL_CONTENT = `# investigate-rule Skill

## When to Use This Skill

Use this skill when the user asks why a detection rule is generating too many
alerts, why alerts seem like false positives, or how to reduce noise from the
rule — whether or not a rule attachment is already present:

- "Why is this rule firing so much?"
- "Most of these alerts seem like false positives."
- "How do I reduce noise from this rule?"
- "This host keeps triggering the rule but it's expected behavior."

Do **not** use this skill to create or edit the rule. Those intents belong to
the \`detection-rule-edit\` skill.

---

## Core Workflow

### Step 0: Ensure the Rule Attachment Exists

Before reading the attachment, check whether a \`security.rule\` attachment is
already present in the conversation.

- **Attachment present** (visible in the conversation sidebar, e.g. the user
  opened a rule from the Security UI or the \`detection-rule-edit\` skill created
  it): proceed to Step 1.
- **No attachment present** (the user referred to a rule by UUID, or selected
  one from a \`find-rules\` results table): call
  \`investigate-rule.resolve_rule_attachment\` with the rule UUID. This fetches
  the rule via Kibana's saved-objects layer and creates a \`security.rule\`
  attachment keyed on \`rule-investigate-<uuid>\`. Render the attachment inline
  using \`<render_attachment id="..." version="..." />\` after creation, then
  continue to Step 1.

### Step 1: Read the Rule Attachment

Always begin by calling \`attachment_read\` on the rule attachment. The attachment
contains the rule definition (query, index patterns, schedule, type, enabled
state, MITRE mappings). Never assume attachment contents; always read the latest
version.

Extract and retain: \`rule_id\` (or \`id\`), \`name\`, \`type\`, \`language\`, \`query\`,
\`index\`, \`interval\`, \`from\`, \`enabled\`.

### Step 2: Fetch Recent Alerts

Call \`investigate-rule.get_rule_alerts\` with the rule ID and
\`time_window_hours: 24\`. Extend to 72 or 168 if the user asks about a longer
period or the 24-hour sample is too small (fewer than 10 alerts).

### Step 3: Analyse the Alert Pattern

#### Prior Disposition Signal (fast path)

Before analysing entity patterns, check the \`workflow_reasons\` field in the
result. If analysts have closed alerts from this rule with
\`kibana.alert.workflow_reason\` values such as \`false_positive\` or
\`benign_positive\`, that is direct evidence of a confirmed FP pattern:

- **>= 30% of alerts carry FP/benign-positive dispositions**: strong
  confirmation; proceed directly to a remediation suggestion without
  waiting for further evidence.
- **Some FP dispositions mixed with open alerts**: treat as supporting evidence;
  combine with entity analysis below.
- **No dispositions or only \`acknowledged\`**: skip this fast path; rely on
  entity pattern analysis.

Do not filter hard on specific reason strings. Custom close reasons (available
since 9.4) may use non-standard wording; let the model interpret the intent.
Standard reasons are \`false_positive\` and \`benign_positive\`.

#### Entity Pattern Analysis

Examine the \`top_entities\` aggregation in the result. Recurring \`host.name\`,
\`user.name\`, or \`source.ip\` values that account for a disproportionate share
of alerts are the primary FP signal when disposition data is absent.

Cross-reference with Security Labs (\`security_labs_search\`) if the rule name
or MITRE technique is available. Known-good activity documented in Labs content
(admin tooling, expected automation) shifts classification toward **benign true
positive**, not a rule defect.

**Classify root cause:**

| Pattern observed | Root cause | Suggested remediation (user action in the UI) |
|---|---|---|
| Many alerts closed with \`false_positive\` or \`benign_positive\` workflow_reason | Confirmed FP by analyst disposition | Suggest adding an exception for the top entities, or narrowing the rule query, in the Detection Rules UI |
| One or two entities generating >= 70% of alerts | Benign activity from known entities | Suggest adding an exception for those entities in the Detection Rules UI |
| Alerts spread across many entities, query very broad | Overly broad query or missing index filter | Suggest narrowing the query or adding an index filter in the Detection Rules UI |
| Alert volume spikes during business hours only | Noisy but legitimate behavior | Suggest configuring alert suppression in the Detection Rules UI |
| Threshold is too low for the environment baseline | Threshold misconfiguration | Suggest raising the threshold in the Detection Rules UI |
| No clear pattern | Insufficient data | Request a wider time window or manual review |

### Step 4: Produce Output

This skill is **read-only and diagnostic**. It explains the noise and suggests
remediations the user can perform in the Detection Rules UI. It never applies,
offers to apply, or emits a structured proposal for a rule change, and it does
not hand off to a rule-mutation skill.

- Alert volume summary: total count, trend over the window, top entities.
- Root cause statement and classification (FP vs. benign TP vs. rule defect).
- Suggested remediation as plain text, phrased as a user action in the Detection
  Rules UI (e.g., "In the Detection Rules UI you can add an exception for host
  \`build-agent-03\` to stop these alerts.").
- Where the top-entity concentration supports it, note the approximate share of
  alerts the suggested remediation would remove (e.g., one host accounting for
  70% of alerts).

---

## Remediation Guidance

This skill does not change rules and has no in-chat rule-mutation capability.
When you have identified a fix:

- Describe it in plain text and tell the user how to perform it themselves in the
  Detection Rules UI (e.g., add an exception, narrow the query, adjust the
  threshold, or configure alert suppression).
- Do **not** offer to make the change, claim you can change the rule, hand off to
  a mutation skill, or emit a structured change proposal.

---

## Output Format

1. **Summary** (1-3 sentences): what the rule is doing and what the noise problem is.
2. **Evidence** (bulleted): specific signals from the alert data that support the diagnosis.
3. **Root cause**: one clear statement.
4. **Suggested remediation**: a plain-text suggestion the user can carry out in
   the Detection Rules UI. Never applied or offered as an in-chat change.

---

## Fallback

If the alert data is insufficient for a confident diagnosis:
1. Surface raw evidence: alert count, top entities, rule query and index patterns (from the attachment).
2. Provide a manual investigation checklist appropriate to the observed symptoms.
3. Do not suggest a specific remediation. State clearly: "I wasn't able to
   determine the root cause from available data. Here is the evidence for manual review."
`;

export const createInvestigateRuleSkill = ({
  getStartServices,
}: InvestigateRuleSkillDeps): SkillDefinition<'investigate-rule', 'skills/security/rules'> =>
  defineSkillType({
    id: 'investigate-rule',
    name: 'investigate-rule',
    basePath: 'skills/security/rules',
    description:
      'Rule noise and false-positive analysis: identify why a detection rule is generating too many alerts, ' +
      'surface the top contributing entities, and classify whether the root cause is benign activity, an overly ' +
      'broad query, or a threshold misconfiguration. If no rule attachment is present yet (e.g. the user selected ' +
      'a rule from find-rules output), the skill resolves the rule by UUID and creates the attachment before proceeding.',
    content: SKILL_CONTENT,
    getRegistryTools: () => [
      SECURITY_ALERTS_TOOL_ID,
      SECURITY_LABS_SEARCH_TOOL_ID,
      SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
    ],
    getInlineTools: () => [
      // ── resolve_rule_attachment ──────────────────────────────────────────────
      {
        id: 'investigate-rule.resolve_rule_attachment',
        type: ToolType.builtin,
        description:
          'Fetches a detection rule by UUID and creates a security.rule attachment for it. ' +
          'Call when the user selects a rule to investigate but no security.rule attachment exists yet ' +
          '(e.g., the user picked a rule from find-rules output and said "investigate this one"). ' +
          'Returns the attachment ID and version; use these with attachment_read and render_attachment. ' +
          'If an attachment for the same rule UUID already exists, returns the existing ID without re-fetching.',
        schema: z.object({
          rule_id: z
            .string()
            .max(512)
            .describe('UUID of the detection rule (id field / kibana.alert.rule.uuid)'),
        }),
        handler: async ({ rule_id: ruleId }, context) => {
          const attachmentId = `rule-investigate-${ruleId}`;

          const existing = context.attachments.get(attachmentId);
          if (existing) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message: `Rule ${ruleId} is already loaded as attachment "${attachmentId}".`,
                    attachmentId,
                    version: existing.version,
                  },
                },
              ],
            };
          }

          try {
            const [, startPlugins] = await getStartServices();
            const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(
              context.request
            );

            const ruleObject = await rulesClient.get({ id: String(ruleId) });
            const params = (ruleObject.params ?? {}) as Record<string, unknown>;
            const ruleName = String(ruleObject.name ?? ruleId);

            const rule = {
              id: ruleObject.id,
              ruleId: params.ruleId ?? params.rule_id,
              name: ruleObject.name,
              description: params.description,
              type: params.type,
              language: params.language,
              query: params.query,
              index: params.index,
              interval: ruleObject.schedule?.interval,
              from: params.from,
              enabled: ruleObject.enabled,
              tags: ruleObject.tags,
              threat: params.threat,
            };

            const created = await context.attachments.add({
              id: attachmentId,
              type: SecurityAgentBuilderAttachments.rule,
              data: {
                origin: ruleId,
                text: JSON.stringify(rule),
                attachmentLabel: ruleName,
              },
              description: `Rule: ${ruleName}`,
            });

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message: `Loaded rule "${ruleName}" as attachment "${created.id}".`,
                    attachmentId: created.id,
                    version: created.current_version,
                  },
                },
              ],
            };
          } catch (error) {
            const isNotFound =
              error != null &&
              typeof error === 'object' &&
              (error as { output?: { statusCode?: number } }).output?.statusCode === 404;

            if (isNotFound) {
              return {
                results: [
                  {
                    type: ToolResultType.other,
                    data: { message: `Rule ${ruleId} was not found in this space.` },
                  },
                ],
              };
            }

            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to resolve rule ${ruleId}: ${
                      error instanceof Error ? error.message : String(error)
                    }`,
                  },
                },
              ],
            };
          }
        },
      },

      // ── get_rule_alerts ──────────────────────────────────────────────────────
      {
        id: 'investigate-rule.get_rule_alerts',
        type: ToolType.builtin,
        description:
          'Fetches recent alerts produced by a specific detection rule, with entity and disposition aggregations for FP pattern detection. ' +
          'Returns total_count, a sample of recent alerts (timestamp, severity, key entity fields, workflow_reason), ' +
          'top_entities (aggregated counts of host.name, user.name, source.ip), ' +
          'and workflow_reasons (aggregated counts of kibana.alert.workflow_reason values). ' +
          'Check workflow_reasons first: if a significant share of alerts carry false_positive or benign_positive ' +
          'dispositions, that is direct analyst confirmation of the FP pattern and takes precedence over entity analysis. ' +
          'top_entities is the secondary FP signal: a single entity generating most alerts indicates ' +
          'benign activity from a known source rather than a true threat.',
        schema: z.object({
          rule_id: z
            .string()
            .max(512)
            .describe('The UUID of the detection rule (kibana.alert.rule.uuid)'),
          time_window_hours: z
            .number()
            .min(1)
            .max(168)
            .default(24)
            .describe('Time window in hours to fetch alerts (1-168, default 24)'),
          size: z
            .number()
            .int()
            .min(1)
            .max(100)
            .default(50)
            .describe('Maximum number of alert samples to return (default 50)'),
        }),
        handler: async ({ rule_id: ruleId, time_window_hours: timeWindowHours, size }, context) => {
          const hours = Number(timeWindowHours);
          const alertSize = Number(size);

          try {
            const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${context.spaceId}`;

            const searchResult = await context.esClient.asCurrentUser.search({
              index: alertsIndex,
              size: alertSize,
              query: {
                bool: {
                  filter: [
                    { term: { 'kibana.alert.rule.uuid': String(ruleId) } },
                    { range: { '@timestamp': { gte: `now-${hours}h` } } },
                  ],
                },
              },
              sort: [{ '@timestamp': 'desc' }],
              _source: [
                '@timestamp',
                'kibana.alert.severity',
                'kibana.alert.risk_score',
                'kibana.alert.workflow_status',
                'kibana.alert.workflow_reason',
                'host.name',
                'user.name',
                'source.ip',
                'destination.ip',
                'process.name',
              ],
              aggs: {
                total: { value_count: { field: 'kibana.alert.uuid' } },
                top_hosts: {
                  terms: { field: 'host.name', size: 10 },
                },
                top_users: {
                  terms: { field: 'user.name', size: 10 },
                },
                top_source_ips: {
                  terms: { field: 'source.ip', size: 10 },
                },
                workflow_reasons: {
                  terms: { field: 'kibana.alert.workflow_reason', size: 10 },
                },
              },
              ignore_unavailable: true,
            });

            const totalCount =
              typeof searchResult.hits.total === 'number'
                ? searchResult.hits.total
                : searchResult.hits.total?.value ?? 0;

            const alerts = searchResult.hits.hits.map((hit) => ({
              _id: hit._id,
              ...(hit._source as Record<string, unknown>),
            }));

            const aggs = searchResult.aggregations as
              | Record<string, { buckets?: Array<{ key: string; doc_count: number }> }>
              | undefined;

            const topEntities = {
              hosts: (aggs?.top_hosts?.buckets ?? []).map((b) => ({
                value: b.key,
                count: b.doc_count,
              })),
              users: (aggs?.top_users?.buckets ?? []).map((b) => ({
                value: b.key,
                count: b.doc_count,
              })),
              source_ips: (aggs?.top_source_ips?.buckets ?? []).map((b) => ({
                value: b.key,
                count: b.doc_count,
              })),
            };

            const workflowReasons = (aggs?.workflow_reasons?.buckets ?? []).map((b) => ({
              reason: b.key,
              count: b.doc_count,
            }));

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    message:
                      totalCount === 0
                        ? `No alerts found for rule ${ruleId} in the last ${hours} hour(s).`
                        : `Found ${totalCount} alert(s) for rule ${ruleId} in the last ${hours} hour(s) (showing ${alerts.length}).`,
                    total_count: totalCount,
                    alerts,
                    top_entities: topEntities,
                    workflow_reasons: workflowReasons,
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
                    message: `Failed to fetch alerts for rule ${ruleId}: ${
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
