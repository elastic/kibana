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
 * Builds the per-space translated rules index name.
 *
 * Mirrors `SiemMigrationsBaseDataService.getAdapterIndexName('rules')` + the
 * `IndexPatternAdapter` `${baseName}-${spaceId}` convention. We re-derive the
 * pattern here instead of importing the data service because inline-style
 * registry tools must not pull in plugin-internal services — keeping this
 * formula local also makes the tool surface OSS-friendly.
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

/* -------------------------------------------------------------------------- */
/*  Tool 3: update a translated rule (destructive — requires confirmation)    */
/* -------------------------------------------------------------------------- */

const updateSchema = z.object({
  migration_id: migrationIdField,
  rule_id: ruleIdField,
  patch: z
    .object({
      query: z.string().optional().describe('Replacement ES|QL query.'),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      risk_score: z.number().int().min(0).max(100).optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .describe(
      'Partial replacement for the rule. Only listed fields are written; omitted fields are preserved. Use this to apply the diff the operator approved.'
    ),
  confirm: z
    .literal(true)
    .describe(
      'Operator consent for the destructive update. Must equal `true`. This field is the structural gate — never invoke this tool without it.'
    ),
});

export const SECURITY_MIGRATION_TRANSLATED_RULE_UPDATE_TOOL_ID = securityTool(
  'migration_translated_rule_update'
);

export const migrationTranslatedRuleUpdateTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof updateSchema> => ({
  id: SECURITY_MIGRATION_TRANSLATED_RULE_UPDATE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Persist a corrected draft of a translated detection rule. Destructive (overwrites the prior translator output). Requires explicit operator consent via the `confirm: true` field — the schema enforces consent structurally, not via prose. Run AFTER the operator approves the diff. The rule still has to be installed via the migration install flow afterwards.',
  schema: updateSchema,
  tags: ['security', 'siem-migrations', 'rules', 'update', 'destructive'],
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
    { migration_id: migrationId, rule_id: ruleId, patch, confirm: _confirm },
    { esClient, spaceId }
  ) => {
    try {
      const index = getRulesIndexName(spaceId);

      const existing = await esClient.asCurrentUser.get<{ migration_id?: string }>({
        index,
        id: ruleId,
      });
      if (existing._source?.migration_id !== migrationId) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Rule ${ruleId} is not part of migration ${migrationId}; refusing to update.`,
              },
            },
          ],
        };
      }

      const elasticRulePatch: Record<string, unknown> = {};
      if (patch.query !== undefined) elasticRulePatch.query = patch.query;
      if (patch.severity !== undefined) elasticRulePatch.severity = patch.severity;
      if (patch.risk_score !== undefined) elasticRulePatch.risk_score = patch.risk_score;
      if (patch.description !== undefined) elasticRulePatch.description = patch.description;
      if (patch.tags !== undefined) elasticRulePatch.tags = patch.tags;

      if (Object.keys(elasticRulePatch).length === 0) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message:
                  'Patch contained no fields to update. Provide at least one of: query, severity, risk_score, description, tags.',
              },
            },
          ],
        };
      }

      await esClient.asCurrentUser.update({
        index,
        id: ruleId,
        doc: { elastic_rule: elasticRulePatch },
        refresh: 'wait_for',
      });

      logger.info(
        `Translated rule ${ruleId} in migration ${migrationId} updated with fields: ${Object.keys(
          elasticRulePatch
        ).join(', ')}`
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              success: true,
              migration_id: migrationId,
              rule_id: ruleId,
              updated_fields: Object.keys(elasticRulePatch),
              note: 'The rule still has to be installed via the migration install flow.',
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`migration_translated_rule_update failed: ${error.message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to update translated rule ${ruleId}: ${error.message}`,
            },
          },
        ],
      };
    }
  },
});
