/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_DASHBOARD_MIGRATION_PATH } from '../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SiemMigrationAuditLogger } from '../../common/api/util/audit';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';
import {
  UpdateDashboardMigrationRequestParams,
  UpdateDashboardMigrationRequestBody,
} from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';

export const registerSiemDashboardMigrationsUpdateRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .patch({
      path: SIEM_DASHBOARD_MIGRATION_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateDashboardMigrationRequestParams),
            body: buildRouteValidationWithZod(UpdateDashboardMigrationRequestBody),
          },
        },
      },
      withLicense(
        withExistingMigration(async (context, req, res): Promise<IKibanaResponse> => {
          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
            context.securitySolution,
            'dashboards'
          );
          const { migration_id: migrationId } = req.params;
          try {
            const ctx = await context.resolve(['securitySolution']);
            const dashboardMigrationsClient =
              ctx.securitySolution.siemMigrations.getDashboardsClient();
            await siemMigrationAuditLogger.logUpdateMigration({ migrationId });

            await dashboardMigrationsClient.data.migrations.update(migrationId, req.body);

            return res.ok();
          } catch (error) {
            logger.error(error);
            await siemMigrationAuditLogger.logUpdateMigration({ migrationId, error });
            return res.customError({ statusCode: 400, body: (error as Error).message });
          }
        })
      )
    );
};
