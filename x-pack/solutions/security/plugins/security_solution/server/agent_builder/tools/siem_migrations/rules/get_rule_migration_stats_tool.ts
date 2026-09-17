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
import { SIEM_RULE_MIGRATION_STATS_PATH } from '../../../../../common/siem_migrations/constants';
import type { GetRuleMigrationStatsResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { NonEmptyString } from '../../../../../common/api/model/primitives.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import { createMissingPrivilegeError, createToolErrorResult } from '../common/tool_results';
import { SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID } from './tool_ids';

const schema = z.object({
  migration_id: NonEmptyString.describe('The id of the rule migration whose stats to retrieve.'),
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_STATS_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

export const getRuleMigrationStatsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Get Rule Migration Stats',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    description: `Get task-progress stats for a single Automatic Rule Migration.

Returns { id, name, status, items: { total, pending, processing, completed, failed }, created_at, last_updated_at, vendor?, last_execution? }.

\`status\` is one of ready|running|stopped|interrupted|finished.
\`last_execution\`, when present, has started_at, finished_at?, total_execution_time_ms, connector_id, error?, is_stopped, and skip_prebuilt_rules_matching.

Use this to inspect one migration's progress. Read-only.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async ({ migration_id: migrationId }, { request }) => {
      const hasPrivilege = await hasRuleMigrationPrivileges(core, request);
      if (!hasPrivilege) {
        return createMissingPrivilegeError('view rule migration stats');
      }

      const response = await callSelfClient<GetRuleMigrationStatsResponse>(
        request,
        buildPath(migrationId),
        { method: 'GET' }
      );

      if (!response.ok) {
        return createToolErrorResult(
          response,
          `Failed to get rule migration stats for "${migrationId}"`
        );
      }

      // 204 No Content → migration has no rule items; return an error so callers know the ID
      // does not correspond to a migration with data (cannot verify identity or state).
      if (!response.body) {
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Migration "${migrationId}" has no rule items. Verify the migration ID is correct.`,
              },
            },
          ],
        };
      }
      const data = response.body;

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data,
          },
        ],
      };
    },
  };
};
