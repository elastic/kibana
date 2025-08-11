/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core/server';
import {
  CreateDashboardMigrationDashboardsRequestBody,
  CreateDashboardMigrationDashboardsRequestParams,
} from '../../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH } from '../../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../../../common/utils/authz';
import { withLicense } from '../../../common/utils/with_license';
import { SiemMigrationAuditLogger } from '../../../common/utils/audit';

export const registerSiemDashboardMigrationsCreateDashboardsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(CreateDashboardMigrationDashboardsRequestParams),
            body: buildRouteValidationWithZod(CreateDashboardMigrationDashboardsRequestBody),
          },
        },
      },
      withLicense(async (context, req, res): Promise<IKibanaResponse<undefined>> => {
        const { migration_id: migrationId } = req.params;
        const originalDashboardsExport = req.body;
        const originalDashboardsCount = originalDashboardsExport.length;
        if (originalDashboardsCount === 0) {
          return res.badRequest({
            body: `No dashboards provided for migration ID ${migrationId}. Please provide at least one dashboard.`,
          });
        }

        const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
          context.securitySolution,
          'dashboards'
        );
        try {
          const ctx = await context.resolve(['securitySolution']);
          const dashboardMigrationsClient =
            ctx.securitySolution.siemMigrations.getDashboardsClient();
          await siemMigrationAuditLogger.logAddDashboards({
            migrationId,
            count: originalDashboardsCount,
          });
          await dashboardMigrationsClient.data.dashboards.create(
            migrationId,
            originalDashboardsExport
          );
          return res.ok();
        } catch (error) {
          logger.error(`Error creating dashboards for migration ID ${migrationId}: ${error}`);
          await siemMigrationAuditLogger.logCreateMigration({
            error,
          });
          return res.badRequest({
            body: `Error creating dashboards for migration ID ${migrationId}: ${error.message}`,
          });
        }
      })
    );
};
