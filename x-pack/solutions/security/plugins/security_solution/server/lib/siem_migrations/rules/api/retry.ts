/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import {
  RetryRuleMigrationRequestBody,
  RetryRuleMigrationRequestParams,
  type RetryRuleMigrationResponse,
} from '../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import { SIEM_RULE_MIGRATION_RETRY_PATH } from '../../../../../common/siem_migrations/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { withLicense } from './util/with_license';
import type { RuleMigrationFilters } from '../data/rule_migrations_data_rules_client';

export const registerSiemRuleMigrationsRetryRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .put({
      path: SIEM_RULE_MIGRATION_RETRY_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(RetryRuleMigrationRequestParams),
            body: buildRouteValidationWithZod(RetryRuleMigrationRequestBody),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<RetryRuleMigrationResponse>> => {
          const migrationId = req.params.migration_id;
          const {
            langsmith_options: langsmithOptions,
            connector_id: connectorId,
            filter,
          } = req.body;

          try {
            const ctx = await context.resolve(['core', 'actions', 'alerting', 'securitySolution']);

            const ruleMigrationsClient = ctx.securitySolution.getSiemRuleMigrationsClient();
            const inferenceClient = ctx.securitySolution.getInferenceClient();
            const actionsClient = ctx.actions.getActionsClient();
            const soClient = ctx.core.savedObjects.client;
            const rulesClient = await ctx.alerting.getRulesClient();

            const invocationConfig = {
              callbacks: [
                new APMTracer({ projectName: langsmithOptions?.project_name ?? 'default' }, logger),
                ...getLangSmithTracer({ ...langsmithOptions, logger }),
              ],
            };

            const filters: RuleMigrationFilters = {
              ...(filter === 'failed' ? { failed: true } : {}),
              ...(filter === 'not_fully_translated' ? { fullyTranslated: false } : {}),
            };
            const { updated } = await ruleMigrationsClient.task.updateToRetry(migrationId, filters);
            if (!updated) {
              return res.ok({ body: { started: false } });
            }

            const { exists, started } = await ruleMigrationsClient.task.start({
              migrationId,
              connectorId,
              invocationConfig,
              inferenceClient,
              actionsClient,
              soClient,
              rulesClient,
            });

            if (!exists) {
              return res.noContent();
            }
            return res.ok({ body: { started } });
          } catch (err) {
            logger.error(err);
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
