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
import { parseEsqlQuery } from '@kbn/securitysolution-utils';
import {
  MigrationTranslationResultEnum,
  type MigrationTranslationResult,
} from '../../../common/siem_migrations/model/common.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { ExperimentalFeatures } from '../../../common';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';

/**
 * Mirror of the in-tree route helper
 * `lib/siem_migrations/rules/api/util/update_rules.ts#convertEsqlQueryToTranslationResult`.
 *
 * Inlined here (rather than imported) so this tool stays inside the
 * `BuiltinToolDefinition` boundary — handlers only get `esClient`,
 * `savedObjectsClient`, `spaceId`, `request`, NOT plugin-internal services.
 * Long-term, this update path should call the existing
 * `PATCH ${SIEM_RULE_MIGRATION_RULES_PATH}` route or move to a registry
 * tool with access to `ruleMigrationsClient`; see the "Known Limitations"
 * section in `skills/automatic_migration/README.md`.
 */
const convertQueryToTranslationResult = (query: string): MigrationTranslationResult => {
  if (query === '') {
    return MigrationTranslationResultEnum.untranslatable;
  }
  return parseEsqlQuery(query).errors.length === 0
    ? MigrationTranslationResultEnum.full
    : MigrationTranslationResultEnum.partial;
};

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
/*  Tool 3: update translated rules (destructive — requires confirmation)     */
/*                                                                            */
/*  Accepts an ARRAY of per-rule patches so the same call covers single-rule  */
/*  corrections AND bulk corrections (e.g. applying the same MITRE remap to   */
/*  N rules, or different fixes across a set of related rules). One           */
/*  structural confirmation covers every entry in `updates`.                  */
/*                                                                            */
/*  Capped at 50 entries per call — bulk-edit-via-chat is the explicit epic   */
/*  success criterion, but unbounded batches belong in the migration          */
/*  orchestrator, not in a chat tool. If the operator needs a wider sweep     */
/*  the agent should split the batch and surface each partial before the      */
/*  next confirmation.                                                        */
/* -------------------------------------------------------------------------- */

const ruleUpdatePatchSchema = z
  .object({
    query: z
      .string()
      .optional()
      .describe(
        'Replacement ES|QL query. The handler re-runs `parseEsqlQuery` on save and updates `translation_result` to `full` (no errors) / `partial` (parser errors) / `untranslatable` (empty), mirroring the in-tree route helper.'
      ),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    risk_score: z.number().int().min(0).max(100).optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .describe(
    'Partial replacement for one rule. Only listed fields are written; omitted fields are preserved. At least one field is required (the handler rejects empty patches per entry).'
  );

const ruleUpdateEntrySchema = z.object({
  rule_id: ruleIdField,
  patch: ruleUpdatePatchSchema,
});

const updateSchema = z.object({
  migration_id: migrationIdField,
  updates: z
    .array(ruleUpdateEntrySchema)
    .min(1)
    .max(50)
    .describe(
      'One or more per-rule update entries. For a single-rule correction pass an array of length 1. For bulk corrections list each rule with its patch — patches MAY differ per rule (e.g. rule A gets an ES|QL fix, rule B gets a severity bump). Capped at 50 per call.'
    ),
  confirm: z
    .literal(true)
    .describe(
      'Operator consent for the entire batch. ONE confirmation covers every entry in `updates`. The schema rejects calls without `confirm: true` — never substitute prose. The agent MUST surface the impacted rule list and a diff preview to the operator before invoking this tool.'
    ),
});

export const SECURITY_MIGRATION_TRANSLATED_RULE_UPDATE_TOOL_ID = securityTool(
  'migration_translated_rule_update'
);

interface PerRuleUpdateResult {
  rule_id: string;
  success: boolean;
  updated_fields?: string[];
  translation_result?: MigrationTranslationResult;
  error?: string;
}

export const migrationTranslatedRuleUpdateTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof updateSchema> => ({
  id: SECURITY_MIGRATION_TRANSLATED_RULE_UPDATE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Persist corrected drafts of one or more translated detection rules in a single batch (1–50 rules per call). ' +
    'Destructive — overwrites the prior translator output for every rule listed. ' +
    'Requires explicit operator consent via the `confirm: true` field; the schema enforces consent structurally and rejects calls without it. ' +
    'Run AFTER the operator approves the diff for every affected rule. ' +
    'On save, the handler re-runs `parseEsqlQuery` on any replaced `query` and updates `translation_result` (`full` / `partial` / `untranslatable`) — so the rule status reflects the corrected query immediately. ' +
    'Rules still have to be installed via the migration install flow afterwards.',
  schema: updateSchema,
  tags: ['security', 'siem-migrations', 'rules', 'update', 'destructive', 'bulk'],
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
    { migration_id: migrationId, updates, confirm: _confirm },
    { esClient, spaceId }
  ) => {
    const index = getRulesIndexName(spaceId);

    const applyOne = async (
      entry: z.infer<typeof ruleUpdateEntrySchema>
    ): Promise<PerRuleUpdateResult> => {
      const { rule_id: ruleId, patch } = entry;
      try {
        const existing = await esClient.asCurrentUser.get<{ migration_id?: string }>({
          index,
          id: ruleId,
        });
        if (existing._source?.migration_id !== migrationId) {
          return {
            rule_id: ruleId,
            success: false,
            error: `Rule is not part of migration ${migrationId}; refusing to update.`,
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
            rule_id: ruleId,
            success: false,
            error:
              'Patch contained no recognised fields. Provide at least one of: query, severity, risk_score, description, tags.',
          };
        }

        const doc: Record<string, unknown> = { elastic_rule: elasticRulePatch };
        let translationResult: MigrationTranslationResult | undefined;
        if (patch.query !== undefined) {
          translationResult = convertQueryToTranslationResult(patch.query);
          doc.translation_result = translationResult;
        }

        await esClient.asCurrentUser.update({
          index,
          id: ruleId,
          doc,
          refresh: 'wait_for',
        });

        return {
          rule_id: ruleId,
          success: true,
          updated_fields: Object.keys(elasticRulePatch),
          ...(translationResult ? { translation_result: translationResult } : {}),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(
          `migration_translated_rule_update: rule ${ruleId} failed in migration ${migrationId}: ${message}`
        );
        return { rule_id: ruleId, success: false, error: message };
      }
    };

    const perRule: PerRuleUpdateResult[] = [];
    for (const entry of updates) {
      // Sequential application keeps Elasticsearch back-pressure manageable
      // and produces a deterministic per-rule result order for the report.

      perRule.push(await applyOne(entry));
    }

    const succeeded = perRule.filter((entry) => entry.success).length;
    const failed = perRule.length - succeeded;

    logger.info(
      `migration_translated_rule_update batch on migration ${migrationId}: ${succeeded}/${perRule.length} succeeded, ${failed} failed.`
    );

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            migration_id: migrationId,
            total: updates.length,
            succeeded,
            failed,
            per_rule: perRule,
            note: 'Updated rules still have to be installed via the migration install flow. ES|QL queries are re-validated on save (translation_result flips to full / partial / untranslatable). For a full LLM re-translation of corrected rules, POST /internal/siem_migrations/rules/{migration_id}/start with retry=selected and selection.ids=[...].',
          },
        },
      ],
    };
  },
});
