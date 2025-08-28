/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { SavedObjectsClientContract, KibanaRequest } from '@kbn/core/server';
import { getErrorMessage } from '../../../../../utils/error_helpers';
import { initPromisePool } from '../../../../../utils/promise_pool';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../../..';
import type { StoredDashboardMigration } from '../../types';

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
  contentManagement: ContentManagementServerSetup;

  /**
   * The saved objects client
   */
  savedObjectsClient: SavedObjectsClientContract;

  /**
   * The request object for content management client
   */
  request: KibanaRequest;
}

export const installTranslated = async ({
  migrationId,
  ids,
  securitySolutionContext,
  contentManagement,
  savedObjectsClient,
  request,
}: InstallTranslatedProps): Promise<number> => {
  const dashboardMigrationsClient = securitySolutionContext.siemMigrations.getDashboardsClient();

  let installedCount = 0;
  const installationErrors: Error[] = [];

  // Get installable dashboard migrations
  const dashboardBatches = dashboardMigrationsClient.data.dashboards.searchBatches(migrationId, {
    filters: { ids, installable: true },
  });

  let dashboardsToInstall = await dashboardBatches.next();
  while (dashboardsToInstall.length) {
    const { dashboardsToUpdate, errors } = await installDashboards(
      dashboardsToInstall,
      securitySolutionContext,
      contentManagement,
      savedObjectsClient,
      request
    );
    installedCount += dashboardsToUpdate.length;
    installationErrors.push(...errors);
    await dashboardMigrationsClient.data.dashboards.update(dashboardsToUpdate);
    dashboardsToInstall = await dashboardBatches.next();
  }

  // Throw an error if needed
  if (installationErrors.length) {
    throw new Error(installationErrors.map((err) => err.message).join(', '));
  }

  return installedCount;
};

const installDashboards = async (
  dashboardsToInstall: StoredDashboardMigration[],
  securitySolutionContext: SecuritySolutionApiRequestHandlerContext,
  contentManagement: ContentManagementServerSetup,
  savedObjectsClient: SavedObjectsClientContract,
  request: KibanaRequest
): Promise<{
  dashboardsToUpdate: Array<{ id: string; elastic_dashboard: { id: string } }>;
  errors: Error[];
}> => {
  const errors: Error[] = [];
  const dashboardsToUpdate: Array<{ id: string; elastic_dashboard: { id: string } }> = [];

  const createDashboardsOutcome = await initPromisePool({
    concurrency: MAX_DASHBOARDS_TO_CREATE_IN_PARALLEL,
    items: dashboardsToInstall,
    executor: async (dashboard) => {
      try {
        // Parse the dashboard data (assuming it's JSON)
        const dashboardData = JSON.parse(dashboard.original_dashboard.data);

        // Create dashboard using content management client
        const client = contentManagement.contentClient
          .getForRequest({
            request,
            requestHandlerContext: securitySolutionContext,
          })
          .for('dashboard', '1');

        const { result } = await client.create(
          {
            title: dashboard.original_dashboard.title,
            description: dashboard.original_dashboard.description,
            // Add other dashboard attributes as needed
            ...dashboardData,
          },
          {
            id: undefined, // Let the system generate an ID
            references: [],
            initialNamespaces: [],
          }
        );

        dashboardsToUpdate.push({
          id: dashboard.id,
          elastic_dashboard: {
            id: result.id,
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
