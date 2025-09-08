/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IContentClient } from '@kbn/content-management-plugin/server/content_client/types';
import type { DashboardAttributes } from '@kbn/dashboard-plugin/server';
import type { DashboardMigrationDashboard } from '../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { getErrorMessage } from '../../../../../utils/error_helpers';
import { initPromisePool } from '../../../../../utils/promise_pool';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../..';
import { getVendorTag } from '../../../rules/api/util/tags';

const MAX_DASHBOARDS_TO_CREATE_IN_PARALLEL = 10;

interface InstallTranslatedProps {
  /**
   * The migration id
   */
  migrationId: string;

  /**
   * If specified, then installable translated dashboards in the list will be installed,
   * otherwise all installable translated dashboards will be installed.
   */
  ids?: string[];

  /**
   * The security solution context
   */
  securitySolutionContext: SecuritySolutionApiRequestHandlerContext;

  /**
   * The content management setup
   */
  dashboardClient: IContentClient<DashboardAttributes>;
}

export const installTranslated = async ({
  migrationId,
  ids,
  dashboardClient,
  securitySolutionContext,
}: InstallTranslatedProps): Promise<number> => {
  const dashboardMigrationsClient = securitySolutionContext.siemMigrations.getDashboardsClient();

  let installedCount = 0;
  const installationErrors: Error[] = [];

  // Get installable dashboard migrations
  const dashboardBatches = dashboardMigrationsClient.data.items.searchBatches(migrationId, {
    filters: { ids, installable: true },
  });

  let dashboardsToInstall = await dashboardBatches.next();
  while (dashboardsToInstall.length) {
    const { dashboardsToUpdate, errors } = await installDashboards(
      dashboardsToInstall,
      dashboardClient
    );
    installedCount += dashboardsToUpdate.length;
    installationErrors.push(...errors);
    await dashboardMigrationsClient.data.items.update(dashboardsToUpdate);
    dashboardsToInstall = await dashboardBatches.next();
  }

  // Throw an error if needed
  if (installationErrors.length) {
    throw new Error(installationErrors.map((err) => err.message).join(', '));
  }

  return installedCount;
};

const installDashboards = async (
  dashboardsToInstall: DashboardMigrationDashboard[],
  dashboardClient: IContentClient<DashboardAttributes>
): Promise<{
  dashboardsToUpdate: Array<DashboardMigrationDashboard>;
  errors: Error[];
}> => {
  const errors: Error[] = [];
  const dashboardsToUpdate: Array<DashboardMigrationDashboard> = [];

  const createDashboardsOutcome = await initPromisePool({
    concurrency: MAX_DASHBOARDS_TO_CREATE_IN_PARALLEL,
    items: dashboardsToInstall,
    executor: async (dashboard) => {
      try {
        // Check if dashboard data exists
        if (!dashboard.elastic_dashboard?.data) {
          throw new Error('Invalid Dashboard: No data to install');
        }

        // Parse the dashboard data (assuming it's JSON)
        const dashboardData = JSON.parse(dashboard.elastic_dashboard.data);
        const tags = [getVendorTag(dashboard.original_dashboard)];

        const { result } = await dashboardClient.create(
          {
            title: dashboard.original_dashboard.title,
            description: dashboard.original_dashboard.description,
            // Add other dashboard attributes as needed
            ...dashboardData.attributes,
          },
          {
            id: dashboard.id,
            references: [
              {
                type: 'tag',
                id: `Migration ID: ${dashboard.migration_id}`,
              },
              // Add tag references if tags are provided
              ...(tags?.map((tagId) => ({
                type: 'tag',
                id: tagId,
              })) || []),
            ],
            initialNamespaces: [],
          }
        );

        dashboardsToUpdate.push({
          ...dashboard,
          elastic_dashboard: {
            id: dashboard.id,
            title: dashboard.original_dashboard.title,
            description: dashboard.original_dashboard.description,
            data: JSON.stringify(result.item),
          },
        });
      } catch (error) {
        errors.push(
          new Error(`Error installing dashboard ${dashboard.id}: ${getErrorMessage(error)}`)
        );
      }
    },
  });

  errors.push(
    ...createDashboardsOutcome.errors.map(
      (err) => new Error(`Error installing dashboard: ${getErrorMessage(err)}`)
    )
  );

  return { dashboardsToUpdate, errors };
};
