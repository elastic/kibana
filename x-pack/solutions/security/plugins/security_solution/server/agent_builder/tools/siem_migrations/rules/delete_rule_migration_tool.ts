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
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import { createToolErrorResult, createMissingPrivilegeError } from '../common/tool_results';
import { SIEM_MIGRATION_DELETE_RULE_MIGRATION_TOOL_ID } from './tool_ids';
import { RULE_MIGRATION_SKILLS } from '../../../skills/siem_migration/rules/skill_ids';
import { MigrationId } from '../common/schemas';

const schema = z.object({
  migration_id: MigrationId,
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

export const deleteRuleMigrationTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_DELETE_RULE_MIGRATION_TOOL_ID,
    type: ToolType.builtin,
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    annotations: {
      title: 'Delete Rule Migration',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    confirmation: { askUser: 'always' },
    description: `Delete a rule migration and all its associated rule items. Destructive and irreversible.

Returns { ok: true, migration_id } (the DELETE endpoint returns no body today;
additional fields are spread if the endpoint later returns them).

See the ${RULE_MIGRATION_SKILLS.DELETE} skill for the full workflow.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async ({ migration_id: migrationId }, { request }) => {
      const hasPrivilege = await hasRuleMigrationPrivileges(core, request);

      if (!hasPrivilege) {
        return createMissingPrivilegeError('delete a rule migration');
      }

      const response = await callSelfClient(request, buildPath(migrationId), {
        method: 'DELETE',
      });

      if (!response.ok) {
        return createToolErrorResult(response, `Failed to delete rule migration "${migrationId}"`);
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            // The DELETE endpoint currently returns no body (res.ok() with no payload).
            // Spread response.body so any future fields flow through automatically.
            data: {
              ok: true,
              migration_id: migrationId,
              ...(response.body != null ? (response.body as object) : {}),
            },
          },
        ],
      };
    },
  };
};
