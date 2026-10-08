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
import { SIEM_MIGRATION_RULE_UPDATED_TOOL_EVENT } from '../../../../../common/siem_migrations/rules/events';
import type { GetRuleMigrationRulesResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import {
  createToolErrorResult,
  createToolError,
  createMissingPrivilegeError,
} from '../common/tool_results';
import { MigrationId } from '../common/schemas';
import { getValidateEsql } from '../../../../lib/siem_migrations/common/task/agent/helpers/validate_esql';
import {
  generateAssistantComment,
  cleanMarkdown,
} from '../../../../lib/siem_migrations/common/task/util/comments';
import { SIEM_MIGRATION_UPDATE_TRANSLATED_RULE_TOOL_ID } from './tool_ids';
import type { UpdateElasticRulePatch } from './utils/update_translated_rule';
import {
  getEsqlQueryUpdatePatch,
  getUpdatePrebuiltRulePatch,
} from './utils/update_translated_rule';

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
      `The corrected ES|QL query. Provide ONLY when the translated query needs to be updated. Must be supplied together with integration_ids (the integrations whose index the query uses, or [] if none). Mutually exclusive with prebuilt_rule_id — if both are supplied, prebuilt_rule_id takes precedence. When supplied for a rule that currently has a prebuilt rule match, the match is cleared and the rule title and description revert to the original rule values. Cannot be used on rules that are already installed (elastic_rule.id is set).`
    ),
  prebuilt_rule_id: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe(
      `The correct prebuilt rule id (rule_id UUID). Provide ONLY when the matched prebuilt rule needs to be updated. Title, description, severity, risk score and integrations are derived from the prebuilt rule, and any previous ES|QL query is cleared. Cannot be combined with integration_ids. Mutually exclusive with esql_query — if both are supplied, prebuilt_rule_id takes precedence. Cannot be used on rules that are already installed (elastic_rule.id is set).`
    ),
  integration_ids: z
    .array(z.string().min(1).max(256))
    .max(10)
    .optional()
    .describe(
      `The integration id(s) whose index pattern the esql_query uses. Required with esql_query — resend the rule's current integration_ids if they are unchanged, or pass [] if the query uses no integration. Cannot be updated on its own or combined with prebuilt_rule_id. Up to 10 ids.`
    ),
  comment: z
    .string()
    .min(1)
    .max(10_000)
    .describe(
      `REQUIRED. A markdown explanation of what you changed and why, covering every aspect you are updating in this call. It is appended to the rule's comment history and shown to the user in the rule details flyout, so write it for that reader. Follow the examples in the skill instructions for the expected shape.`
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

Rules that are already installed (elastic_rule.id is set) are immutable and cannot be updated — this tool will reject the call.

Two write paths — supply exactly one:

### Write path 1 — prebuilt rule match:
- prebuilt_rule_id: the corrected prebuilt rule id. Title, description, severity, risk score and
  integrations are derived from the prebuilt rule; any previous ES|QL query is cleared. An unknown
  id is rejected. Do not supply integration_ids. If that prebuilt rule is already installed, the
  migration rule becomes installed and can no longer be updated.

### Write path 2 — ES|QL query:
- esql_query: corrected ES|QL query (validated before applying). If the rule currently has a
  prebuilt rule match, supplying esql_query clears the match and resets the title and description
  to the original rule values.
- integration_ids (required): integration ids whose index pattern the query uses — resend the
  rule's current ones if unchanged, or [] if the query uses no integration

If both prebuilt_rule_id and esql_query are supplied, prebuilt_rule_id takes precedence.
integration_ids is only valid with esql_query.
`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async (input, { request, events }) => {
      const {
        migration_id: migrationId,
        rule_id: ruleId,
        esql_query: esqlQuery,
        prebuilt_rule_id: prebuiltRuleId,
        integration_ids: integrationIds,
        comment,
      } = input;

      const hasPrivilege = await hasRuleMigrationPrivileges(core, request);
      if (!hasPrivilege) {
        return createMissingPrivilegeError('update a translated migration rule');
      }

      // Fetch the current rule first — needed for the installed guard, the not-found check,
      // and to detect a prebuilt match that the ES|QL path must clear.
      const currentResponse = await callSelfClient<GetRuleMigrationRulesResponse>(
        request,
        buildPath(migrationId),
        { method: 'GET', query: { ids: [ruleId], page: 0, per_page: 1 } }
      );
      if (!currentResponse.ok) {
        return createToolErrorResult(
          currentResponse,
          `Failed to read translated rule "${ruleId}" in migration "${migrationId}" : ${currentResponse.message}`
        );
      }
      const currentRule = currentResponse.body.data[0];
      if (currentRule == null) {
        return createToolError(
          `Translated rule "${ruleId}" not found in migration "${migrationId}"`
        );
      }

      // Installed rules are immutable — no write path applies.
      if (currentRule.elastic_rule?.id != null) {
        const ruleTitle = currentRule.elastic_rule.title ?? currentRule.original_rule.title;
        return createToolError(
          `Cannot update translated rule "${ruleId}" in migration "${migrationId}": ` +
            `it is already installed as "${ruleTitle}" (elastic_rule.id is set).`
        );
      }

      // prebuilt_rule_id takes precedence. Its integrations are derived server-side, so
      // integration_ids is only valid on the ES|QL path.
      let elasticRulePatch: UpdateElasticRulePatch;
      try {
        if (prebuiltRuleId) {
          if (integrationIds != null) {
            return createToolError(
              'integration_ids cannot be combined with prebuilt_rule_id — integrations are derived from the prebuilt rule.'
            );
          }
          elasticRulePatch = getUpdatePrebuiltRulePatch(prebuiltRuleId);
        } else if (esqlQuery) {
          // Required so an unmatched prebuilt rule doesn't keep the prebuilt rule's integrations
          // (the PATCH is a partial merge). `[]` means the query uses no integration.
          if (integrationIds === undefined) {
            return createToolError(
              'integration_ids is required with esql_query — supply the integration id(s) whose index pattern the query uses, or [] if it uses none.'
            );
          }
          elasticRulePatch = await getEsqlQueryUpdatePatch(esqlQuery, integrationIds, {
            validateEsql,
            currentRule,
          });
        } else {
          return createToolError('Provide either esql_query or prebuilt_rule_id.');
        }

        const comments = [
          ...(currentRule.comments ?? []),
          generateAssistantComment(cleanMarkdown(comment)),
        ];

        const response = await callSelfClient(request, buildPath(migrationId), {
          method: 'PATCH',
          body: [{ id: ruleId, elastic_rule: elasticRulePatch, comments }],
        });

        if (!response.ok) {
          return createToolErrorResult(
            response,
            `Failed to update translated rule "${ruleId}" in migration "${migrationId}"`
          );
        }

        events.sendUiEvent(SIEM_MIGRATION_RULE_UPDATED_TOOL_EVENT, { migrationId, ruleId });

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
      } catch (error) {
        return createToolError(
          error instanceof Error ? error.message : 'Failed to update translated rule'
        );
      }
    },
  };
};
