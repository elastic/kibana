/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { fetchSyncJobsStats } from '../../lib/stats/get_sync_jobs';
import type { RouteDependencies } from '../../types';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerStatsRoutes({ log, router }: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/stats/sync_jobs',
      validate: {
        query: schema.object({
          isCrawler: schema.maybe(schema.boolean()),
        }),
      },
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;
      const { isCrawler } = request.query;
      const body = await fetchSyncJobsStats(client, isCrawler);
      return response.ok({ body });
    })
  );
}
