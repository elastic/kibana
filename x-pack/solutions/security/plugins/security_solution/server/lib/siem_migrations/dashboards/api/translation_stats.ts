/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { GetAllTranslationStatsDashboardMigrationResponse } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { GetAllTranslationStatsDashboardMigrationRequestParams } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { SIEM_DASHBOARD_MIGRATION_TRANSLATION_STATS_PATH } from '../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';

export const registerSiemDashboardMigrationsTranslationStatsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_DASHBOARD_MIGRATION_TRANSLATION_STATS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(
              GetAllTranslationStatsDashboardMigrationRequestParams
            ),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (
            context,
            req,
            res
          ): Promise<IKibanaResponse<GetAllTranslationStatsDashboardMigrationResponse>> => {
            const migrationId = req.params.migration_id;
            try {
              const ctx = await context.resolve(['securitySolution']);
              const dashboardMigrationsClient =
                ctx.securitySolution.siemMigrations.getDashboardsClient();

              const stats = await dashboardMigrationsClient.data.items.getTranslationStats(
                migrationId
              );

              if (stats.dashboards.total === 0) {
                return res.noContent();
              }
              return res.ok({ body: stats });
            } catch (err) {
              logger.error(err);
              return res.badRequest({ body: err.message });
            }
          }
        )
      )
    );
};
