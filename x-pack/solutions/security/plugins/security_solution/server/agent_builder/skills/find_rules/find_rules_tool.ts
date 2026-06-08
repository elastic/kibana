/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { type as detectionRuleType } from '@kbn/securitysolution-io-ts-alerting-types';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { prepareKQLStringParam } from '../../../../common/utils/kql';
import {
  convertRulesFilterToKQL,
  convertRuleTagsToKQL,
} from '../../../../common/detection_engine/rule_management/rule_filtering';
import {
  PARAMS_RULE_ID_FIELD,
  PARAMS_SEVERITY_FIELD,
  RULE_PARAMS_FIELDS,
  TAGS_FIELD,
} from '../../../../common/detection_engine/rule_management/rule_fields';
import { findRules } from '../../../lib/detection_engine/rule_management/logic/search/find_rules';
import type { SecuritySolutionPluginStartDependencies } from '../../../plugin_contract';

export const FIND_RULES_INLINE_TOOL_ID = 'security.find_rules';

const SEVERITY_VALUES = ['critical', 'high', 'medium', 'low'] as const;
const RULE_TYPE_VALUES = Object.keys(detectionRuleType.keys) as [Type, ...Type[]];
const SORT_FIELDS = [
  'name',
  'updatedAt',
  'createdAt',
  'enabled',
  'severity',
  'risk_score',
] as const;

const MAX_STRING_LENGTH = 10_000;
const MAX_TAG_LENGTH = 1000;

export const findRulesSchema = z
  .object({
    searchTerm: z
      .string()
      .min(1)
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'Free-text search across rule name, index patterns, and MITRE tactic/technique fields. ' +
          'For category-flavored words like "network", "endpoint", "windows", also call ' +
          '`security.discover_rule_tags` — a tag filter is usually more precise than free text.'
      ),
    enabled: z.boolean().optional().describe('Match enabled (true) or disabled (false) rules.'),
    ruleSource: z
      .enum(['custom', 'prebuilt'])
      .optional()
      .describe('"custom" = user-authored, "prebuilt" = Elastic-shipped.'),
    severity: z
      .array(z.enum(SEVERITY_VALUES))
      .optional()
      .describe('Severity levels to include (OR). E.g. ["critical", "high"].'),
    ruleType: z
      .array(z.enum(RULE_TYPE_VALUES))
      .optional()
      .describe('Rule types to include (OR). E.g. ["query", "eql"].'),
    tags: z
      .array(z.string().min(1).max(MAX_TAG_LENGTH))
      .optional()
      .describe(
        'Exact tag values to include (OR). Discover values first via `security.discover_rule_tags`.'
      ),
    excludeTags: z
      .array(z.string().min(1).max(MAX_TAG_LENGTH))
      .optional()
      .describe('Exclude rules with any of these tags.'),
    mitreTechnique: z
      .string()
      .regex(/^T\d{4}(\.\d{3})?$/i)
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe('MITRE technique ID, e.g. "T1059" or "T1059.001".'),
    mitreTactic: z
      .string()
      .min(1)
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'MITRE tactic, either ID (e.g. "TA0001") or display name (e.g. "Initial Access"). ' +
          'Queries the structured `threat.tactic` field so it finds rules whose tactic is in ' +
          'rule metadata even when no "Tactic: X" tag is present. Prefer over tags for tactic queries.'
      ),
    ruleId: z
      .string()
      .min(1)
      .max(MAX_STRING_LENGTH)
      .optional()
      .describe(
        'Detection rule signature ID. Use after aggregating alerts by `kibana.alert.rule.rule_id`.'
      ),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(10)
      .describe(
        'Number of results to return (default 10, max 100). ' +
          'Keep the default of 10 unless the user explicitly requests a specific count ("show me 50", "show me all"). ' +
          'Never increase it on follow-up turns just because a previous result was truncated.'
      ),
    sortField: z
      .enum(SORT_FIELDS)
      .optional()
      .describe(
        'Field to sort by. Use `severity`/`risk_score` for "most severe"/"highest risk" queries.'
      ),
    sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort direction (default desc).'),
  })
  .strict();

// ---- Filter building ----
//
// Delegates to convertRulesFilterToKQL() for parameters it supports
// (searchTerm, enabled, ruleSource, ruleType), and appends extra KQL
// for parameters it doesn't (severity, tags, mitreTechnique, ruleId, excludeTags).
// Tags are handled here (OR) instead of by convertRulesFilterToKQL (AND).

interface FilterInput {
  searchTerm?: string;
  enabled?: boolean;
  ruleSource?: 'custom' | 'prebuilt';
  severity?: string[];
  ruleType?: Type[];
  tags?: string[];
  excludeTags?: string[];
  mitreTechnique?: string;
  mitreTactic?: string;
  ruleId?: string;
}

export function buildToolFilter(params: FilterInput): string | undefined {
  const baseKql = convertRulesFilterToKQL({
    filter: params.searchTerm,
    enabled: params.enabled,
    showCustomRules: params.ruleSource === 'custom',
    showElasticRules: params.ruleSource === 'prebuilt',
    includeRuleTypes: params.ruleType,
  });

  const extra: string[] = [];

  if (params.tags?.length) {
    const parts = params.tags.map((t) => `${TAGS_FIELD}: ${prepareKQLStringParam(t)}`);
    extra.push(parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`);
  }

  if (params.severity?.length) {
    const parts = params.severity.map(
      (s) => `${PARAMS_SEVERITY_FIELD}: ${prepareKQLStringParam(s)}`
    );
    extra.push(parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`);
  }

  if (params.mitreTechnique) {
    const field = params.mitreTechnique.includes('.')
      ? RULE_PARAMS_FIELDS.SUBTECHNIQUE_ID
      : RULE_PARAMS_FIELDS.TECHNIQUE_ID;
    extra.push(`${field}: ${prepareKQLStringParam(params.mitreTechnique)}`);
  }

  if (params.mitreTactic) {
    const field = /^TA\d{4}$/i.test(params.mitreTactic)
      ? RULE_PARAMS_FIELDS.TACTIC_ID
      : RULE_PARAMS_FIELDS.TACTIC_NAME;
    extra.push(`${field}: ${prepareKQLStringParam(params.mitreTactic)}`);
  }

  if (params.ruleId) {
    extra.push(`${PARAMS_RULE_ID_FIELD}: ${prepareKQLStringParam(params.ruleId)}`);
  }

  if (params.excludeTags?.length) {
    const parts = params.excludeTags.map((t) => `NOT ${convertRuleTagsToKQL([t])}`);
    extra.push(parts.join(' AND '));
  }

  const allParts = [...(baseKql ? [baseKql] : []), ...extra];
  return allParts.length > 0 ? allParts.join(' AND ') : undefined;
}

// ---- Tool handler ----

interface FindRulesToolDeps {
  getStartServices: StartServicesAccessor<SecuritySolutionPluginStartDependencies>;
  logger: Logger;
}

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
    'Returns rule names, metadata, and total count. ' +
    'Always call `security.discover_rule_tags` in the same turn immediately before calling this tool — every turn, not just the first. ' +
    'Do NOT call this tool without a preceding `security.discover_rule_tags` call in the same response. ' +
    'Use the freshly discovered tag list to decide which tag values (if any) to include in the filter. ' +
    'Read-only: never suggest enabling, disabling, editing, or deleting rules.',
  schema: findRulesSchema,
  handler: async (input, { request }) => {
    try {
      const [, startPlugins] = await getStartServices();
      const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

      const kqlFilter = buildToolFilter(input);
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
      const hasTagFilter = Boolean(input.tags?.length || input.excludeTags?.length);
      const truncated = findResult.total > rules.length;

      const ruleNames = rules.map((r) => r.name).join(', ');
      const baseMessage =
        findResult.total === 0
          ? 'No detection rules matched the filter.'
          : truncated
          ? `Found ${findResult.total} detection rules — showing top ${rules.length}: ${ruleNames}. Results exceed the display limit. Narrow by severity, rule type, tag, or MITRE technique to see more specific results.`
          : `Found ${findResult.total} detection rules: ${ruleNames}.`;

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
