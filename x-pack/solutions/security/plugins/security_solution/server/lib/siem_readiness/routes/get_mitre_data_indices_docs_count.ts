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
  return Promise.all(
    indices.map(async (index) => {
      try {
        const { count } = await esClient.count({
          index,
          ignore_unavailable: true,
          allow_no_indices: true,
        });

        return { index, docCount: count ?? 0, exists: true };
      } catch (error: unknown) {
        const esError = error as { meta?: { statusCode?: number }; message?: string };
        return {
          index,
          docCount: 0,
          exists: false,
          error: esError.meta?.statusCode === 404 ? undefined : esError.message,
        };
      }
    })
  );
}
