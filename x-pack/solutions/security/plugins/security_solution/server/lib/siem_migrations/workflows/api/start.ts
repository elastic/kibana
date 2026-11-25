/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { SIEM_WORKFLOW_MIGRATION_START_PATH } from '../../../../../common/siem_migrations/workflows/constants';
import {
  StartWorkflowMigrationRequestBody,
  StartWorkflowMigrationRequestParams,
  type StartWorkflowMigrationResponse,
} from '../../../../../common/siem_migrations/model/api/workflows/workflow_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SiemMigrationAuditLogger } from '../../common/api/util/audit';
import { authz } from './util/authz';
import { getRetryFilter } from '../../common/api/util/retry';
import { withLicense } from '../../common/api/util/with_license';
import { createTracersCallbacks } from '../../common/api/util/tracing';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';

export const registerSiemWorkflowMigrationsStartRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_WORKFLOW_MIGRATION_START_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(StartWorkflowMigrationRequestParams),
            body: buildRouteValidationWithZod(StartWorkflowMigrationRequestBody),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (context, req, res): Promise<IKibanaResponse<StartWorkflowMigrationResponse>> => {
            const migrationId = req.params.migration_id;
            const { langsmith_options: langsmithOptions, settings, retry, selection } = req.body;
            const connectorId = settings.connector_id;

            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
              context.securitySolution,
              'workflows'
            );
            try {
              const ctx = await context.resolve(['securitySolution']);

              const inferenceClient = ctx.securitySolution.getInferenceClient();
              await inferenceClient.getConnectorById(connectorId);

              const workflowMigrationsClient =
                ctx.securitySolution.siemMigrations.getWorkflowsClient();
              if (retry) {
                let retryFilters = {};
                try {
                  retryFilters = getRetryFilter(retry, selection);
                } catch (e) {
                  return res.badRequest({
                    body: e.message,
                  });
                }
                const { updated } = await workflowMigrationsClient.task.updateToRetry(migrationId, {
                  ...retryFilters,
                });
                if (!updated) {
                  return res.ok({ body: { started: false } });
                }
              }

              const callbacks = createTracersCallbacks(langsmithOptions, logger);

              const { exists, started } = await workflowMigrationsClient.task.start({
                migrationId,
                connectorId,
                invocationConfig: { callbacks },
              });

              if (!exists) {
                return res.notFound();
              }

              await siemMigrationAuditLogger.logStart({ migrationId });

              return res.ok({ body: { started } });
            } catch (error) {
              logger.error(error);
              await siemMigrationAuditLogger.logStart({ migrationId, error });
              return res.customError({ statusCode: 500, body: error.message });
            }
          }
        )
      )
    );
};
