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
import { SIEM_RULE_MIGRATION_RESOURCES_MISSING_PATH } from '../../../../../common/siem_migrations/constants';
import type { GetRuleMigrationResourcesMissingResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import { createMissingPrivilegeError, createToolErrorResult } from '../common/tool_results';
import { MigrationId } from '../common/schemas';
import { SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID } from './tool_ids';

const schema = z.object({
  migration_id: MigrationId,
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_RESOURCES_MISSING_PATH.replace(
    '{migration_id}',
    encodeURIComponent(migrationId)
  );

export const getMissingRuleMigrationResourcesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_GET_MISSING_RULE_MIGRATION_RESOURCES_TOOL_ID,
    type: ToolType.builtin,
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    annotations: {
      title: 'Get Missing Rule Migration Resources',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    description: `List the resources (macros, lookups, reference sets, watchlists) that a rule migration is still missing.

Returns a flat array of { name, type } objects. An empty array means no resources are missing.

The start skill groups this array by type before presenting it to the user. Read-only.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async ({ migration_id: migrationId }, { request }) => {
      const hasPrivilege = await hasRuleMigrationPrivileges(core, request);
      if (!hasPrivilege) {
        return createMissingPrivilegeError('view missing rule migration resources');
      }

      const response = await callSelfClient<GetRuleMigrationResourcesMissingResponse>(
        request,
        buildPath(migrationId),
        { method: 'GET' }
      );

      if (!response.ok) {
        return createToolErrorResult(
          response,
          `Failed to get missing resources for migration "${migrationId}"`
        );
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: response.body ?? [],
          },
        ],
      };
    },
  };
};
