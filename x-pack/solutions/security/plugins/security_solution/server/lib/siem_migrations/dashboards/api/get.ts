/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { GetDashboardMigrationResponse } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { GetDashboardMigrationRequestParams } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { SIEM_DASHBOARD_MIGRATION_PATH } from '../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import { SiemMigrationAuditLogger } from '../../common/api/util/audit';
import { withLicense } from '../../common/api/util/with_license';
import { MIGRATION_ID_NOT_FOUND } from '../../common/translations';

export const registerSiemDashboardMigrationsGetRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_DASHBOARD_MIGRATION_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetDashboardMigrationRequestParams),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<GetDashboardMigrationResponse>> => {
          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
            context.securitySolution,
            'dashboards'
          );

          const { migration_id: migrationId } = req.params;
          try {
            const ctx = await context.resolve(['securitySolution']);
            const dashboardMigrationsClient =
              ctx.securitySolution.siemMigrations.getDashboardsClient();
            await siemMigrationAuditLogger.logGetMigration({ migrationId });

            const storedMigration = await dashboardMigrationsClient.data.migrations.get(
              migrationId
            );

            if (!storedMigration) {
              return res.notFound({
                body: MIGRATION_ID_NOT_FOUND(migrationId),
              });
            }

            return res.ok({
              body: storedMigration,
            });
          } catch (error) {
            logger.error(error);
            await siemMigrationAuditLogger.logGetMigration({
              migrationId,
              error,
            });
            return res.badRequest({ body: error.message });
          }
        }
      )
    );
};
