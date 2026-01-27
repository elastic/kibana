/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_DASHBOARD_MIGRATION_START_PATH } from '../../../../../common/siem_migrations/dashboards/constants';
import {
  StartDashboardsMigrationRequestBody,
  StartDashboardsMigrationRequestParams,
  type StartDashboardsMigrationResponse,
} from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SiemMigrationAuditLogger } from '../../common/api/util/audit';
import { authz } from './util/authz';
import { getRetryFilter } from '../../common/api/util/retry';
import { withLicense } from '../../common/api/util/with_license';
import { createTracersCallbacks } from '../../common/api/util/tracing';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';

export const registerSiemDashboardMigrationsStartRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_DASHBOARD_MIGRATION_START_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(StartDashboardsMigrationRequestParams),
            body: buildRouteValidationWithZod(StartDashboardsMigrationRequestBody),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (context, req, res): Promise<IKibanaResponse<StartDashboardsMigrationResponse>> => {
            const migrationId = req.params.migration_id;
            const {
              langsmith_options: langsmithOptions,
              settings: { connector_id: connectorId },
              retry,
            } = req.body;

            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
              context.securitySolution,
              'dashboards'
            );
            try {
              const ctx = await context.resolve(['actions', 'securitySolution']);

              // Check if the connector exists and user has permissions to read it
              const connector = await ctx.actions.getActionsClient().get({ id: connectorId });
              if (!connector) {
                return res.badRequest({ body: `Connector with id ${connectorId} not found` });
              }

              const dashboardMigrationsClient =
                ctx.securitySolution.siemMigrations.getDashboardsClient();
              if (retry) {
                const { updated } = await dashboardMigrationsClient.task.updateToRetry(
                  migrationId,
                  getRetryFilter(retry)
                );
                if (!updated) {
                  return res.ok({ body: { started: false } });
                }
              }

              const callbacks = createTracersCallbacks(langsmithOptions, logger);

              const { exists, started } = await dashboardMigrationsClient.task.start({
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
