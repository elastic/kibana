/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import { DEPLOYMENT_STATS_PATH } from '../../common/constants';
import { fetchDashboardsCount, fetchIndexStats } from '../lib/deployment_stats';

export const registerDeploymentStatsRoute = (router: IRouter, logger: Logger) => {
  router.get(
    {
      path: DEPLOYMENT_STATS_PATH,
      validate: false,
      security: {
        authz: AuthzDisabled.delegateToESClient,
      },
    },
    async (context, request, response) => {
      try {
        const core = await context.core;
        const client = core.elasticsearch.client;
        const savedObjectsClient = core.savedObjects.getClient();

        const [{ indicesCount, storeSizeBytes, vectorDocsCount }, dashboardsCount] =
          await Promise.all([
            fetchIndexStats(client, logger),
            fetchDashboardsCount(savedObjectsClient, logger),
          ]);

        return response.ok({
          body: {
            indicesCount,
            storeSizeBytes,
            vectorDocsCount,
            dashboardsCount,
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
