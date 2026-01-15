/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { SiemMigrationsClientGetter } from './create_client_factory';

export const SIEM_MIGRATION_GET_RULES_TOOL_ID = 'security.siem_migration.get_migration_rules';

const getMigrationRulesSchema = z.object({
  migration_id: z.string().min(1).describe('The migration ID to fetch rules from'),
  search_term: z.string().optional().describe('Optional search term to filter rules by title/name'),
  rule_id: z.string().optional().describe('Optional specific rule ID to fetch'),
  page: z.number().optional().default(0).describe('Page number for pagination (0-based)'),
  per_page: z.number().optional().default(10).describe('Number of rules per page (max 100)'),
});

/**
 * Tool to fetch rules from a specific SIEM migration.
 * Returns both the original rule (SPL/AQL) and the translated ES|QL query.
 */
export function createGetMigrationRulesTool(
  getClient: SiemMigrationsClientGetter
): StaticToolRegistration<typeof getMigrationRulesSchema> {
  return {
    id: SIEM_MIGRATION_GET_RULES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Fetch rules from a specific SIEM migration. ' +
      'Returns the original rule (SPL/AQL query) and the translated ES|QL query. ' +
      'Use search_term to find rules by name, or rule_id to get a specific rule. ' +
      'The response includes: rule ID, title, original query, translated ES|QL query, and translation status.',
    schema: getMigrationRulesSchema,
    tags: ['security', 'siem-migration'],
    handler: async (params, context) => {
      try {
        const client = await getClient(context.request);

        const options = {
          filters: {
            searchTerm: params.search_term,
            ids: params.rule_id ? [params.rule_id] : undefined,
          },
          size: Math.min(params.per_page ?? 10, 100),
          from: (params.page ?? 0) * (params.per_page ?? 10),
        };

        const result = await client.data.items.get(params.migration_id, options);

        // Format rules for better readability
        const rules = result.data.map((rule) => ({
          id: rule.id,
          title: rule.original_rule.title,
          vendor: rule.original_rule.vendor,
          status: rule.status,
          translation_result: rule.translation_result,
          original_rule: {
            query: rule.original_rule.query,
            query_language: rule.original_rule.query_language,
            description: rule.original_rule.description,
          },
          elastic_rule: rule.elastic_rule
            ? {
              title: rule.elastic_rule.title,
              query: rule.elastic_rule.query,
              query_language: rule.elastic_rule.query_language,
              description: rule.elastic_rule.description,
              severity: rule.elastic_rule.severity,
              prebuilt_rule_id: rule.elastic_rule.prebuilt_rule_id,
            }
            : null,
          comments: rule.comments,
        }));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                migration_id: params.migration_id,
                total: result.total,
                page: params.page ?? 0,
                per_page: params.per_page ?? 10,
                rules,
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error(`Error fetching migration rules: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to fetch migration rules: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}
