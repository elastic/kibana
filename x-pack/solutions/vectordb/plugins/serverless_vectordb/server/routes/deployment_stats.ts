/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { AuthzDisabled } from '@kbn/core-security-server';

interface MappingProperty {
  type?: string;
  properties?: Record<string, MappingProperty>;
}

interface MeteringIndexStat {
  name: string;
  num_docs: number;
  size_in_bytes: number;
}

interface MeteringStatsResponse {
  _total: { num_docs: number; size_in_bytes: number };
  indices: MeteringIndexStat[];
}

export const containsVectorField = (properties?: Record<string, MappingProperty>): boolean => {
  if (!properties) return false;
  for (const value of Object.values(properties)) {
    if (value.type === 'dense_vector' || value.type === 'semantic_text') return true;
    if (value.properties && containsVectorField(value.properties)) return true;
  }
  return false;
};

export const registerDeploymentStatsRoute = (router: IRouter, logger: Logger) => {
  router.get(
    {
      path: '/internal/serverless_vectordb/deployment_stats',
      validate: false,
      security: {
        authz: AuthzDisabled.delegateToESClient,
      },
    },
    async (context, request, response) => {
      try {
        const core = await context.core;
        const client = core.elasticsearch.client;

        // Serverless-only `_metering/stats` returns docs + size for all user indices.
        // Requires asSecondaryAuthUser.
        const meteringStats =
          await client.asSecondaryAuthUser.transport.request<MeteringStatsResponse>({
            method: 'GET',
            path: '/_metering/stats',
          });

        const userIndices = (meteringStats.indices ?? []).filter(
          (index) => !index.name.startsWith('.')
        );

        const indicesCount = userIndices.length;
        const storeSizeBytes = userIndices.reduce(
          (sum, index) => sum + (index.size_in_bytes ?? 0),
          0
        );

        let vectorDocsCount = 0;
        if (indicesCount > 0) {
          const indexNames = userIndices.map((i) => i.name);

          try {
            const mappings = await client.asCurrentUser.indices.getMapping({
              index: indexNames,
            });
            const vectorIndexNames = new Set(
              Object.entries(mappings)
                .filter(([, mapping]) =>
                  containsVectorField(
                    mapping.mappings?.properties as Record<string, MappingProperty>
                  )
                )
                .map(([name]) => name)
            );

            vectorDocsCount = userIndices
              .filter((i) => vectorIndexNames.has(i.name))
              .reduce((sum, i) => sum + (i.num_docs ?? 0), 0);
          } catch (error) {
            logger.warn(
              `Failed to fetch mappings for vectordb deployment stats. Returning partial stats: ${error.message}`
            );
          }
        }

        let dashboardsCount = 0;
        try {
          const savedObjectsClient = core.savedObjects.getClient();
          const result = await savedObjectsClient.find({ type: 'dashboard', perPage: 0 });
          dashboardsCount = result.total;
        } catch (dashboardError) {
          logger.warn(
            `Failed to fetch dashboard count for vectordb deployment stats: ${dashboardError.message}`
          );
        }

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
