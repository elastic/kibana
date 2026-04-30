/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { IKibanaResponse } from '@kbn/core/server';
import type { DashboardMigrationDashboard } from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import {
  CreateDashboardMigrationDashboardsRequestBody,
  CreateDashboardMigrationDashboardsRequestParams,
} from '../../../../../../common/siem_migrations/model/api/dashboards/dashboard_migration.gen';
import type {
  CreateSentinelDashboardsBody,
  SentinelWorkbookArmResource,
} from '../../../../../../common/siem_migrations/model/vendor/dashboards/sentinel.gen';
import type { SplunkOriginalDashboardExport } from '../../../../../../common/siem_migrations/model/vendor/dashboards/splunk.gen';
import { SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH } from '../../../../../../common/siem_migrations/dashboards/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { authz } from '../util/authz';
import { withLicense } from '../../../common/api/util/with_license';
import type { CreateMigrationItemInput } from '../../../common/data/siem_migrations_data_item_client';
import { DashboardResourceIdentifier } from '../../../../../../common/siem_migrations/dashboards/resources';
import { SentinelWorkbookParser } from '../../../../../../common/siem_migrations/parsers/sentinel/workbook_json';
import { SiemMigrationAuditLogger } from '../../../common/api/util/audit';
import { withExistingMigration } from '../../../common/api/util/with_existing_migration_id';

type CreateMigrationDashboardInput = CreateMigrationItemInput<DashboardMigrationDashboard>;

const isSentinelDashboardsBody = (
  body: CreateDashboardMigrationDashboardsRequestBody
): body is CreateSentinelDashboardsBody =>
  !Array.isArray(body) && body.vendor === 'microsoft-sentinel';

export const registerSiemDashboardMigrationsCreateDashboardsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  router.versioned
    .post({
      path: SIEM_DASHBOARD_MIGRATION_DASHBOARDS_PATH,
      access: 'internal',
      security: { authz },
      options: { body: { maxBytes: 25 * 1024 * 1024 } }, // raise payload limit to 25MB
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
          const body = req.body;

          const siemMigrationAuditLogger = new SiemMigrationAuditLogger(
            context.securitySolution,
            'dashboards'
          );

          try {
            const ctx = await context.resolve(['securitySolution']);
            const dashboardMigrationsClient =
              ctx.securitySolution.siemMigrations.getDashboardsClient();
            const { experimentalFeatures } = ctx.securitySolution.getConfig();

            let items: CreateMigrationDashboardInput[];

            if (isSentinelDashboardsBody(body)) {
              if (!experimentalFeatures.sentinelDashboardsMigration) {
                return res.badRequest({
                  body: 'Microsoft Sentinel dashboards migration is not enabled',
                });
              }
              items = mapSentinelWorkbooksToItems(migrationId, body.resources);
              if (items.length === 0) {
                return res.badRequest({
                  body: `No Workbooks found in the provided JSON for migration ID ${migrationId}.`,
                });
              }
            } else {
              if (body.length === 0) {
                return res.badRequest({
                  body: `No dashboards provided for migration ID ${migrationId}. Please provide at least one dashboard.`,
                });
              }
              items = mapSplunkDashboardsToItems(migrationId, body);
            }

            const resourceIdentifier = new DashboardResourceIdentifier(
              items[0].original_dashboard.vendor,
              { experimentalFeatures }
            );

            const [, extractedResources] = await Promise.all([
              siemMigrationAuditLogger.logAddDashboards({
                migrationId,
                count: items.length,
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

const mapSplunkDashboardsToItems = (
  migrationId: string,
  exports: SplunkOriginalDashboardExport[]
): CreateMigrationDashboardInput[] =>
  exports.map(({ result: { ...originalDashboard } }) => ({
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
  }));

const mapSentinelWorkbooksToItems = (
  migrationId: string,
  resources: SentinelWorkbookArmResource[]
): CreateMigrationDashboardInput[] => {
  const parser = new SentinelWorkbookParser(resources);
  return parser.getWorkbooks().map((workbook) => ({
    migration_id: migrationId,
    original_dashboard: {
      id: workbook.id,
      title: workbook.title,
      description: workbook.description,
      data: workbook.serializedData,
      format: 'json',
      vendor: 'microsoft-sentinel',
    },
  }));
};
