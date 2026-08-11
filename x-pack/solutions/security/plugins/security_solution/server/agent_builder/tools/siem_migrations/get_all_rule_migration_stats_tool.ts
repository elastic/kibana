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
import { SIEM_RULE_MIGRATIONS_ALL_STATS_PATH } from '../../../../common/siem_migrations/constants';
import type { GetAllStatsRuleMigrationResponse } from '../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { createSiemMigrationClient, type SiemMigrationClient } from './self_client';
import { SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID } from './tool_ids';

const schema = z.object({}).describe('No parameters. Lists stats for every rule migration.');

/**
 * Lists task-progress stats for **all** SIEM rule migrations available to the current user.
 *
 * Backed by the internal, versioned route
 * `GET /internal/siem_migrations/rules/stats` (version 1), which returns an array of
 * `RuleMigrationTaskStats` — one entry per migration with its id, status, and per-state rule
 * counts (pending / processing / completed / failed). Read-only.
 */
export const getAllRuleMigrationStatsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof schema> => {
  const callSiemMigration: SiemMigrationClient = createSiemMigrationClient({ core, logger });

  return {
    id: SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'List task-progress stats for every SIEM rule migration available to the current user. ' +
      'Returns one entry per migration (id, status, and pending/processing/completed/failed rule ' +
      'counts). Use this to get an overview of all migrations before drilling into a specific one ' +
      'with get_rule_migration. Read-only.',
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async (_input, { request }) => {
      const response = await callSiemMigration<GetAllStatsRuleMigrationResponse>(
        request,
        SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
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
                  `Failed to list rule migration stats (HTTP ${response.status}): ${response.message}`,
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
            data: { total: response.body.length, migrations: response.body },
          },
        ],
      };
    },
  };
};
