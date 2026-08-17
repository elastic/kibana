/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { SIEM_MIGRATIONS_FEATURE_ID } from '@kbn/security-solution-features/constants';
import { SIEM_RULE_MIGRATION_PATH } from '../../../../../common/siem_migrations/constants';
import { UpdateRuleMigrationRequestBody } from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { NonEmptyString } from '../../../../../common/api/model/primitives.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { hasSiemMigrationPrivileges } from '../common/privileges';
import { createToolErrorResult, createMissingPrivilegeError } from '../common/tool_results';
import { SIEM_MIGRATION_UPDATE_RULE_MIGRATION_TOOL_ID } from './tool_ids';

// Reuse the generated schema; require at least one field so a no-op PATCH is rejected.
const schema = UpdateRuleMigrationRequestBody.extend({
  migration_id: NonEmptyString.describe('The id of the rule migration to update.'),
}).refine((v) => v.name !== undefined || v.index_pattern !== undefined, {
  message: 'Provide at least one of name or index_pattern.',
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
    confirmation: { askUser: 'always' },
    description: `Update a rule migration's name and/or default index pattern.

Accepts { name?, index_pattern? } — at least one must be provided. Returns { ok: true, migration_id }.

NOTE: this only updates the migration document's name / index_pattern field. It does NOT rewrite
MISSING_INDEX_PATTERN_PLACEHOLDER in already-translated rule queries — that is a separate UI-only
operation. Mutating — confirms with the user before executing.

See the automatic-migration-rules-update-migration skill for example flows.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async (input, { request }) => {
      const { migration_id: migrationId, ...body } = input;

      const hasPrivilege = await hasSiemMigrationPrivileges(core, request, [
        `${SIEM_MIGRATIONS_FEATURE_ID}.all`,
      ]);

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
            data: { ok: true, migration_id: migrationId },
          },
        ],
      };
    },
  };
};
