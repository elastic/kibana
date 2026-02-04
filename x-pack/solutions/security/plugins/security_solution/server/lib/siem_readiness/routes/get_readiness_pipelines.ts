/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodesStatsRequest } from '@elastic/elasticsearch/lib/api/types';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { GET_SIEM_READINESS_PIPELINES_API_PATH } from '../../../../common/api/siem_readiness/constants';
import { API_VERSIONS } from '../../../../common/constants';
import type { SiemReadinessRoutesDeps } from '../types';

export interface PipelineStats {
  name: string;
  indices: string[];
  count: number;
  failed: number;
  timeInMillis: number;
}

export type PipelinesResponse = PipelineStats[];

export const getReadinessPipelinesRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger']
) => {
  router.versioned
    .get({
      path: GET_SIEM_READINESS_PIPELINES_API_PATH,
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

          // Step 1: Get pipeline stats from all nodes
          const nodesStatsRequest: NodesStatsRequest = {
            metric: 'ingest',
            filter_path: [
              'nodes.*.ingest.pipelines.*.count',
              'nodes.*.ingest.pipelines.*.time_in_millis',
              'nodes.*.ingest.pipelines.*.failed',
            ],
            timeout: '30s',
          };

          const nodesStatsResponse = await esClient.nodes.stats(nodesStatsRequest);

          // Aggregate pipeline stats across all nodes
          const pipelineStatsMap: Record<string, { count: number; failed: number; timeInMillis: number }> = {};

          Object.values(nodesStatsResponse.nodes ?? {}).forEach((node) => {
            Object.entries(node.ingest?.pipelines ?? {}).forEach(([pipelineName, pipelineData]) => {
              if (!pipelineStatsMap[pipelineName]) {
                pipelineStatsMap[pipelineName] = { count: 0, failed: 0, timeInMillis: 0 };
              }
              pipelineStatsMap[pipelineName].count += pipelineData.count ?? 0;
              pipelineStatsMap[pipelineName].failed += pipelineData.failed ?? 0;
              pipelineStatsMap[pipelineName].timeInMillis += pipelineData.time_in_millis ?? 0;
            });
          });

          // Step 2: Get index settings to find which indices use which pipelines
          // Query all indices that might have pipelines configured
          const settingsResponse = await esClient.indices.getSettings({
            index: '*',
            filter_path: ['*.settings.index.default_pipeline', '*.settings.index.final_pipeline'],
            allow_no_indices: true,
            ignore_unavailable: true,
          });

          // Build pipeline -> indices mapping
          const pipelineToIndices: Record<string, Set<string>> = {};

          Object.entries(settingsResponse).forEach(([indexName, indexData]) => {
            const defaultPipeline = indexData.settings?.index?.default_pipeline;
            const finalPipeline = indexData.settings?.index?.final_pipeline;

            if (defaultPipeline) {
              if (!pipelineToIndices[defaultPipeline]) {
                pipelineToIndices[defaultPipeline] = new Set();
              }
              pipelineToIndices[defaultPipeline].add(indexName);
            }

            if (finalPipeline) {
              if (!pipelineToIndices[finalPipeline]) {
                pipelineToIndices[finalPipeline] = new Set();
              }
              pipelineToIndices[finalPipeline].add(indexName);
            }
          });

          // Step 3: Combine stats with indices mapping
          const pipelines: PipelinesResponse = Object.entries(pipelineStatsMap)
            .filter(([_, stats]) => stats.count > 0) // Only include pipelines with activity
            .map(([name, stats]) => ({
              name,
              indices: Array.from(pipelineToIndices[name] ?? []),
              count: stats.count,
              failed: stats.failed,
              timeInMillis: stats.timeInMillis,
            }))
            .sort((a, b) => b.count - a.count); // Sort by docs processed descending

          logger.info(`Retrieved ${pipelines.length} active ingest pipelines`);

          return response.ok({
            body: pipelines,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error retrieving SIEM readiness pipelines: ${error.message}`);

          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );
};
