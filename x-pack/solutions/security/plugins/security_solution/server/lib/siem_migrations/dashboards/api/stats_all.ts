/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { GetAllStatsDashboardMigrationResponse } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { SIEM_DASHBOARD_MIGRATION_ALL_STATS_PATH } from '../../../../../common/siem_migrations/dashboards/constants';
import { MigrationTaskStatusEnum } from '../../../../../common/siem_migrations/model/common.gen';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from '../../common/api/util/authz';
import { withLicense } from '../../common/api/util/with_license';

export const registerSiemDashboardMigrationsStatsAllRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_DASHBOARD_MIGRATION_ALL_STATS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      withLicense(
        async (
          context,
          req,
          res
        ): Promise<IKibanaResponse<GetAllStatsDashboardMigrationResponse>> => {
          try {
            const ctx = await context.resolve(['securitySolution']);
            const dashboardMigrationsClient =
              ctx.securitySolution.siemMigrations.getDashboardsClient();

            const allStats = await dashboardMigrationsClient.data.items.getAllStats();
            const response = {
              ...allStats,
              name: 'Dashboard Migrations',
              status: MigrationTaskStatusEnum.ready,
            };

            return res.ok({ body: response });
          } catch (err) {
            logger.error(err);
            return res.badRequest({ body: err.message });
          }
        }
      )
    );
};
