/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SIEM_DASHBOARD_MIGRATION_INSTALL_PATH } from '../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { InstallMigrationDashboardsResponse } from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import {
  InstallMigrationDashboardsRequestBody,
  InstallMigrationDashboardsRequestParams,
} from '../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { authz } from './util/authz';
import { withLicense } from '../../common/api/util/with_license';
import { withExistingMigration } from '../../common/api/util/with_existing_migration_id';
import { SiemMigrationAuditLogger } from '../../common/api/util/audit';
import { installTranslated } from './util/installation';

export const registerSiemDashboardMigrationsInstallRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_DASHBOARD_MIGRATION_INSTALL_PATH,
      access: 'internal',
      security: { authz },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(InstallMigrationDashboardsRequestParams),
            body: buildRouteValidationWithZod(InstallMigrationDashboardsRequestBody),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (
            context,
            req,
            res
          ): Promise<IKibanaResponse<InstallMigrationDashboardsResponse>> => {
            const { migration_id: migrationId } = req.params;
            const { ids } = req.body;
            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
              context.securitySolution,
              'dashboards'
            );

            try {
              const ctx = await context.resolve(['core', 'securitySolution']);

              const securitySolutionContext = ctx.securitySolution;
              const savedObjectsClient = ctx.core.savedObjects.client;
              const spaceId = ctx.securitySolution.getSpaceId();

              await siemMigrationAuditLogger.logInstallDashboards({ ids, migrationId });

              const installed = await installTranslated({
                migrationId,
                ids,
                securitySolutionContext,
                savedObjectsClient,
                spaceId,
              });

              return res.ok({ body: { installed } });
            } catch (error) {
              logger.error(error);
              await siemMigrationAuditLogger.logInstallDashboards({ ids, migrationId, error });
              return res.badRequest({ body: error.message });
            }
          }
        )
      )
    );
};
