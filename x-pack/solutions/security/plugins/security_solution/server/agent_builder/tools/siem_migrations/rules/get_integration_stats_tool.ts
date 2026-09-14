/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import { z } from '@kbn/zod/v4';
import { NonEmptyString } from '../../../../../common/api/model/primitives.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import type { GetSiemMigrationContext } from '../../../../lib/siem_migrations/get_siem_migration_context';
import type { RuleMigrationAllIntegrationsStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import { createMissingPrivilegeError } from '../common/tool_results';
import { MIGRATION_ID_NOT_FOUND } from '../../../../lib/siem_migrations/common/translations';
import { SIEM_MIGRATION_GET_INTEGRATION_STATS_TOOL_ID } from './tool_ids';

const schema = z.object({
  migration_id: NonEmptyString.describe(
    'The id of the rule migration to get integration stats for.'
  ),
  ids: z
    .array(NonEmptyString)
    .max(200)
    .optional()
    .describe('Optional migration rule item ids that restrict the aggregation scope.'),
});

export const getIntegrationStatsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService,
  getSiemMigrationContext: GetSiemMigrationContext
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SIEM_MIGRATION_GET_INTEGRATION_STATS_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Get Migration Integration Stats',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    description: `Get per-integration rule counts for the installable rules of one Automatic Rule Migration.

Returns \`[{ id, total_rules }]\` — each inferred integration id with the number of installable rules in scope that reference it. Only rules that are fully translated and not yet installed are counted, so these are the integrations the pending installation depends on. A rule referencing multiple integrations is counted once for every integration it references, consistent with the Automatic Migrations management page. Rules with no inferred integration are not represented in any entry.

Use this for integration readiness, not for counts — take the authoritative installable total from \`get_rule_migration_translation_stats\`. The sum of \`total_rules\` can exceed it because a rule appears once per integration it references.

Pass \`ids\` to restrict the aggregation to a selected migration-rule scope. Read-only.`,
    schema,
    tags: ['security', 'siem-migration', 'rules', 'integrations'],
    handler: async ({ migration_id: migrationId, ids }, { request, spaceId }) => {
      if (!(await hasRuleMigrationPrivileges(core, request))) {
        return createMissingPrivilegeError('get migration integration stats');
      }

      let stats: RuleMigrationAllIntegrationsStats;
      try {
        const { getRulesClient } = await getSiemMigrationContext(request, spaceId);
        const rulesClient = getRulesClient();

        const migration = await rulesClient.data.migrations.get(migrationId);
        if (!migration) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: MIGRATION_ID_NOT_FOUND(migrationId) },
              },
            ],
          };
        }

        stats = await rulesClient.data.items.getIntegrationStats(migrationId, {
          ids: ids && ids.length > 0 ? ids : undefined,
          // Count only rules that will actually be installed (fully translated, not yet installed)
          // so "rules impacted" in the skill's readiness table matches the install scope.
          installable: true,
        });
      } catch (err) {
        logger.error(`getIntegrationStatsTool: failed for migration "${migrationId}": ${err}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Failed to get integration stats for "${migrationId}": ${
                  err?.message ?? err
                }`,
              },
            },
          ],
        };
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: stats,
          },
        ],
      };
    },
  };
};
