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

          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          const indexDocCounts = await getIndicesDocumentCounts(esClient, indices || []);

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
  // If indices is empty, return immediately to avoid ES calls
  if (indices.length === 0) return [];

  const promises = indices.map(async (index): Promise<IndexDocCount> => {
    try {
      // Direct count call is more efficient than exists + count
      const { count } = await esClient.count({
        index,
        ignore_unavailable: true, // Returns 0 if index doesn't exist
        allow_no_indices: true,
      });

      return {
        index,
        docCount: count ?? 0,
        exists: true, // Note: with ignore_unavailable, it's hard to distinguish "empty" vs "missing" without a second call
      };
    } catch (error) {
      // Handle the case where the index truly doesn't exist or permissions are missing
      const is404 = error.meta?.statusCode === 404;
      return {
        index,
        docCount: 0,
        exists: false,
        error: is404 ? undefined : error.message,
      };
    }
  });

  const results = await Promise.allSettled(promises);
  return results.map((res, idx) =>
    res.status === 'fulfilled'
      ? res.value
      : {
          index: indices[idx],
          docCount: 0,
          exists: false,
          error: res.reason?.message,
        }
  );
}
