/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { BuiltinToolDefinition, ToolAvailabilityConfig } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../../common/siem_migrations/constants';
import { NonEmptyString } from '../../../../../common/api/model/primitives.gen';
import type { GetRuleMigrationResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createToolErrorResult } from '../common/tool_results';
import { SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID } from './tool_ids';

const schema = z.object({
  migration_id: NonEmptyString.describe('The id of the rule migration to retrieve.'),
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

export const getRuleMigrationTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  availability: ToolAvailabilityConfig
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID,
    type: ToolType.builtin,
    availability,
    description: `Retrieve a single SIEM rule migration by id, including its name, index pattern, connector, and task status. Use this to inspect the state of an Automatic Migration (rules) before starting, stopping, or installing translated rules.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async ({ migration_id: migrationId }, { request }) => {
      const response = await callSelfClient<GetRuleMigrationResponse>(
        request,
        buildPath(migrationId),
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        return createToolErrorResult(
          response,
          `Failed to get rule migration "${migrationId}"`
        );
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: response.body,
          },
        ],
      };
    },
  };
};
