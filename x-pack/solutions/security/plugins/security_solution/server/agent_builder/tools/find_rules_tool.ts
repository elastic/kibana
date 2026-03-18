/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { Logger } from '@kbn/logging';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { ExperimentalFeatures } from '../../../common';

export const SECURITY_FIND_RULES_TOOL_ID = securityTool('find_rules');

const findRulesSchema = z.object({
  search_term: z
    .string()
    .optional()
    .describe('Search term to filter rules by name or index pattern'),
  rule_type: z
    .enum([
      'eql',
      'esql',
      'query',
      'saved_query',
      'threshold',
      'machine_learning',
      'threat_match',
      'new_terms',
    ])
    .optional()
    .describe('Filter by rule type'),
  enabled: z.boolean().optional().describe('Filter by enabled/disabled status'),
  is_prebuilt: z
    .boolean()
    .optional()
    .describe(
      'Filter by prebuilt (Elastic) vs custom rules. True for prebuilt rules, false for custom rules.'
    ),
  tags: z.array(z.string()).optional().describe('Filter rules that have ALL of these tags'),
  per_page: z.number().min(1).max(100).default(20).describe('Number of rules per page'),
  page: z.number().min(1).default(1).describe('Page number'),
  sort_field: z
    .enum(['name', 'enabled', 'updated_at', 'created_at', 'severity', 'risk_score'])
    .optional()
    .describe('Field to sort by'),
  sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
});

export const findRulesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures?: ExperimentalFeatures
): BuiltinSkillBoundedTool<typeof findRulesSchema> => {
  return {
    id: SECURITY_FIND_RULES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Search and list security detection rules with filtering by type, status, tags, and prebuilt/custom classification. Returns paginated results with rule metadata including severity, risk score, and index patterns.',
    schema: findRulesSchema,
    handler: async (
      {
        search_term: searchTerm,
        rule_type: ruleType,
        enabled,
        is_prebuilt: isPrebuilt,
        tags,
        per_page: perPage,
        page,
        sort_field: sortField,
        sort_order: sortOrder,
      },
      { request }
    ) => {
      logger.debug(
        `${SECURITY_FIND_RULES_TOOL_ID} tool called with search_term: ${
          searchTerm ?? 'none'
        }, rule_type: ${ruleType ?? 'any'}`
      );

      try {
        const [, startPlugins] = await core.getStartServices();
        const rulesClient = await startPlugins.alerting.getRulesClientWithRequest(request);

        const filterParts: string[] = [];
        if (typeof enabled === 'boolean') {
          filterParts.push(`alert.attributes.enabled: ${enabled}`);
        }
        if (typeof isPrebuilt === 'boolean') {
          filterParts.push(`alert.attributes.params.immutable: ${isPrebuilt}`);
        }
        if (ruleType) {
          filterParts.push(`alert.attributes.params.type: ${ruleType}`);
        }
        if (tags?.length) {
          tags.forEach((tag) => filterParts.push(`alert.attributes.tags: "${tag}"`));
        }

        const filter = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;

        const result = await rulesClient.find({
          options: {
            filter,
            search: searchTerm,
            searchFields: ['name', 'params.index'],
            page: page ?? 1,
            perPage: perPage ?? 20,
            sortField: sortField ?? 'updated_at',
            sortOrder: sortOrder ?? 'desc',
          },
        });

        const rules = result.data.map((rule) => {
          const params = rule.params as Record<string, unknown>;
          return {
            id: rule.id,
            rule_id: params?.ruleId,
            name: rule.name,
            type: params?.type,
            enabled: rule.enabled,
            severity: params?.severity,
            risk_score: params?.riskScore,
            tags: rule.tags,
            description: params?.description,
            updated_at: rule.updatedAt,
            index_patterns: params?.index,
            is_prebuilt: (params?.immutable as boolean) ?? false,
          };
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total: result.total,
                page: result.page,
                per_page: result.perPage,
                rules,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`Error in ${SECURITY_FIND_RULES_TOOL_ID} tool: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Error searching rules: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
};
