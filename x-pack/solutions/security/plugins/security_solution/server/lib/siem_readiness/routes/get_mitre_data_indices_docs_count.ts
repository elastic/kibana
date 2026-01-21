/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import * as rt from 'io-ts';
import { buildRouteValidationWithExcess } from '../../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../../common/constants';
import type { SiemReadinessRoutesDeps } from '../types';

interface IndexDocCount {
  index: string;
  docCount: number;
  exists: boolean;
  error?: string;
}

export const getMitreDataIndicesDocsCountRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger']
) => {
  router.versioned
    .post({
      path: '/api/siem_readiness/mitre_data_indices_docs_count',
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
        validate: {
          request: {
            body: buildRouteValidationWithExcess(
              rt.type({
                indices: rt.array(rt.string),
              })
            ),
          },
        },
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const { indices } = request.body;

          if (!indices || !Array.isArray(indices) || indices.length === 0) {
            return response.badRequest({
              body: { message: 'Indices array is required and cannot be empty' },
            });
          }

          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          const indexDocCounts = await getIndicesDocumentCounts(esClient, indices);

          return response.ok({
            body: {
              indices: indexDocCounts,
            },
          });
        } catch (error) {
          return siemResponse.error({
            statusCode: 500,
            body: {
              message: `Failed to get document counts: ${error.message || 'Unknown error'}`,
            },
          });
        }
      }
    );
};

async function getIndicesDocumentCounts(
  esClient: ElasticsearchClient,
  indices: string[]
): Promise<IndexDocCount[]> {
  const results: IndexDocCount[] = [];

  const batchSize = 10;
  for (let i = 0; i < indices.length; i += batchSize) {
    const batch = indices.slice(i, i + batchSize);
    const batchPromises = batch.map(async (index): Promise<IndexDocCount> => {
      try {
        const indexExists = await esClient.indices.exists({
          index,
          allow_no_indices: false,
        });

        if (!indexExists) {
          return {
            index,
            docCount: 0,
            exists: false,
          };
        }

        const countResponse = await esClient.count({
          index,
          ignore_unavailable: true,
          allow_no_indices: true,
        });

        return {
          index,
          docCount: countResponse.count || 0,
          exists: true,
        };
      } catch (error) {
        return {
          index,
          docCount: 0,
          exists: false,
          error: error.message || 'Failed to get document count',
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          index: 'unknown',
          docCount: 0,
          exists: false,
          error: result.reason?.message || 'Promise rejected',
        });
      }
    });
  }

  return results;
}
