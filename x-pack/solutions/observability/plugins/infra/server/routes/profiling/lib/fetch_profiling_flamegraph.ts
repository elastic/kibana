/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import type { BaseFlameGraph } from '@kbn/profiling-utils';
import { kqlQuery } from '@kbn/observability-plugin/server';
import type { InfraProfilingFlamegraphRequestParams } from '../../../../common/http_api/profiling_api';

export async function fetchProfilingFlamegraph(
  { kuery, from, to }: InfraProfilingFlamegraphRequestParams,
  profilingDataAccess: ProfilingDataAccessPluginStart,
  coreRequestContext: CoreRequestHandlerContext
): Promise<BaseFlameGraph> {
  const startSecs = from / 1000;
  const endSecs = to / 1000;

  return await profilingDataAccess.services.fetchFlamechartData({
    core: coreRequestContext,
    esClient: coreRequestContext.elasticsearch.client.asCurrentUser,
    totalSeconds: endSecs - startSecs,
    query: {
      bool: {
        filter: [
          ...kqlQuery(kuery),
          {
            range: {
              ['@timestamp']: {
                gte: String(startSecs),
                lt: String(endSecs),
                format: 'epoch_second',
              },
            },
          },
        ],
      },
    },
  });
}
