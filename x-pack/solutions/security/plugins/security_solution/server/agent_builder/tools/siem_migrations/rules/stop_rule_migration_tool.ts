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
import { SIEM_RULE_MIGRATION_STOP_PATH } from '../../../../../common/siem_migrations/constants';
import type { StopRuleMigrationResponse } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import { createToolErrorResult, createMissingPrivilegeError } from '../common/tool_results';
import { SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID } from './tool_ids';
import { RULE_MIGRATION_SKILLS } from '../../../skills/siem_migration/rules/skill_ids';
import { MigrationId } from '../common/schemas';

const schema = z.object({
  migration_id: MigrationId,
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_STOP_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

export const stopRuleMigrationTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_STOP_RULE_MIGRATION_TOOL_ID,
    type: ToolType.builtin,
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    annotations: {
      title: 'Stop Rule Migration',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    confirmation: { askUser: 'once' },
    description: `Stop a running Automatic Rule Migration. Mutating.

Returns { stopped: boolean }.

See the ${RULE_MIGRATION_SKILLS.STOP} skill for the full workflow.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async ({ migration_id: migrationId }, { request }) => {
      const hasPrivilege = await hasRuleMigrationPrivileges(core, request);

      if (!hasPrivilege) {
        return createMissingPrivilegeError('stop a rule migration');
      }

      const response = await callSelfClient<StopRuleMigrationResponse>(
        request,
        buildPath(migrationId),
        { method: 'POST' }
      );

      if (!response.ok) {
        return createToolErrorResult(response, `Failed to stop rule migration "${migrationId}"`);
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
