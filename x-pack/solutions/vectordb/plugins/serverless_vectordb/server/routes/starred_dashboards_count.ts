/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { FAVORITES_LIMIT } from '@kbn/content-management-favorites-common';
import type { IRouter, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';
import { STARRED_DASHBOARDS_COUNT_PATH } from '../../common/constants';
import { countExistingDashboards } from '../lib/dashboards';

export const registerStarredDashboardsCountRoute = (router: IRouter, logger: Logger) => {
  router.post(
    {
      path: STARRED_DASHBOARDS_COUNT_PATH,
      validate: {
        body: schema.object({
          dashboardIds: schema.arrayOf(schema.string({ minLength: 1, maxLength: 256 }), {
            maxSize: FAVORITES_LIMIT,
          }),
        }),
      },
      security: {
        authz: AuthzDisabled.delegateToSOClient,
      },
    },
    async (context, request, response) => {
      try {
        const core = await context.core;
        const savedObjectsClient = core.savedObjects.getClient();
        const { dashboardIds } = request.body;

        return response.ok({
          body: { count: await countExistingDashboards(savedObjectsClient, dashboardIds, logger) },
        });
      } catch (error) {
        logger.warn(`Failed to count starred vectordb dashboards: ${error.message}`);
        return response.customError({
          statusCode: error.statusCode ?? 500,
          body: { message: 'Failed to count starred dashboards' },
        });
      }
    }
  );
};
