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
            body: buildRouteValidationWithZod(CreateDashboardMigrationDashboardsRequestBody),
            params: buildRouteValidationWithZod(CreateDashboardMigrationDashboardsRequestParams),
          },
        },
      },
      withLicense(async (context, req, res): Promise<IKibanaResponse<undefined>> => {
        const { migration_id: migrationId } = req.params;
        const rawDashboards = req.body;
        logger.warn(JSON.stringify(rawDashboards, null, 2));
        const rawDashboardsCount = rawDashboards.length;
        if (rawDashboardsCount === 0) {
          return res.badRequest({
            body: `No dashboards provided for migration ID ${migrationId}. Please provide at least one dashboard.`,
          });
        }
        try {
          const ctx = await context.resolve(['securitySolution']);
          const dashboardMigrationsClient = ctx.securitySolution.getSiemDashboardMigrationsClient();
          await dashboardMigrationsClient.data.dashboards.create(migrationId, rawDashboards);
          return res.ok();
        } catch (error) {
          return res.badRequest({
            body: `Error creating dashboards for migration ID ${migrationId}: ${error.message}`,
          });
        }
      })
    );
};
