/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { ExperimentalFeatures } from '../../../common';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';

const TRANSLATED_RULES_INDEX_BASE = '.kibana-siem-rule-migrations-rules' as const;

/**
 * Builds the per-space translated rules index name. Used only by the search
 * and get tools, which are read-only.
 */
const getRulesIndexName = (spaceId: string) => `${TRANSLATED_RULES_INDEX_BASE}-${spaceId}`;

const migrationIdField = z
  .string()
  .uuid()
  .describe('UUID of the migration that scopes the rules to read. Required.');

const ruleIdField = z
  .string()
  .min(1)
  .describe('ID of the translated rule (the ES `_id` of the migration rule document).');

/* -------------------------------------------------------------------------- */
/*  Tool 1: list/search translated rules in a migration                       */
/* -------------------------------------------------------------------------- */

const searchSchema = z.object({
  migration_id: migrationIdField,
  query: z
    .string()
    .optional()
    .describe(
      'Optional case-insensitive substring match against the rule name. Omit to list everything.'
    ),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe('Maximum rules to return (default 20, max 100).'),
});

export const SECURITY_MIGRATION_TRANSLATED_RULES_SEARCH_TOOL_ID = securityTool(
  'migration_translated_rules_search'
);

export const migrationTranslatedRulesSearchTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof searchSchema> => ({
  id: SECURITY_MIGRATION_TRANSLATED_RULES_SEARCH_TOOL_ID,
  type: ToolType.builtin,
  description:
    'List translated detection rules from a specific SIEM rule migration. Use this BEFORE editing a translated rule, to find the rule by name or to enumerate the migration. Optionally filter by name substring. Returns id, name, severity, risk_score, translation_result, and the elastic_rule.query for each hit.',
  schema: searchSchema,
  tags: ['security', 'siem-migrations', 'rules', 'list'],
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) => {
      if (!experimentalFeatures?.automaticMigrationSkillsEnabled) {
        return {
          status: 'unavailable',
          reason:
            'Automatic Migration Skills are not enabled. Set the `automaticMigrationSkillsEnabled` experimental feature flag.',
        };
      }
      return getAgentBuilderResourceAvailability({ core, request, logger });
    },
  },
  handler: async (
    { migration_id: migrationId, query, max_results: maxResults },
    { esClient, spaceId }
  ) => {
    try {
      const index = getRulesIndexName(spaceId);

      const must: Array<Record<string, unknown>> = [{ term: { migration_id: migrationId } }];
      if (query) {
        must.push({
          wildcard: {
            'elastic_rule.title': {
              value: `*${query}*`,
              case_insensitive: true,
            },
          },
        });
      }

      const result = await esClient.asCurrentUser.search<Record<string, unknown>>({
        index,
        size: maxResults,
        query: { bool: { must } },
        _source: [
          'migration_id',
          'translation_result',
          'status',
          'elastic_rule.title',
          'elastic_rule.severity',
          'elastic_rule.risk_score',
          'elastic_rule.query',
          'elastic_rule.description',
          'original_rule.title',
          'original_rule.vendor',
        ],
      });

      const rules = result.hits.hits.map((hit) => ({
        id: hit._id,
        ...(hit._source ?? {}),
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              migration_id: migrationId,
              total: rules.length,
              rules,
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`migration_translated_rules_search failed: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to list translated rules: ${error.message}`,
            },
          },
        ],
      };
    }
  },
});

/* -------------------------------------------------------------------------- */
/*  Tool 2: get a single translated rule by id                                */
/* -------------------------------------------------------------------------- */

const getSchema = z.object({
  migration_id: migrationIdField,
  rule_id: ruleIdField,
});

export const SECURITY_MIGRATION_TRANSLATED_RULE_GET_TOOL_ID = securityTool(
  'migration_translated_rule_get'
);

export const migrationTranslatedRuleGetTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof getSchema> => ({
  id: SECURITY_MIGRATION_TRANSLATED_RULE_GET_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Read the full draft of a single translated detection rule (elastic_rule.query, severity, risk_score, threat[], description, etc.). Use this BEFORE proposing a correction so you can quote the current values back to the operator and produce an accurate diff.',
  schema: getSchema,
  tags: ['security', 'siem-migrations', 'rules', 'get'],
  availability: {
    cacheMode: 'space',
    handler: async ({ request }) => {
      if (!experimentalFeatures?.automaticMigrationSkillsEnabled) {
        return {
          status: 'unavailable',
          reason:
            'Automatic Migration Skills are not enabled. Set the `automaticMigrationSkillsEnabled` experimental feature flag.',
        };
      }
      return getAgentBuilderResourceAvailability({ core, request, logger });
    },
  },
  handler: async ({ migration_id: migrationId, rule_id: ruleId }, { esClient, spaceId }) => {
    try {
      const index = getRulesIndexName(spaceId);
      const result = await esClient.asCurrentUser.get<Record<string, unknown>>({
        index,
        id: ruleId,
      });

      const source = (result._source ?? {}) as { migration_id?: string };
      if (source.migration_id !== migrationId) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Rule ${ruleId} is not part of migration ${migrationId}.`,
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
              id: result._id,
              ...source,
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`migration_translated_rule_get failed: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to get translated rule ${ruleId}: ${error.message}`,
            },
          },
        ],
      };
    }
  },
});
