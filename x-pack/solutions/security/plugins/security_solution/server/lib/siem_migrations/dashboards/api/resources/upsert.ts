/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { partition } from 'lodash';
import { SIEM_DASHBOARD_MIGRATION_RESOURCES_PATH } from '../../../../../../common/siem_migrations/dashboards/constants';
import {
  UpsertDashboardMigrationResourcesRequestBody,
  UpsertDashboardMigrationResourcesRequestParams,
  type UpsertDashboardMigrationResourcesResponse,
} from '../../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import { DashboardResourceIdentifier } from '../../../../../../common/siem_migrations/dashboards/resources';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { SiemMigrationAuditLogger } from '../../../common/api/util/audit';
import { authz } from '../util/authz';
import { withLicense } from '../../../common/api/util/with_license';
import type { CreateSiemMigrationResourceInput } from '../../../common/data/siem_migrations_data_resources_client';
import { processLookups } from '../../../rules/api/util/lookups';
import { withExistingMigration } from '../../../common/api/util/with_existing_migration_id';

export const registerSiemDashboardMigrationsResourceUpsertRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_DASHBOARD_MIGRATION_RESOURCES_PATH,
      access: 'internal',
      security: { authz },
      options: { body: { maxBytes: 26214400 } }, // rise payload limit to 25MB
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpsertDashboardMigrationResourcesRequestParams),
            body: buildRouteValidationWithZod(UpsertDashboardMigrationResourcesRequestBody),
          },
        },
      },
      withLicense(
        withExistingMigration(
          async (
            context,
            req,
            res
          ): Promise<IKibanaResponse<UpsertDashboardMigrationResourcesResponse>> => {
            const resources = req.body;
            const migrationId = req.params.migration_id;
            const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
              context.securitySolution,
              'dashboards'
            );
            try {
              const ctx = await context.resolve(['securitySolution']);
              const dashboardMigrationsClient =
                ctx.securitySolution.siemMigrations.getDashboardsClient();

              const { experimentalFeatures } = ctx.securitySolution.getConfig();

              await siemMigrationAuditLogger.logUploadResources({ migrationId });

              const [lookups, macros] = partition(resources, { type: 'lookup' });
              const processedLookups = await processLookups(
                lookups,
                dashboardMigrationsClient.data.lookups
              );
              // Add migration_id to all resources
              const resourcesUpsert = [...macros, ...processedLookups].map((resource) => ({
                ...resource,
                migration_id: migrationId,
              }));

              // Create identified resource documents to keep track of them (without content)
              const resourceIdentifier = new DashboardResourceIdentifier('splunk', {
                experimentalFeatures,
              });
              const identifiedResources = await resourceIdentifier.fromResources(resources);
              const resourcesToCreate = identifiedResources.map<CreateSiemMigrationResourceInput>(
                (resource) => ({
                  ...resource,
                  migration_id: migrationId,
                })
              );

              await Promise.all([
                dashboardMigrationsClient.data.resources.upsert(resourcesUpsert),
                dashboardMigrationsClient.data.resources.create(resourcesToCreate),
              ]);

              return res.ok({ body: { acknowledged: true } });
            } catch (error) {
              logger.error(error);
              await siemMigrationAuditLogger.logUploadResources({ migrationId, error });
              return res.customError({ statusCode: 500, body: error.message });
            }
          }
        )
      )
    );
};
