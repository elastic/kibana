/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core/server';
import type { DashboardMigrationDashboard } from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import {
  CreateDashboardMigrationDashboardsRequestBody,
  CreateDashboardMigrationDashboardsRequestParams,
} from '../../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH } from '../../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../util/authz';
import { withLicense } from '../../../common/api/util/with_license';
import type { CreateMigrationItemInput } from '../../../common/data/siem_migrations_data_item_client';
import { DashboardResourceIdentifier } from '../../../../../../common/siem_migrations/dashboards/resources';
import { SiemMigrationAuditLogger } from '../../../common/api/util/audit';
import { withExistingMigration } from '../../../common/api/util/with_existing_migration_id';

type CreateMigrationDashboardInput = CreateMigrationItemInput<DashboardMigrationDashboard>;

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
      withLicense(
        withExistingMigration(async (context, req, res): Promise<IKibanaResponse<undefined>> => {
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

            // Convert the original splunk dashboards format to the migration dashboard item document format
            const items = originalDashboardsExport.map<CreateMigrationDashboardInput>(
              ({ result: { ...originalDashboard } }) => ({
                migration_id: migrationId,
                original_dashboard: {
                  id: originalDashboard.id,
                  title: originalDashboard.label ?? originalDashboard.title,
                  description: originalDashboard.description ?? '',
                  data: originalDashboard['eai:data'],
                  format: 'xml',
                  vendor: 'splunk',
                  last_updated: originalDashboard.updated,
                  splunk_properties: {
                    app: originalDashboard['eai:acl.app'],
                    owner: originalDashboard['eai:acl.owner'],
                    sharing: originalDashboard['eai:acl.sharing'],
                  },
                },
              })
            );

            const resourceIdentifier = new DashboardResourceIdentifier(
              items[0].original_dashboard.vendor,
              {
                experimentalFeatures: ctx.securitySolution.getConfig().experimentalFeatures,
              }
            );

            const [, extractedResources] = await Promise.all([
              siemMigrationAuditLogger.logAddDashboards({
                migrationId,
                count: originalDashboardsCount,
              }),
              resourceIdentifier.fromOriginals(items.map((dash) => dash.original_dashboard)),
            ]);

            const resources = extractedResources.map((resource) => ({
              ...resource,
              migration_id: migrationId,
            }));

            await Promise.all([
              dashboardMigrationsClient.data.items.create(items),
              dashboardMigrationsClient.data.resources.create(resources),
            ]);

            return res.ok();
          } catch (error) {
            logger.error(`Error creating dashboards for migration ID ${migrationId}: ${error}`);
            return res.customError({
              statusCode: 500,
              body: `Error creating dashboards for migration ID ${migrationId}: ${error.message}`,
            });
          }
        })
      )
    );
};
