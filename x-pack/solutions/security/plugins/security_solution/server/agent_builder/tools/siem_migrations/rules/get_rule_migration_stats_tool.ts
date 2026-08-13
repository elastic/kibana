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
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID } from './tool_ids';

const schema = z.object({
  migration_id: NonEmptyString.describe('The id of the rule migration whose stats to retrieve.'),
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_STATS_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

// The stats route returns 204 No Content when the migration has zero rule items
// (stats.ts:47-49). Normalize that to an explicit empty shape so the skill/state-matrix
// zero-checks (items.pending === 0, etc.) always have a readable shape. For zero items,
// getTaskStatus resolves to 'finished' (completed + failed === total → 0 === 0).
// name/created_at/last_updated_at are unknown from a 204 — the skill sources the name from
// get_all_rule_migration_stats (name resolution) or get_rule_migration (pasted-id fallback).
const emptyStats = (migrationId: string): GetRuleMigrationStatsResponse => ({
  id: migrationId,
  name: '',
  status: 'finished',
  items: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 },
  created_at: '',
  last_updated_at: '',
});

export const getRuleMigrationStatsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_GET_RULE_MIGRATION_STATS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Get task-progress stats for a single SIEM rule migration: status (ready/running/stopped/' +
      'interrupted/finished) and per-state rule counts (pending/processing/completed/failed). ' +
      'Use this to inspect one migration progress. Read-only.',
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async ({ migration_id: migrationId }, { request }) => {
      const response = await callSelfClient<GetRuleMigrationStatsResponse>(
        request,
        buildPath(migrationId),
        { method: 'GET' }
      );

      if (!response.ok) {
        const bodyMessage =
          response.body && typeof response.body === 'object' && 'message' in response.body
            ? String((response.body as { message: unknown }).message)
            : undefined;
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message:
                  bodyMessage ??
                  `Failed to get rule migration stats for "${migrationId}" (HTTP ${response.status}): ${response.message}`,
              },
            },
          ],
        };
      }

      // 204 No Content → normalize to empty shape (zero rule items).
      const data = response.body ?? emptyStats(migrationId);

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
