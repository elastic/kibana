/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import {
  InstallMigrationRulesRequestBody,
  InstallMigrationRulesRequestParams,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type { SecuritySolutionContextGetter } from './create_client_factory';
import { installTranslated } from '../../rules/api/util/installation';

export const SIEM_MIGRATION_INSTALL_RULES_TOOL_ID =
  'security.siem_migration.install_migration_rules';

const installMigrationRulesSchema = InstallMigrationRulesRequestParams.merge(
  InstallMigrationRulesRequestBody
);

/**
 * Tool to install specific or multiple rules from a SIEM migration.
 * This installs the translated rules into Elastic Security detection rules.
 */
export function createInstallMigrationRulesTool(
  getSecuritySolutionContext: SecuritySolutionContextGetter
): BuiltinToolDefinition<typeof installMigrationRulesSchema> {
  // Create a schema that combines params and body

  return {
    id: SIEM_MIGRATION_INSTALL_RULES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Install specific or multiple translated rules from a SIEM migration into Elastic Security detection rules. ' +
      'If rule_ids are provided, only those rules will be installed. Otherwise, all installable rules in the migration will be installed. ' +
      'The rules can be installed as enabled or disabled. Returns the number of successfully installed rules.',
    schema: installMigrationRulesSchema,
    tags: ['security', 'siem-migration'],
    handler: async (params, context) => {
      try {
        const { migration_id, ids, enabled = false } = params;

        // Get Security Solution context and related clients
        const { securitySolutionContext, savedObjectsClient, rulesClient } =
          await getSecuritySolutionContext({
            request: context.request,
            esClient: context.esClient,
          });

        const installed = await installTranslated({
          migrationId: migration_id,
          ids,
          enabled,
          securitySolutionContext,
          savedObjectsClient,
          rulesClient,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                migration_id,
                installed,
                message: `Successfully installed ${installed} rule(s) from migration ${migration_id}`,
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error(`Error installing migration rules: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to install migration rules: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}
