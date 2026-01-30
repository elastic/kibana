/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse, Logger } from '@kbn/core/server';
import type { DashboardMigrationGetDashboardOptions } from '../../../../../../common/siem_migrations/dashboards/types';
import type { GetDashboardMigrationDashboardsResponse } from '../../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import {
  GetDashboardMigrationDashboardsRequestParams,
  GetDashboardMigrationDashboardsRequestQuery,
} from '../../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH } from '../../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../util/authz';
import { withLicense } from '../../../common/api/util/with_license';
import { withExistingMigration } from '../../../common/api/util/with_existing_migration_id';
import { SiemMigrationAuditLogger } from '../../../common/api/util/audit';

export const registerSiemDashboardMigrationsGetDashboardsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .get({
      path: SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetDashboardMigrationDashboardsRequestParams),
            query: buildRouteValidationWithZod(GetDashboardMigrationDashboardsRequestQuery),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (
            context,
            req,
            res
          ): Promise<IKibanaResponse<GetDashboardMigrationDashboardsResponse>> => {
            const { migration_id: migrationId } = req.params;

            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
              context.securitySolution,
              'dashboards'
            );
            try {
              const ctx = await context.resolve(['securitySolution']);
              const dashboardMigrationsClient =
                ctx.securitySolution.siemMigrations.getDashboardsClient();

              const { page, per_page: size } = req.query;
              const options: DashboardMigrationGetDashboardOptions = {
                filters: {
                  searchTerm: req.query.search_term,
                  ids: req.query.ids,
                  installed: req.query.is_installed,
                  fullyTranslated: req.query.is_fully_translated,
                  partiallyTranslated: req.query.is_partially_translated,
                  untranslatable: req.query.is_untranslatable,
                  failed: req.query.is_failed,
                },
                sort: { sortField: req.query.sort_field, sortDirection: req.query.sort_direction },
                size,
                from: page && size ? page * size : 0,
              };

              const result = await dashboardMigrationsClient.data.items.get(migrationId, options);

              await siemMigrationAuditLogger.logGetMigrationItems({ migrationId });
              return res.ok({ body: result });
            } catch (error) {
              logger.error(error);
              await siemMigrationAuditLogger.logGetMigrationItems({ migrationId, error });
              return res.badRequest({ body: error.message });
            }
          }
        )
      )
    );
};
