/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { SIEM_RULE_MIGRATION_RULES_PATH } from '../../../../../common/siem_migrations/constants';
import type { GetRuleMigrationRulesResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import { createToolErrorResult, createMissingPrivilegeError } from '../common/tool_results';
import { MigrationId } from '../common/schemas';
import { getValidateEsql } from '../../../../lib/siem_migrations/common/task/agent/helpers/validate_esql';
import {
  generateAssistantComment,
  cleanMarkdown,
} from '../../../../lib/siem_migrations/common/task/util/comments';
import { SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID } from './tool_ids';
import {
  getEsqlQueryUpdatePatch,
  getUpdatePrebuiltRulePatch,
} from './utils/update_translated_rule';

const PreBuiltRuleSchema = z.object({
  id: z.string().min(1).max(256).describe('The correct prebuilt rule id.'),
  title: z.string().min(1).max(500).describe('The title of the prebuilt rule.'),
});

const schema = z.object({
  migration_id: MigrationId,
  rule_id: z
    .string()
    .min(1)
    .max(256)
    .describe('The id of the specific rule migration item to update.'),
  esql_query: z
    .string()
    .min(1)
    .max(10_000)
    .optional()
    .describe(
      'The corrected ES|QL query. Provide ONLY when the translated query needs to be updated. ' +
        'Can be combined with new integration_ids, provided the index in the query is created ' +
        'from those integrations. Mutually exclusive with prebuilt_rule — if both are supplied, ' +
        'prebuilt_rule takes precedence.'
    ),
  prebuilt_rule: PreBuiltRuleSchema.optional().describe(
    'The correct prebuilt rule match (id and title). Provide ONLY when the matched prebuilt rule ' +
      'needs to be updated. Can be combined with new integration_ids, provided the prebuilt rule ' +
      'relies on data from those integrations. Mutually exclusive with esql_query — if both are ' +
      'supplied, prebuilt_rule takes precedence.'
  ),
  integration_ids: z
    .array(z.string().min(1).max(256))
    .min(1)
    .max(10)
    .optional()
    .describe(
      'The correct integration id(s). Must be supplied together with esql_query or prebuilt_rule — ' +
        'integration_ids cannot be updated on its own. Pass one or more integration ids (up to 10).'
    ),
  comment: z
    .string()
    .min(1)
    .max(10_000)
    .describe(
      'REQUIRED. A markdown explanation of what you changed and why, covering every aspect you ' +
        "are updating in this call. It is appended to the rule's comment history and shown to the " +
        'user in the rule details flyout, so write it for that reader. Follow the examples in the ' +
        'skill instructions for the expected shape.'
    ),
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_RULES_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

export const updateTranslatedRuleTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });
  const validateEsql = getValidateEsql({ logger });

  return {
    id: SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID,
    type: ToolType.builtin,
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    annotations: {
      title: 'Update Translated Rule',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    confirmation: { askUser: 'always' },
    description: `Update one or more aspects of a specific SIEM migration translated rule. Mutating — requires user confirmation. Each successful call appends a comment to the rule history.

Mandatory params:
- migration_id (required): the id of the specific migration
- rule_id (required): the id of the specific rule migration item to update
- comment (required): markdown explanation of what changed and why — appended to the rule's comment history and shown to the user in the rule details flyout

Two write paths — supply exactly one:

### Write path 1 — prebuilt rule match:
- prebuilt_rule: corrected prebuilt rule match (id and title, both required)
- integration_ids (optional): corrected integration ids related to the prebuilt rule

### Write path 2 — ES|QL query:
- esql_query: corrected ES|QL query (validated before applying)
- integration_ids (optional): corrected integration ids whose index pattern the query uses

If both prebuilt_rule and esql_query are supplied, prebuilt_rule takes precedence.
integration_ids cannot be updated on its own — always supply it with esql_query or prebuilt_rule.
`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async (input, { request }) => {
      const {
        migration_id: migrationId,
        rule_id: ruleId,
        esql_query: esqlQuery,
        prebuilt_rule: prebuiltRule,
        integration_ids: integrationIds,
        comment,
      } = input;

      const hasPrivilege = await hasRuleMigrationPrivileges(core, request);
      if (!hasPrivilege) {
        return createMissingPrivilegeError('update a translated migration rule');
      }

      // Determine patch via two-branch dispatch.
      // prebuilt_rule takes precedence; integration_ids alone is not a valid update.
      let patchResult;
      if (prebuiltRule != null) {
        patchResult = getUpdatePrebuiltRulePatch(prebuiltRule, integrationIds);
      } else if (esqlQuery != null) {
        patchResult = await getEsqlQueryUpdatePatch(esqlQuery, integrationIds, { validateEsql });
      } else {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message:
                  'Provide either esql_query or prebuilt_rule. integration_ids cannot be updated ' +
                  'on its own — supply it together with a new esql_query (when the index pattern ' +
                  'changes) or a new prebuilt_rule.',
              },
            },
          ],
        };
      }

      if (!patchResult.ok) {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: patchResult.error },
            },
          ],
        };
      }

      const elasticRule = patchResult.patch;

      // The PATCH persists via an ES partial-doc update, which replaces arrays wholesale, so the
      // new comment must be appended here and the full array resent.
      const currentResponse = await callSelfClient<GetRuleMigrationRulesResponse>(
        request,
        buildPath(migrationId),
        { method: 'GET', query: { ids: [ruleId], page: 0, per_page: 1 } }
      );
      if (!currentResponse.ok) {
        return createToolErrorResult(
          currentResponse,
          `Failed to read translated rule "${ruleId}" in migration "${migrationId}"`
        );
      }
      const currentRule = currentResponse.body.data[0];
      if (currentRule == null) {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Rule "${ruleId}" was not found in migration "${migrationId}". Check the rule id and try again.`,
              },
            },
          ],
        };
      }

      const comments = [
        ...(currentRule.comments ?? []),
        generateAssistantComment(cleanMarkdown(comment)),
      ];

      const response = await callSelfClient(request, buildPath(migrationId), {
        method: 'PATCH',
        body: [{ id: ruleId, elastic_rule: elasticRule, comments }],
      });

      if (!response.ok) {
        return createToolErrorResult(
          response,
          `Failed to update translated rule "${ruleId}" in migration "${migrationId}"`
        );
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              ok: true,
              migration_id: migrationId,
              rule_id: ruleId,
              ...(response.body != null ? (response.body as object) : {}),
            },
          },
        ],
      };
    },
  };
};
