/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { DeleteDashboardMigrationRequestParams } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { SIEM_DASHBOARD_MIGRATION_PATH } from '../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';
import { SiemMigrationAuditLogger } from '../../common/api/util/audit';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';

export const registerSiemDashboardMigrationsDeleteRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .delete({
      path: SIEM_DASHBOARD_MIGRATION_PATH,
      access: 'internal',
      security: {
        authz,
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(DeleteDashboardMigrationRequestParams),
          },
        },
      },
      withLicense(
        withExistingMigration(async (context, req, res) => {
          const { migration_id: migrationId } = req.params;
          const dashboardMigrationsAuditLogger = new SiemMigrationAuditLogger(
            context.securitySolution,
            'dashboards'
          );

          try {
            const ctx = await context.resolve(['securitySolution']);
            const dashboardMigrationsClient =
              ctx.securitySolution.siemMigrations.getDashboardsClient();
            await dashboardMigrationsAuditLogger.logDeleteMigration({ migrationId });

            if (dashboardMigrationsClient.task.isMigrationRunning(migrationId)) {
              return res.conflict({
                body: 'A running dashboard migration cannot be deleted. Please stop the migration first and try again',
              });
            }
            await dashboardMigrationsClient.data.deleteMigration(migrationId);
            return res.ok();
          } catch (error) {
            logger.error(error);
            await dashboardMigrationsAuditLogger.logDeleteMigration({ migrationId, error });
            return res.customError({ statusCode: 500, body: error });
          }
        })
      )
    );
};
