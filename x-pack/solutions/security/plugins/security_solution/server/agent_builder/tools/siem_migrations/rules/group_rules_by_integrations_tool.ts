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
import type { RuleMigrationIntegrationRuleGroups } from '../../../../lib/siem_migrations/rules/data/rule_migrations_data_rules_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import { createMissingPrivilegeError } from '../common/tool_results';
import { MIGRATION_ID_NOT_FOUND } from '../../../../lib/siem_migrations/common/translations';
import { SIEM_MIGRATION_GROUP_RULES_BY_INTEGRATIONS_TOOL_ID } from './tool_ids';

const schema = z.object({
  migration_id: NonEmptyString.describe('The id of the rule migration to group.'),
  ids: z
    .array(NonEmptyString)
    .max(200)
    .optional()
    .describe('Optional migration rule item ids that restrict the grouping scope.'),
});

export const groupRulesByIntegrationsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService,
  getSiemMigrationContext: GetSiemMigrationContext
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SIEM_MIGRATION_GROUP_RULES_BY_INTEGRATIONS_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Group Migration Rules By Integrations',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    description: `Group rules in one Automatic Rule Migration by inferred integration.

Returns each integration id with total, installed, and not-installed rule counts. A rule referencing multiple integrations is counted once in every matching integration group, consistent with the Automatic Migrations management page. Also returns counts for rules without inferred integrations.

Pass ids to restrict the aggregation to a selected migration-rule scope. Read-only.`,
    schema,
    tags: ['security', 'siem-migration', 'rules', 'integrations'],
    handler: async ({ migration_id: migrationId, ids }, { request, spaceId }) => {
      if (!(await hasRuleMigrationPrivileges(core, request))) {
        return createMissingPrivilegeError('group migration rules by integrations');
      }

      let groups: RuleMigrationIntegrationRuleGroups;
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

        groups = await rulesClient.data.items.groupByIntegrations(migrationId, ids);
      } catch (err) {
        logger.error(`groupRulesByIntegrationsTool: failed for migration "${migrationId}": ${err}`);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Failed to group migration rules by integrations for "${migrationId}": ${err?.message ?? err}`,
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
            data: groups,
          },
        ],
      };
    },
  };
};
