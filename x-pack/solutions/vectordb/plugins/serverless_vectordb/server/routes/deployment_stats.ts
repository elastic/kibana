/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import { DEPLOYMENT_STATS_PATH } from '../../common/constants';
import { fetchDashboardsCount } from '../lib/dashboards';
import {
  fetchApiKeysStats,
  fetchIndexStats,
  hasIndexMonitorPrivilege,
} from '../lib/deployment_stats';

export const registerDeploymentStatsRoute = (router: IRouter, logger: Logger) => {
  router.get(
    {
      path: DEPLOYMENT_STATS_PATH,
      validate: false,
      security: {
        authz: AuthzDisabled.fromReason(
          'All counts, except vector count, are scoped to the caller. The vector count is gated by a handler that checks the caller holds the `monitor` privilege on all indices before returning that cluster-wide total. The dashboard count is authorized by the saved objects client'
        ),
      },
    },
    async (context, request, response) => {
      try {
        const core = await context.core;
        const client = core.elasticsearch.client;
        const savedObjectsClient = core.savedObjects.getClient();

        const canMonitorAllIndices = await hasIndexMonitorPrivilege(client, logger);

        const [
          { indicesCount, storeSizeBytes, vectorCount, documentsCount },
          dashboardsCount,
          { total: apiKeysCount, expiring: expiringApiKeysCount },
        ] = await Promise.all([
          fetchIndexStats(client, logger, { canMonitorAllIndices }),
          fetchDashboardsCount(savedObjectsClient, logger),
          fetchApiKeysStats(client, logger),
        ]);

        return response.ok({
          body: {
            indicesCount,
            storeSizeBytes,
            // Omitted rather than nulled for an unprivileged caller, so the response says nothing
            // about a stat they can not see.
            ...(canMonitorAllIndices ? { vectorCount } : {}),
            documentsCount,
            dashboardsCount,
            apiKeysCount,
            expiringApiKeysCount,
          },
        });
      } catch (error) {
        logger.warn(`Failed to fetch vectordb deployment stats: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: { message: 'Failed to fetch deployment stats' },
        });
      }
    }
  );
};
