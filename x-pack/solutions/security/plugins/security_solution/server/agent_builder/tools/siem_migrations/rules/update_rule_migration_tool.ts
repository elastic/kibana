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
import { RULE_MIGRATION_SKILLS } from '../../../skills/siem_migration/rules/skill_ids';
import { MigrationId } from '../common/schemas';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasRuleMigrationPrivileges } from '../common/privileges';
import { createToolErrorResult, createMissingPrivilegeError } from '../common/tool_results';
import { SIEM_MIGRATION_UPDATE_RULE_MIGRATION_TOOL_ID } from './tool_ids';

const schema = z.object({
  migration_id: MigrationId,
  name: z
    .string()
    .min(1)
    .max(256)
    .describe('The new name for the rule migration. 1–256 characters.'),
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

export const updateRuleMigrationTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_UPDATE_RULE_MIGRATION_TOOL_ID,
    type: ToolType.builtin,
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    annotations: {
      title: 'Update Rule Migration',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    confirmation: { askUser: 'always' },
    description: `Update a rule migration's name. Mutating.

Accepts { name }. Returns { ok: true, migration_id } (the PATCH endpoint returns no body today;
additional fields are spread if the endpoint later returns them).

See the ${RULE_MIGRATION_SKILLS.UPDATE} skill for the full workflow.`,

    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async (input, { request }) => {
      const { migration_id: migrationId, ...body } = input;

      const hasPrivilege = await hasRuleMigrationPrivileges(core, request);

      if (!hasPrivilege) {
        return createMissingPrivilegeError('update a rule migration');
      }

      const response = await callSelfClient(request, buildPath(migrationId), {
        method: 'PATCH',
        body,
      });

      if (!response.ok) {
        return createToolErrorResult(response, `Failed to update rule migration "${migrationId}"`);
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            // The PATCH endpoint currently returns no body (res.ok() with no payload).
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
