/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import {
  StartRuleMigrationRequestBody,
  StartRuleMigrationRequestParams,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../../../plugin_contract';
import type { SiemMigrationsClientGetter } from './create_client_factory';
import { getRetryFilter } from '../../common/api/util/retry';
import { createTracersCallbacks } from '../../common/api/util/tracing';

export const SIEM_MIGRATION_START_MIGRATION_TOOL_ID = 'security.siem_migration.start_migration';

/**
 * Tool to start a SIEM migration or retry migration for single or multiple rules.
 * This tool can start a new migration or retry failed/partially translated/selected rules.
 * When retry is provided, it will mark the matching rules as pending and then start the migration.
 */
export function createStartMigrationTool(
  getClient: SiemMigrationsClientGetter,
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger
): StaticToolRegistration<
  typeof StartRuleMigrationRequestBody & typeof StartRuleMigrationRequestParams
> {
  // Create a schema that combines params and body
  const startMigrationSchema = StartRuleMigrationRequestParams.merge(StartRuleMigrationRequestBody);

  return {
    id: SIEM_MIGRATION_START_MIGRATION_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Start a SIEM migration task or retry migration for single or multiple rules. ' +
      'When retry parameter is provided, it will mark matching rules (failed, not_fully_translated, or selected) as pending and then start the migration. ' +
      'The connector_id is required to start the migration. ' +
      'Use retry="failed" to retry all failed rules, retry="not_fully_translated" to retry partially translated rules, or retry="selected" with selection.ids to retry specific rules.',
    schema: startMigrationSchema,
    tags: ['security', 'siem-migration'],
    handler: async (params, context) => {
      try {
        const {
          migration_id,
          settings: { connector_id, skip_prebuilt_rules_matching = false },
          retry,
          selection,
          langsmith_options: langsmithOptions,
        } = params;

        const client = await getClient(context.request);

        // Get actions client to verify connector exists
        const [coreStart, plugins] = await core.getStartServices();
        const actionsClient = await plugins.actions.getActionsClientWithRequest(context.request);

        // Check if the connector exists and user has permissions to read it
        const connector = await actionsClient.get({ id: connector_id });
        if (!connector) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Connector with id ${connector_id} not found`,
                },
              },
            ],
          };
        }

        // Handle retry logic if retry parameter is provided
        if (retry) {
          let retryFilters = {};
          try {
            retryFilters = getRetryFilter(retry, selection);
          } catch (e) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: e instanceof Error ? e.message : String(e),
                  },
                },
              ],
            };
          }

          const { updated } = await client.task.updateToRetry(migration_id, {
            ...retryFilters,
          });

          if (!updated) {
            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    success: false,
                    migration_id,
                    started: false,
                    message: 'Migration could not be updated for retry. It may already be running.',
                  },
                },
              ],
            };
          }
        }

        // Create tracers callbacks if langsmith options are provided
        const callbacks = createTracersCallbacks(langsmithOptions, logger);

        // Start the migration task
        const { exists, started } = await client.task.start({
          migrationId: migration_id,
          connectorId: connector_id,
          invocationConfig: {
            callbacks,
            configurable: { skipPrebuiltRulesMatching: skip_prebuilt_rules_matching },
          },
        });

        if (!exists) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message: `Migration ${migration_id} not found`,
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                migration_id,
                started,
                message: started
                  ? `Migration ${migration_id} started successfully${retry ? ' (with retry)' : ''}`
                  : `Migration ${migration_id} could not be started (may already be running)`,
              },
            },
          ],
        };
      } catch (error) {
        context.logger.error(`Error starting migration: ${error.message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to start migration: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };
}
