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

const PreBuiltRuleSchema = z.object({
  id: z.string().min(1).describe('The correct prebuilt rule id.'),
  title: z.string().min(1).describe('The title of the prebuilt rule.'),
});

const schema = z.object({
  migration_id: MigrationId,
  rule_id: z.string().min(1).describe('The id of the specific rule migration item to update.'),
  esql_query: z
    .string()
    .min(1)
    .optional()
    .describe(
      'The corrected ES|QL query. Provide ONLY when the translated query needs to be updated. ' +
        'Can be combined with new integration_ids, provided the index in the query is created ' +
        'from those integrations.'
    ),
  prebuilt_rule: PreBuiltRuleSchema.optional().describe(
    'The correct prebuilt rule id. Provide ONLY when the matched prebuilt rule needs to be ' +
      'updated. Can be combined with new integration_ids, provided the prebuilt rule relies ' +
      'on data from those integrations.'
  ),
  integration_ids: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'The correct integration id(s). Provide ONLY when the matched integration(s) need to be ' +
        'updated. Pass one or more integration ids. Can be combined with a new esql_query or ' +
        'prebuilt_rule.id that relies on data from these integrations.'
    ),
  comment: z
    .string()
    .min(1)
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
      idempotentHint: true,
      openWorldHint: false,
    },
    confirmation: { askUser: 'always' },
    description: `Update one or more aspects of a specific SIEM migration translated rule. Mutating — requires user confirmation.

Mandatory Params:
- migration_id (required): the id of the specific migration
- rule_id (required): the id of the specific rule migration item to update
- comment (required): markdown explanation of what changed and why — appended to the rule's comment history and shown to the user in the rule details flyout

### when updating prebuilt rule match:
- prebuilt_rule: corrected prebuilt rule match (id and title)
- integration_ids: corrected integration match(es) related to the prebuilt rule being updated as an array of one or more ids

### when updating integration match(es):
- integration_ids: corrected integration match(es) as an array of one or more ides
- New esql_query based on the new index obtained from the new recommended integration(s).

### when updating ES|QL query:
- esql_query: corrected ES|QL query (validated before applying)
- integration_ids: corrected integration match(es) as an array of one or more ids
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

      const { id: prebuiltRuleId, title: prebuiltRuleTitle } = prebuiltRule ?? {};

      const hasPrivilege = await hasRuleMigrationPrivileges(core, request);
      if (!hasPrivilege) {
        return createMissingPrivilegeError('update a translated migration rule');
      }

      if (esqlQuery == null && prebuiltRuleId == null && integrationIds == null) {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message:
                  'At least one of esql_query, prebuilt_rule_id, or integration_ids must be provided.',
              },
            },
          ],
        };
      }

      if (esqlQuery != null) {
        if (/\[(macro|lookup):.*?\]/.test(esqlQuery)) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message:
                    'ES|QL query contains unresolved macro or lookup placeholders. Resolve them before applying the update.',
                },
              },
            ],
          };
        }

        const { error: validationError } = await validateEsql({ query: esqlQuery });
        if (validationError) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: `ES|QL validation failed: ${validationError}` },
              },
            ],
          };
        }
      }

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

      const elasticRule = {
        ...(esqlQuery != null ? { query: esqlQuery, query_language: 'esql' as const } : {}),
        ...(prebuiltRuleId != null ? { prebuilt_rule_id: prebuiltRuleId } : {}),
        ...(integrationIds != null ? { integration_ids: integrationIds } : {}),
        ...(prebuiltRuleTitle != null ? { title: prebuiltRuleTitle } : {}),
      };

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
