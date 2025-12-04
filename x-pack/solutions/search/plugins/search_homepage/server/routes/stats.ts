/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { GET_STATS_ROUTE } from '../../common/routes';

export const registerStatsRoutes = (
  router: IRouter,
  logger: Logger,
  config: {
    isSizeAndDocCountEnabled: boolean;
  }
) => {
  router.get(
    {
      path: GET_STATS_ROUTE,
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {},
      options: {
        access: 'internal',
      },
    },
    async (context, _request, response) => {
      const core = await context.core;
      const client = core.elasticsearch.client;

      if (config.isSizeAndDocCountEnabled) {
        const indexStats = await client.asSecondaryAuthUser.transport.request({
          method: 'GET',
          path: '/_metering/stats',
        });

        logger.info(indexStats);
        return response.ok({
          body: indexStats,
        });
      }

      return response.notFound();
    }
  );
};
