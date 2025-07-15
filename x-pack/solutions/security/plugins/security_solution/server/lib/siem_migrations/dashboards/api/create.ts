/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core/server';
import { SIEM_DASHBOARD_MIGRATIONS_PATH } from '../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from '../../common/utils/authz';
import type { CreateDashboardMigrationResponse } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { CreateDashboardMigrationRequestBody } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { withLicense } from '../../common/utils/with_license';
import { SiemMigrationAuditLogger } from '../../common/utils/audit';

export const registerSiemDashboardMigrationsCreateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .put({
      path: SIEM_DASHBOARD_MIGRATIONS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateDashboardMigrationRequestBody),
          },
        },
      },
      withLicense(
        async (context, req, res): Promise<IKibanaResponse<CreateDashboardMigrationResponse>> => {
          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(context.securitySolution);
          try {
            const ctx = await context.resolve(['securitySolution']);
            const dashboardMigrationsClient =
              ctx.securitySolution.getSiemDashboardMigrationsClient();
            await siemMigrationAuditLogger.logCreateMigration();
            const migrationId = await dashboardMigrationsClient.data.migrations.create(
              req.body.name
            );

            return res.ok({ body: { migration_id: migrationId } });
          } catch (error) {
            logger.error(error);
            await siemMigrationAuditLogger.logCreateMigration({ error });
            return res.badRequest({ body: error.message });
          }
        }
      )
    );
};
