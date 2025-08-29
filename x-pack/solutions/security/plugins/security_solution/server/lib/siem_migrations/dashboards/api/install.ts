/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger, RequestHandlerContext } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import { SIEM_DASHBOARD_MIGRATION_INSTALL_PATH } from '../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { SiemMigrationAuditLogger } from '../../common/utils/audit';
import { installTranslated } from './utils/installation';
import { authz } from '../../common/utils/authz';
import { withLicense } from '../../common/utils/with_license';
import { withExistingDashboardMigration } from './utils/use_existing_dashboard_migration';

// Define the request/response types manually since we can't regenerate them
const InstallMigrationDashboardsRequestParams = z.object({
  migration_id: z.string(),
});

const InstallMigrationDashboardsRequestBody = z.object({
  ids: z.array(z.string()),
});

const InstallMigrationDashboardsResponse = z.object({
  installed: z.number(),
});

type InstallMigrationDashboardsRequestParams = z.infer<
  typeof InstallMigrationDashboardsRequestParams
>;
type InstallMigrationDashboardsRequestBody = z.infer<typeof InstallMigrationDashboardsRequestBody>;
type InstallMigrationDashboardsResponse = z.infer<typeof InstallMigrationDashboardsResponse>;

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
        withExistingDashboardMigration(
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
              const ctx = await context.resolve(['core', 'contentManagement', 'securitySolution']);

              const securitySolutionContext = ctx.securitySolution;
              const savedObjectsClient = ctx.core.savedObjects.client;
              const contentManagement = ctx.contentManagement;

              await siemMigrationAuditLogger.logInstallDashboards({ ids, migrationId });

              const installed = await installTranslated({
                migrationId,
                ids,
                securitySolutionContext,
                contentManagement,
                savedObjectsClient,
                request: req,
                context: ctx as unknown as RequestHandlerContext,
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
