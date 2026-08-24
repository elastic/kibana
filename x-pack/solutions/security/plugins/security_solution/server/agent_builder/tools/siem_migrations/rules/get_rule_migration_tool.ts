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
import { SIEM_RULE_MIGRATION_PATH } from '../../../../../common/siem_migrations/constants';
import { NonEmptyString } from '../../../../../common/api/model/primitives.gen';
import type { GetRuleMigrationResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import { createMissingPrivilegeError, createToolErrorResult } from '../common/tool_results';
import { SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID } from './tool_ids';

const schema = z.object({
  migration_id: NonEmptyString.describe('The id of the rule migration to retrieve.'),
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

export const getRuleMigrationTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_GET_RULE_MIGRATION_TOOL_ID,
    type: ToolType.builtin,
    annotations: {
      title: 'Get Rule Migration',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    description: `Retrieve a single Automatic rule migration by id.

Returns its name, creation time, last_execution details

Use this to inspect name or last execution details of an Automatic Migration (rules) before starting, stopping, or installing translated rules.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async ({ migration_id: migrationId }, { request }) => {
      const hasPrivilege = await hasRuleMigrationPrivileges(core, request);
      if (!hasPrivilege) {
        return createMissingPrivilegeError('view a rule migration');
      }

      const response = await callSelfClient<GetRuleMigrationResponse>(
        request,
        buildPath(migrationId),
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        return createToolErrorResult(response, `Failed to get rule migration "${migrationId}"`);
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
