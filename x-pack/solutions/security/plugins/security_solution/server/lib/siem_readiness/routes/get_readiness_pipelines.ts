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
  docsCount: number;
  failedDocsCount: number;
  /** False when the server cannot provide ingestion stats (e.g. serverless mode). */
  statsAvailable: boolean;
}

export type PipelinesResponse = PipelineStats[];

export const getReadinessPipelinesRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger'],
  isServerless: boolean
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

          // Step 1: Get index settings to find which indices use which pipelines.
          // This works in both serverless and non-serverless modes.
          const settingsResponse = await esClient.indices.getSettings({
            index: ['logs-*', 'metrics-*', '.ds-logs-*', '.ds-metrics-*'],
            filter_path: ['*.settings.index.default_pipeline', '*.settings.index.final_pipeline'],
            allow_no_indices: true,
            ignore_unavailable: true,
          });

          // Build pipeline -> indices mapping
          const pipelineToIndices: Record<string, Set<string>> = {};

          const addPipelineIndex = (pipeline: string | undefined, indexName: string) => {
            if (!pipeline) return;
            if (!pipelineToIndices[pipeline]) {
              pipelineToIndices[pipeline] = new Set();
            }
            pipelineToIndices[pipeline].add(indexName);
          };

          Object.keys(settingsResponse).forEach((indexName) => {
            const indexData = settingsResponse[indexName];
            addPipelineIndex(indexData.settings?.index?.default_pipeline, indexName);
            addPipelineIndex(indexData.settings?.index?.final_pipeline, indexName);
          });

          // nodes.stats ingest API is not available in serverless mode.
          // Use pipelineToIndices (built from logs-*/metrics-* index settings) to return
          // only pipelines that are referenced by SIEM-related indices, without stats.
          if (isServerless) {
            const pipelines: PipelinesResponse = Object.keys(pipelineToIndices).map((name) => ({
              name,
              indices: Array.from(pipelineToIndices[name]),
              docsCount: 0,
              failedDocsCount: 0,
              statsAvailable: false,
            }));

            logger.info(`Retrieved ${pipelines.length} ingest pipelines (serverless mode)`);
            return response.ok({ body: pipelines });
          }

          // Step 2: Get pipeline stats from all nodes (non-serverless only)
          const nodesStatsRequest: NodesStatsRequest = {
            metric: 'ingest',
            filter_path: ['nodes.*.ingest.pipelines.*.count', 'nodes.*.ingest.pipelines.*.failed'],
            timeout: '30s',
          };

          const nodesStatsResponse = await esClient.nodes.stats(nodesStatsRequest);

          // Aggregate pipeline stats across all nodes
          const pipelineStatsMap: Record<string, { count: number; failed: number }> = {};

          const nodes = Object.values(nodesStatsResponse.nodes || {});
          nodes.forEach((node) => {
            const nodePipelines = node.ingest?.pipelines || {};
            Object.keys(nodePipelines).forEach((pipelineName) => {
              const pipelineData = nodePipelines[pipelineName];
              if (!pipelineStatsMap[pipelineName]) {
                pipelineStatsMap[pipelineName] = { count: 0, failed: 0 };
              }
              pipelineStatsMap[pipelineName].count += pipelineData.count || 0;
              pipelineStatsMap[pipelineName].failed += pipelineData.failed || 0;
            });
          });

          // Step 3: Combine stats with indices mapping, filtering out pipelines with 0 docs processed
          const pipelines: PipelinesResponse = Object.keys(pipelineStatsMap)
            .filter((name) => pipelineStatsMap[name].count > 0)
            .map((name) => ({
              name,
              indices: Array.from(pipelineToIndices[name] || []),
              docsCount: pipelineStatsMap[name].count,
              failedDocsCount: pipelineStatsMap[name].failed,
              statsAvailable: true,
            }));

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
