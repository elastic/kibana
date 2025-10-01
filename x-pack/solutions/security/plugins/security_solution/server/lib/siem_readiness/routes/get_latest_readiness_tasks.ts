/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { GET_LATEST_SIEM_READINESS_TASKS_API_PATH } from '../../../../common/api/siem_readiness/constants';
import { API_VERSIONS } from '../../../../common/constants';
import type { SiemReadinessRoutesDeps } from '../types';

const SIEM_READINESS_INDEX = 'security_solution-siem_readiness';

export interface TaskSource {
  task_id: string;
  status: 'completed' | 'incomplete';
  '@timestamp': string;
  meta?: Record<string, unknown>;
}

interface EsHit<T = unknown> {
  _index: string;
  _id: string;
  _source: T;
}

interface TopHitsAggregation<T = unknown> {
  hits: {
    hits: EsHit<T>[];
  };
}

interface TermsBucket<T = unknown> {
  key: string;
  doc_count: number;
  latest_doc: TopHitsAggregation<T>;
}

interface TermsAggregation<T = unknown> {
  buckets: TermsBucket<T>[];
}

interface AggregationResponse<T = unknown> {
  latest_tasks: TermsAggregation<T>;
}

export const getLatestReadinessTaskRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger']
) => {
  router.versioned
    .get({
      path: GET_LATEST_SIEM_READINESS_TASKS_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {},
      },

      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          const searchResult = await esClient.search<TaskSource, AggregationResponse<TaskSource>>({
            index: SIEM_READINESS_INDEX,
            size: 0,
            aggs: {
              latest_tasks: {
                terms: {
                  field: 'task_id.keyword',
                  size: 1000,
                },
                aggs: {
                  latest_doc: {
                    top_hits: {
                      size: 1,
                      sort: [
                        {
                          '@timestamp': {
                            order: 'desc',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          });

          // Extract the latest document for each task_id from aggregation results
          const latestTasks: TaskSource[] =
            searchResult.aggregations?.latest_tasks?.buckets?.map(
              (bucket: TermsBucket<TaskSource>) => bucket.latest_doc.hits.hits[0]._source
            ) || [];

          logger.info(
            `Retrieved ${latestTasks.length} latest SIEM readiness tasks from ${SIEM_READINESS_INDEX}`
          );

          return response.ok({
            body: latestTasks,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error retrieving SIEM readiness tasks: ${error.message}`);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
