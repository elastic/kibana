/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { findRules } from '../../../lib/detection_engine/rule_management/logic/search/find_rules';
import {
  andGroupSchema,
  buildFullFilter,
  EXCLUDE_DESCRIPTION,
  FILTER_DESCRIPTION,
  type AndGroup,
  type FindRulesToolDeps,
} from './rule_filter';

export { buildFullFilter } from './rule_filter';

export const FIND_RULES_INLINE_TOOL_ID = 'security.find_rules';

const SORT_FIELDS = [
  'name',
  'updatedAt',
  'createdAt',
  'enabled',
  'severity',
  'risk_score',
] as const;

export const findRulesSchema = z
  .object({
    filter: z.array(andGroupSchema).optional().describe(FILTER_DESCRIPTION),
    exclude: z.array(andGroupSchema).optional().describe(EXCLUDE_DESCRIPTION),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe('Maximum number of rules to return (1-100). Set to N for "top N" queries.'),
    sortField: z
      .enum(SORT_FIELDS)
      .optional()
      .describe(
        'Field to sort by. Use `severity`/`risk_score` for "most severe"/"highest risk" queries.'
      ),
    sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort direction (default desc).'),
  })
  .strict();

type RuleFromFind = Awaited<ReturnType<typeof findRules>>['data'][number];

function summarizeRule(rule: RuleFromFind) {
  const params = (rule.params ?? {}) as Record<string, unknown>;

  return {
    id: rule.id,
    ruleId: params.rule_id ?? params.ruleId,
    name: rule.name,
    tags: rule.tags,
    enabled: rule.enabled,
    severity: params.severity,
    riskScore: params.risk_score ?? params.riskScore,
    type: params.type,
    updatedAt: rule.updatedAt,
  };
}

function hasTagCondition(groups: AndGroup[] | undefined): boolean {
  return Boolean(groups?.some((g) => g.some((c) => 'tag' in c)));
}

function buildNoResultsHint(total: number, hasTagFilter: boolean): string {
  if (total > 0) return '';

  return hasTagFilter
    ? ' The filter included tag values — those values may not exist in this space. Call `security.discover_rule_tags` to list available tags.'
    : ' Consider broadening the filter or calling `security.discover_rule_tags` to explore available tag values.';
}

export const createFindRulesInlineTool = ({
  getStartServices,
  logger,
}: FindRulesToolDeps): BuiltinSkillBoundedTool<typeof findRulesSchema> => ({
  id: FIND_RULES_INLINE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Find, list, and sort Security detection rules using structured filters. ' +
    'Returns rule names, metadata, and total count.',
  schema: findRulesSchema,
  handler: async (input, { request }) => {
    try {
      const [, startPlugins] = await getStartServices();
      const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

      const kqlFilter = buildFullFilter(input.filter, input.exclude);
      const { perPage, sortField, sortOrder } = input;

      const findResult = await findRules({
        rulesClient,
        filter: kqlFilter,
        perPage,
        page: 1,
        sortField,
        sortOrder: sortField ? sortOrder : undefined,
        fields: undefined,
      });

      const rules = findResult.data.map(summarizeRule);
      const hasTagFilter = hasTagCondition(input.filter) || hasTagCondition(input.exclude);

      const ruleNames = rules.map((r) => r.name).join(', ');
      const baseMessage =
        findResult.total === 0
          ? 'No detection rules matched the filter.'
          : `Found ${findResult.total} detection rules (showing ${rules.length}): ${ruleNames}.`;

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              message: baseMessage + buildNoResultsHint(findResult.total, hasTagFilter),
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
});
