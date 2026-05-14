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
import type { MigrationTranslationResult } from '../../../common/siem_migrations/model/common.gen';
import type {
  ElasticRulePartial,
  UpdateRuleMigrationRule,
} from '../../../common/siem_migrations/model/rule_migration.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import type { ExperimentalFeatures } from '../../../common';
import type { SiemMigrationsService } from '../../lib/siem_migrations/siem_migrations_service';
import { transformToInternalUpdateRuleMigrationData } from '../../lib/siem_migrations/rules/api/util/update_rules';
import { SiemMigrationsAuditActions } from '../../lib/siem_migrations/common/api/util/audit';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { securityTool } from './constants';
import { buildSiemMigrationsClientDependencies } from './util/siem_migrations_client_dependencies';

const TRANSLATED_RULES_INDEX_BASE = '.kibana-siem-rule-migrations-rules' as const;

/**
 * Builds the per-space translated rules index name. Used only by the search
 * and get tools, which are read-only and have no canonical data-client read
 * method that takes a free-form name substring filter. The destructive update
 * tool delegates to `ruleMigrationsClient.data.items.update`, which derives
 * its own index name via the migration data service.
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
/*                                                                            */
/*  The write delegates to `ruleMigrationsClient.data.items.update`, which    */
/*  derives the index name from the migration data service, applies the      */
/*  canonical document shape (timestamps, updated_by profile uid), and runs  */
/*  the operation as an ES bulk under the hood. Pre-write, every patched     */
/*  query is funneled through `transformToInternalUpdateRuleMigrationData`   */
/*  from `rules/api/util/update_rules.ts`, which is the same helper the      */
/*  PATCH ${SIEM_RULE_MIGRATION_RULES_PATH} route uses — so the              */
/*  `translation_result` flip on save is byte-for-byte identical to the      */
/*  route path. The bulk update is atomic from the tool's reporting          */
/*  perspective (matching the route's `{ updated: true }` semantics):        */
/*  pre-write skip reasons are surfaced per-rule, but a bulk write error is  */
/*  surfaced as a single batch failure.                                      */
/* -------------------------------------------------------------------------- */

const ruleUpdatePatchSchema = z
  .object({
    query: z
      .string()
      .optional()
      .describe(
        'Replacement ES|QL query. The migration data client invokes the canonical `convertEsqlQueryToTranslationResult` helper on save and updates `translation_result` to `full` (no parser errors) / `partial` (parser errors) / `untranslatable` (empty).'
      ),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    risk_score: z.number().int().min(0).max(100).optional(),
    description: z.string().optional(),
  })
  .describe(
    'Partial replacement for one rule. Only listed fields are written; omitted fields are preserved. At least one field is required (the handler reports an empty patch as a per-rule skip). The migration model does not carry rule tags — for tag changes the operator should install the rule and edit it in Detection Engine.'
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
  experimentalFeatures: ExperimentalFeatures,
  siemMigrationsService: SiemMigrationsService
): BuiltinToolDefinition<typeof updateSchema> => ({
  id: SECURITY_MIGRATION_TRANSLATED_RULE_UPDATE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Persist corrected drafts of one or more translated detection rules in a single batch (1–50 rules per call). ' +
    'Destructive — overwrites the prior translator output for every rule listed. ' +
    'Requires explicit operator consent via the `confirm: true` field; the schema enforces consent structurally and rejects calls without it. ' +
    'Run AFTER the operator approves the diff for every affected rule. ' +
    'On save, the canonical migration data client re-runs `convertEsqlQueryToTranslationResult` on any replaced `query` and updates `translation_result` (`full` / `partial` / `untranslatable`) — same helper the migration PATCH route uses. ' +
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
    { request, spaceId }
  ) => {
    try {
      const { coreStart, dependencies } = await buildSiemMigrationsClientDependencies(
        core,
        request,
        experimentalFeatures
      );

      const currentUser = coreStart.security.authc.getCurrentUser(request);
      if (!currentUser) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: 'Authenticated user required to update translated rules.' },
            },
          ],
        };
      }

      const ruleMigrationsClient = siemMigrationsService.createRulesClient({
        request,
        currentUser,
        spaceId,
        dependencies,
      });

      const { data: probeRules } = await ruleMigrationsClient.data.items.get(migrationId, {
        size: 1,
      });
      if (probeRules.length === 0) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Migration ${migrationId} not found.` },
            },
          ],
        };
      }

      const updateRequests: UpdateRuleMigrationRule[] = [];
      const fieldsByRuleId = new Map<string, string[]>();
      const skipped: PerRuleUpdateResult[] = [];

      const classifyEntry = (entry: z.infer<typeof ruleUpdateEntrySchema>) => {
        const { rule_id: ruleId, patch } = entry;
        const elasticRulePatch: ElasticRulePartial = {};
        if (patch.query !== undefined) elasticRulePatch.query = patch.query;
        if (patch.severity !== undefined) elasticRulePatch.severity = patch.severity;
        if (patch.risk_score !== undefined) elasticRulePatch.risk_score = patch.risk_score;
        if (patch.description !== undefined) elasticRulePatch.description = patch.description;

        const fields = Object.keys(elasticRulePatch);
        if (fields.length === 0) {
          skipped.push({
            rule_id: ruleId,
            success: false,
            error:
              'Patch contained no recognised fields. Provide at least one of: query, severity, risk_score, description.',
          });
          return;
        }
        fieldsByRuleId.set(ruleId, fields);
        updateRequests.push({ id: ruleId, elastic_rule: elasticRulePatch });
      };

      for (const entry of updates) {
        classifyEntry(entry);
      }

      if (updateRequests.length === 0) {
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                migration_id: migrationId,
                total: updates.length,
                succeeded: 0,
                failed: skipped.length,
                per_rule: skipped,
                note: 'No writable entries in this batch.',
              },
            },
          ],
        };
      }

      const transformed = updateRequests.map(transformToInternalUpdateRuleMigrationData);
      const idsForAudit = updateRequests.map((r) => r.id);
      const auditLogger = coreStart.security.audit.asScoped(request);
      const auditMessage = `[migrationType=rules]User updated translated rules in migration with [id=${migrationId}, ids=${idsForAudit.join(
        ','
      )}]`;

      try {
        await ruleMigrationsClient.data.items.update(transformed);
        auditLogger.log({
          message: auditMessage,
          event: {
            action: SiemMigrationsAuditActions.SIEM_MIGRATION_UPDATED_RULE,
            category: ['database'],
            type: ['change'],
            outcome: 'success',
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        auditLogger.log({
          message: auditMessage,
          event: {
            action: SiemMigrationsAuditActions.SIEM_MIGRATION_UPDATED_RULE,
            category: ['database'],
            type: ['change'],
            outcome: 'failure',
          },
          error: { code: 'BulkUpdateError', message },
        });
        const failedAll: PerRuleUpdateResult[] = updateRequests.map((rule) => ({
          rule_id: rule.id,
          success: false,
          error: message,
        }));
        logger.error(
          `migration_translated_rule_update bulk write failed on migration ${migrationId}: ${message}`
        );
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                migration_id: migrationId,
                total: updates.length,
                succeeded: 0,
                failed: failedAll.length + skipped.length,
                per_rule: [...failedAll, ...skipped],
                note: 'Bulk update failed atomically (same semantics as the migration PATCH route). No rules were modified.',
              },
            },
          ],
        };
      }

      const perRule: PerRuleUpdateResult[] = transformed.map((rule) => {
        const ruleId = rule.id;
        const fields = fieldsByRuleId.get(ruleId) ?? [];
        const translationResult =
          'translation_result' in rule && rule.translation_result !== undefined
            ? rule.translation_result
            : undefined;
        return {
          rule_id: ruleId,
          success: true,
          updated_fields: fields,
          ...(translationResult ? { translation_result: translationResult } : {}),
        };
      });

      logger.info(
        `migration_translated_rule_update batch on migration ${migrationId}: ${perRule.length}/${
          perRule.length + skipped.length
        } written, ${skipped.length} skipped.`
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              migration_id: migrationId,
              total: updates.length,
              succeeded: perRule.length,
              failed: skipped.length,
              per_rule: [...perRule, ...skipped],
              note: 'Written via the canonical migration data client (data.items.update). ES|QL queries are re-validated on save via the same convertEsqlQueryToTranslationResult helper the PATCH route uses. Rules still have to be installed via the migration install flow. For a full LLM re-translation of corrected rules, POST /internal/siem_migrations/rules/{migration_id}/start with retry=selected and selection.ids=[...].',
            },
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`migration_translated_rule_update failed: ${message}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to update translated rules: ${message}` },
          },
        ],
      };
    }
  },
});
