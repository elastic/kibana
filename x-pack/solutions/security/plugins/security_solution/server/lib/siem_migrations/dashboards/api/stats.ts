/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { MigrationTaskStatusEnum } from '../../../../../common/siem_migrations/model/common.gen';
import type { GetDashboardMigrationStatsResponse } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { GetDashboardMigrationStatsRequestParams } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { SIEM_DASHBOARD_MIGRATION_STATS_PATH } from '../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { withLicense } from '../../common/api/util/with_license';
import { authz } from '../../common/api/util/authz';
import { withExistingDashboardMigration } from './util/with_existing_dashboard_migration';
import { MIGRATION_ID_NOT_FOUND } from '../../common/translations';

export const registerSiemDashboardMigrationsStatsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_DASHBOARD_MIGRATION_STATS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: buildRouteValidationWithZod(GetDashboardMigrationStatsRequestParams) },
        },
      },
      withLicense(
        withExistingDashboardMigration(
          async (
            context,
            req,
            res
          ): Promise<IKibanaResponse<GetDashboardMigrationStatsResponse>> => {
            const migrationId = req.params.migration_id;
            try {
              const ctx = await context.resolve(['securitySolution']);
              const dashboardMigrationClient =
                ctx.securitySolution.siemMigrations.getDashboardsClient();

              const [stats, migration] = await Promise.all([
                dashboardMigrationClient.data.items.getStats(migrationId),
                dashboardMigrationClient.data.migrations.get(migrationId),
              ]);

              if (!migration) {
                return res.notFound({
                  body: MIGRATION_ID_NOT_FOUND(migrationId),
                });
              }

              if (stats.items?.total === 0) {
                return res.noContent();
              }
              return res.ok({
                body: {
                  ...stats,
                  status: MigrationTaskStatusEnum.ready,
                  name: migration.name,
                },
              });
            } catch (err) {
              logger.error(err);
              return res.badRequest({ body: err.message });
            }
          }
        )
      )
    );
};
