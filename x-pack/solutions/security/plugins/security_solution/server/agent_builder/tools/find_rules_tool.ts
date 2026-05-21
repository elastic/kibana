/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';
import { SERVER_APP_ID } from '../../../common/constants';
import { securityTool } from './constants';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';

export const SECURITY_FIND_RULES_TOOL_ID = securityTool('find_rules');

// ---- Filter language ----
//
// Inspired by the indicator-match rule's `threat_mapping` shape:
//   filter[ outer-array = OR ][ inner-array = AND ] of atomic conditions.
//
// Each condition is one-field-per-object, so the LLM never has to
// remember whether a multi-value array means AND or OR.

const conditionSchema = z.union([
  z
    .object({
      enabled: z.boolean().describe('Match rules with this enabled state. Use true or false.'),
    })
    .strict(),
  z
    .object({
      ruleSource: z
        .enum(['custom', 'prebuilt'])
        .describe('"custom" = user-authored. "prebuilt" = Elastic-shipped.'),
    })
    .strict(),
  z
    .object({
      severity: z
        .enum(['critical', 'high', 'medium', 'low'])
        .describe('Match rules with this exact severity.'),
    })
    .strict(),
  z
    .object({
      ruleType: z
        .enum([
          'query',
          'eql',
          'threshold',
          'threat_match',
          'esql',
          'machine_learning',
          'new_terms',
        ])
        .describe('Match rules of this exact type.'),
    })
    .strict(),
  z
    .object({
      tag: z
        .string()
        .min(1)
        .describe(
          'Match rules carrying this exact tag string. ' +
            'Tag values are environment-specific — discover available tags via `groupBy: "tags"` before filtering by name.'
        ),
    })
    .strict(),
  z
    .object({
      mitreTechnique: z
        .string()
        .regex(/^T\d{4}(\.\d{3})?$/i, 'mitreTechnique must look like "T1059" or "T1059.001".')
        .describe('MITRE ATT&CK technique ID, e.g. "T1059" or "T1059.001".'),
    })
    .strict(),
  z
    .object({
      mitreTactic: z
        .string()
        .regex(/^TA\d{4}$/i, 'mitreTactic must look like "TA0002".')
        .describe('MITRE ATT&CK tactic ID, e.g. "TA0002".'),
    })
    .strict(),
  z
    .object({
      nameContains: z
        .string()
        .min(1)
        .describe(
          'Search rule names. Behavior mirrors the Detection Rules UI: a SINGLE-word value matches any name containing it as a substring (case-insensitive wildcard on `name.keyword`); a MULTI-word value matches names containing that exact phrase via the analyzer (no wildcards — punctuation/casing normalized but the words must appear together in order). Prefer a single distinctive token for substring search, or a quoted phrase when the exact wording matters.'
        ),
    })
    .strict(),
  z
    .object({
      riskScoreMin: z
        .number()
        .int()
        .min(0)
        .max(100)
        .describe(
          'Minimum risk_score (inclusive). Pair with riskScoreMax in the same AND-group for a range.'
        ),
    })
    .strict(),
  z
    .object({
      riskScoreMax: z
        .number()
        .int()
        .min(0)
        .max(100)
        .describe(
          'Maximum risk_score (inclusive). Pair with riskScoreMin in the same AND-group for a range.'
        ),
    })
    .strict(),
  z
    .object({
      indexPattern: z
        .string()
        .min(1)
        .describe(
          'Match rules whose source index list contains this pattern. ' +
            'Supports wildcards, e.g. "logs-endpoint.events.*".'
        ),
    })
    .strict(),
  z
    .object({
      ruleUuid: z
        .string()
        .min(1)
        .describe(
          'Match a specific rule by its alerting Saved Object UUID. This is the value visible in alerts as `kibana.alert.rule.uuid` and in the event log as `kibana.saved_objects.id`. Note: in the Security detection-engine codebase the bare name "ruleId" elsewhere refers to the static `params.ruleId` — that field is surfaced in this tool\'s output as `ruleId`. Use `ruleUuid` (this atom) for SO-UUID-keyed lookups: translating an alerts aggregation, gap search, failing-rule lookups, etc.'
        ),
    })
    .strict(),
]);

const andGroupSchema = z
  .array(conditionSchema)
  .min(1, 'Each AND-group must contain at least one condition.');

const findRulesSchema = z.object({
  filter: z
    .array(andGroupSchema)
    .optional()
    .describe(
      'Outer array = OR. Inner array = AND. Each leaf is one atomic condition (one field per object). ' +
        'Example "critical AND tagged MITRE": `[[{ "severity": "critical" }, { "tag": "MITRE" }]]`. ' +
        'Example "critical OR high": `[[{ "severity": "critical" }], [{ "severity": "high" }]]`. ' +
        'Example "tagged MITRE AND tagged Custom (same rule)": `[[{ "tag": "MITRE" }, { "tag": "Custom" }]]`. ' +
        'Omit to match all rules.'
    ),
  exclude: z
    .array(andGroupSchema)
    .optional()
    .describe(
      'Same shape as `filter`. Rules matching ANY group here are excluded. ' +
        'Example "MITRE-tagged but not Custom": filter=`[[{ "tag": "MITRE" }]]`, exclude=`[[{ "tag": "Custom" }]]`.'
    ),
  perPage: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Maximum number of rules to return (1-100). Set to N for "top N" queries.'),
  sortField: z
    .enum(['name', 'updatedAt', 'createdAt', 'enabled', 'severity', 'risk_score'])
    .optional()
    .describe(
      'Field to sort by. Use `severity`/`risk_score` for "most severe"/"highest risk" queries.'
    ),
  sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort direction (default desc).'),
  groupBy: z
    .enum(['ruleType', 'tags', 'enabled', 'mitreTechnique', 'mitreTactic'])
    .optional()
    .describe(
      'When set, returns counts grouped by this attribute instead of the rule list. ' +
        'Use `groupBy: "tags"` to enumerate available tag values before filtering by tag.'
    ),
});

type Condition = z.infer<typeof conditionSchema>;
type AndGroup = z.infer<typeof andGroupSchema>;

// ---- KQL building ----

function escapeKql(value: string): string {
  return value.replace(/[\\():"<>]/g, '\\$&');
}

function quote(value: string): string {
  return `"${escapeKql(value)}"`;
}

function buildConditionKql(c: Condition): string {
  if ('enabled' in c) return `alert.attributes.enabled: ${c.enabled}`;
  if ('ruleSource' in c) {
    return `alert.attributes.params.immutable: ${c.ruleSource === 'prebuilt'}`;
  }
  if ('severity' in c) return `alert.attributes.params.severity: ${quote(c.severity)}`;
  if ('ruleType' in c) return `alert.attributes.params.type: ${quote(c.ruleType)}`;
  if ('tag' in c) return `alert.attributes.tags: ${quote(c.tag)}`;
  if ('mitreTechnique' in c) {
    return `alert.attributes.params.threat.technique.id: ${quote(c.mitreTechnique)}`;
  }
  if ('mitreTactic' in c) {
    return `alert.attributes.params.threat.tactic.id: ${quote(c.mitreTactic)}`;
  }
  if ('nameContains' in c) {
    // Mirror the Detection Rules UI's `convertRuleSearchTermToKQL` (rule_filtering.ts):
    //   - Single-term → wildcard substring on the .keyword subfield.
    //   - Multi-term → exact phrase on the analyzed field (no wildcards).
    const escaped = escapeKql(c.nameContains);
    const isSingleTerm = escaped.split(' ').length === 1;
    return isSingleTerm
      ? `alert.attributes.name.keyword: *${escaped}*`
      : `alert.attributes.name: ${quote(c.nameContains)}`;
  }
  if ('riskScoreMin' in c) {
    return `alert.attributes.params.risk_score >= ${c.riskScoreMin}`;
  }
  if ('riskScoreMax' in c) {
    return `alert.attributes.params.risk_score <= ${c.riskScoreMax}`;
  }
  if ('indexPattern' in c) {
    // Wildcard match against the index array — unquoted, wildcards honored.
    return `alert.attributes.params.index: ${escapeKql(c.indexPattern)}`;
  }
  // ruleUuid — the alerting Saved Object UUID. Canonical KQL shape for SO-UUID filtering
  // is `alert.id: "alert:<uuid>"`. See `enrich_filter_with_rule_ids.ts:convertRuleIdsToKQL`
  // (security_solution) and `convert_rule_ids_to_kuery_node.ts` (alerting plugin) — both
  // share this convention. The same UUID surfaces as `kibana.alert.rule.uuid` in alerts
  // and `kibana.saved_objects.id` in event-log documents, so one atom covers all three
  // sources (alerts agg, gap search, failing-rule lookups). The static `params.ruleId` is
  // a different identifier — see the tool's output `ruleId` field for that.
  return `alert.id: ${quote(`alert:${c.ruleUuid}`)}`;
}

function buildAndGroup(g: AndGroup): string {
  if (g.length === 1) return buildConditionKql(g[0]);
  return g.map(buildConditionKql).join(' AND ');
}

function buildGroupsKql(groups: AndGroup[] | undefined): string | undefined {
  if (!groups || groups.length === 0) return undefined;
  const built = groups.map(buildAndGroup);
  if (built.length === 1) return built[0];
  return built.map((c) => `(${c})`).join(' OR ');
}

// Exported for unit testing.
export function buildFullFilter(
  filter: AndGroup[] | undefined,
  exclude: AndGroup[] | undefined
): string | undefined {
  const positive = buildGroupsKql(filter);
  const negative = buildGroupsKql(exclude);

  if (positive && negative) return `(${positive}) AND NOT (${negative})`;
  if (positive) return positive;
  if (negative) return `NOT (${negative})`;
  return undefined;
}

// Max buckets returned by groupBy aggregations. Mirrors Detection Rules UI tag-filter sizing.
// Buckets beyond this are reported via `sum_other_doc_count` so the model knows the list is truncated.
const GROUP_BY_TERMS_SIZE = 500;

const GROUP_BY_FIELD: Record<NonNullable<z.infer<typeof findRulesSchema>['groupBy']>, string> = {
  ruleType: 'alert.attributes.params.type',
  tags: 'alert.attributes.tags',
  enabled: 'alert.attributes.enabled',
  mitreTechnique: 'alert.attributes.params.threat.technique.id',
  mitreTactic: 'alert.attributes.params.threat.tactic.id',
};

function hasTagCondition(groups: AndGroup[] | undefined): boolean {
  return Boolean(groups?.some((g) => g.some((c) => 'tag' in c)));
}

export function findRulesTool(
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger
): StaticToolRegistration<typeof findRulesSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof findRulesSchema> = {
    id: SECURITY_FIND_RULES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Find Security detection rules with a structured filter. ' +
      'Filter shape: outer array OR, inner array AND, each leaf one atomic condition. ' +
      'Returns rule summaries by default; set `groupBy` to get counts grouped by an attribute. ' +
      'Use `groupBy: "tags"` to enumerate available tags before filtering by tag value. ' +
      'Scoped to Security detection rules (consumer=siem). For alerting V2 rules use platform `rule-management`.',
    schema: findRulesSchema,
    tags: ['security', 'detection', 'rule-discovery', 'siem'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (input, { request }) => {
      try {
        const [, startPlugins] = await core.getStartServices();
        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

        const kqlFilter = buildFullFilter(input.filter, input.exclude);
        const { perPage, sortField, sortOrder, groupBy } = input;

        if (groupBy) {
          const aggField = GROUP_BY_FIELD[groupBy];
          const aggResult = await rulesClient.aggregate({
            options: { filter: kqlFilter, consumers: [SERVER_APP_ID] },
            aggs: { by_field: { terms: { field: aggField, size: GROUP_BY_TERMS_SIZE } } },
          });

          const byField = (
            aggResult as {
              aggregations?: {
                by_field?: {
                  buckets?: Array<{ key: string; doc_count: number }>;
                  sum_other_doc_count?: number;
                };
              };
            }
          ).aggregations?.by_field;

          const buckets = byField?.buckets ?? [];
          const otherDocCount = byField?.sum_other_doc_count ?? 0;

          const truncationHint =
            otherDocCount > 0
              ? ` There are additional groups beyond the top ${buckets.length} (sum_other_doc_count=${otherDocCount}). Narrow the filter or surface this limitation to the user before saying a value does not exist.`
              : '';

          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  message: `Aggregated rule counts by \`${groupBy}\` (${buckets.length} groups).${truncationHint}`,
                  groupBy,
                  groups: buckets.map((b) => ({ value: b.key, count: b.doc_count })),
                  truncated: otherDocCount > 0,
                  otherDocCount,
                },
              },
            ],
          };
        }

        const sortFieldPath =
          sortField === 'severity'
            ? 'params.severity'
            : sortField === 'risk_score'
            ? 'params.risk_score'
            : sortField;

        const findResult = await rulesClient.find({
          options: {
            filter: kqlFilter,
            perPage,
            page: 1,
            consumers: [SERVER_APP_ID],
            ...(sortFieldPath ? { sortField: sortFieldPath, sortOrder } : {}),
          },
        });

        const rules = findResult.data.map((rule) => {
          const params = (rule.params ?? {}) as Record<string, unknown>;
          return {
            // Two distinct rule identifiers — both surfaced explicitly to remove ambiguity:
            //   `id`     = the alerting Saved Object UUID (also `kibana.alert.rule.uuid` in alerts).
            //              Used by the find_rules `{ ruleUuid }` atom to filter by SO id.
            //   `ruleId` = the static detection-engine rule_id from `params.ruleId`
            //              (also `kibana.alert.rule.rule_id` in alerts). This is the value
            //              the Security UI / API uses as the human-stable rule identifier.
            id: rule.id,
            ruleId: params.rule_id ?? params.ruleId,
            name: rule.name,
            tags: rule.tags,
            enabled: rule.enabled,
            ruleTypeId: rule.alertTypeId,
            severity: params.severity,
            riskScore: params.risk_score,
            type: params.type,
            index: params.index,
            threat: params.threat,
            interval: rule.schedule?.interval,
            createdAt: rule.createdAt,
            updatedAt: rule.updatedAt,
          };
        });

        const hasTagFilter = hasTagCondition(input.filter) || hasTagCondition(input.exclude);

        const baseMessage =
          findResult.total === 0
            ? 'No detection rules matched the filter.'
            : `Found ${findResult.total} matching detection rules (showing ${rules.length}).`;

        const zeroResultHint =
          findResult.total === 0 && hasTagFilter
            ? ' The filter included tag values — those values may not exist in this space. Call again with `groupBy: "tags"` to list available tags.'
            : findResult.total === 0
            ? ' Consider broadening the filter or calling with `groupBy: "tags"` / `groupBy: "ruleType"` to explore the rule inventory.'
            : '';

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: baseMessage + zeroResultHint,
                total: findResult.total,
                rules,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(
          `find_rules tool failed: ${error instanceof Error ? error.message : String(error)}`
        );
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to find rules: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
