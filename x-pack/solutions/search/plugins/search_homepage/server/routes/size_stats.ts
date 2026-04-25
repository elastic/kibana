/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { GET_STATS_ROUTE } from '../../common/routes';
import type { RouterContextData, StatsResponse } from '../types';
import { fetchSizeStats } from '../lib/size_stats';

export const registerStatsRoutes = (
  router: IRouter,
  _logger: Logger,
  { isServerless }: RouterContextData
): void => {
  router.get<unknown, unknown, StatsResponse>(
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
      const client = (await context.core).elasticsearch.client;

      const stats = await fetchSizeStats(client, isServerless);
      return response.ok({
        headers: { 'content-type': 'application/json' },
        body: stats,
      });
    }
  );
};
