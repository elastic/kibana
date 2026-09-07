/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import {
  RULES_UI_EDIT,
  SIEM_MIGRATIONS_FEATURE_ID,
} from '@kbn/security-solution-features/constants';
import { z } from '@kbn/zod/v4';
import { NonEmptyString } from '../../../../../common/api/model/primitives.gen';
import { RULES_FEATURE_ID } from '../../../../../common/constants';
import { SIEM_RULE_MIGRATION_INSTALL_PATH } from '../../../../../common/siem_migrations/constants';
import {
  InstallMigrationRulesRequestBody,
  type InstallMigrationRulesResponse,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import type { ProductFeaturesService } from '../../../../lib/product_features_service/product_features_service';
import { createSelfClient, type SelfClient } from '../../../../common/self_client/self_client';
import { createSiemMigrationAvailability } from '../common/availability';
import { createMissingPrivilegeError, createToolErrorResult } from '../common/tool_results';
import { hasSiemMigrationPrivileges } from '../common/privileges';
import { SIEM_MIGRATION_INSTALL_RULE_MIGRATION_TOOL_ID } from './tool_ids';

const schema = InstallMigrationRulesRequestBody.extend({
  migration_id: NonEmptyString.describe('The id of the rule migration whose rules to install.'),
  ids: z
    .array(NonEmptyString)
    .max(200)
    .optional()
    .describe(
      'Optional migration rule item ids to install. Omit to install all installable rules.'
    ),
});

const buildPath = (migrationId: string): string =>
  SIEM_RULE_MIGRATION_INSTALL_PATH.replace('{migration_id}', encodeURIComponent(migrationId));

export const installMigrationRulesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  const callSelfClient: SelfClient = createSelfClient({ core, logger });

  return {
    id: SIEM_MIGRATION_INSTALL_RULE_MIGRATION_TOOL_ID,
    type: ToolType.builtin,
    availability: createSiemMigrationAvailability(core, productFeaturesService, logger),
    confirmation: { askUser: 'always' },
    description: `Install fully translated rules from an Automatic Rule Migration.

Mutating. See the automatic-migration-rules-install-rules skill for scope confirmation, integration-readiness checks, enabled-state policy, and result interpretation.`,
    schema,
    tags: ['security', 'siem-migration', 'rules'],
    handler: async (input, { request }) => {
      const { migration_id: migrationId, ids, enabled } = input;
      const [, startPlugins] = await core.getStartServices();
      const canInstall = await hasSiemMigrationPrivileges(core, request, [
        `${SIEM_MIGRATIONS_FEATURE_ID}.all`,
        startPlugins.security.authz.actions.ui.get(RULES_FEATURE_ID, RULES_UI_EDIT),
      ]);

      if (!canInstall) {
        return createMissingPrivilegeError(
          'install migration rules; Automatic Migration: All and Detection Rules: All are required'
        );
      }

      const response = await callSelfClient<InstallMigrationRulesResponse>(
        request,
        buildPath(migrationId),
        {
          method: 'POST',
          body: { ids, enabled },
        }
      );

      if (!response.ok) {
        return createToolErrorResult(response, 'Failed to install migration rules');
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
