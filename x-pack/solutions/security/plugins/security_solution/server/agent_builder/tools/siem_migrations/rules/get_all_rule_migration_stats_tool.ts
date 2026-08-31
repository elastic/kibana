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
import { SIEM_RULE_MIGRATIONS_ALL_STATS_PATH } from '../../../../../common/siem_migrations/constants';
import type { GetAllStatsRuleMigrationResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { createToolErrorResult } from '../common/tool_results';
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
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_GET_ALL_RULE_MIGRATION_STATS_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Get All Rule Migration Stats',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    description: `List stats for every Automatic Rule Migration in the current space.

Returns { total, migrations: [{ id, name, status, items: { total, pending, processing, completed, failed }, created_at, last_updated_at, vendor?, last_execution? }] }.

\`status\` is one of ready|running|stopped|finished|interrupted and drives START vs RESUME vs REPROCESS decisions.
\`vendor\` is splunk|qradar|microsoft-sentinel.
\`last_execution\`, when present, has \`started_at\`, \`finished_at?\`, \`total_execution_time_ms\`, \`connector_id\`, \`error?\`, \`is_stopped\`, and \`skip_prebuilt_rules_matching\`. Use this to answer questions about the previous execution.

Use \`name\` to resolve the user-supplied migration name to \`id\` (names can collide — disambiguate by vendor, then status/created_at/counts; see the active skill for the full hierarchy).

Only migrations with >=1 eligible rule item are returned. If the user names one that is missing, ask them to paste the migration id from the UI and verify it via get_rule_migration.

Read-only.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async (_input, { request }) => {
      const response = await callSelfClient<GetAllStatsRuleMigrationResponse>(
        request,
        SIEM_RULE_MIGRATIONS_ALL_STATS_PATH,
        { method: 'GET' }
      );

      if (!response.ok) {
        return createToolErrorResult(response, 'Failed to list rule migration stats');
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
