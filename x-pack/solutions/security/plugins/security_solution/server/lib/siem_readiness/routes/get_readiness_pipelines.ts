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
            filter_path: ['nodes.*.ingest.pipelines.*.count', 'nodes.*.ingest.pipelines.*.failed'],
            timeout: '30s',
          };

          const nodesStatsResponse = await esClient.nodes.stats(nodesStatsRequest);

          // Aggregate pipeline stats across all nodes
          const pipelineStatsMap: Record<string, { count: number; failed: number }> = {};

          const nodes = Object.values(nodesStatsResponse.nodes || {});
          nodes.forEach((node) => {
            const pipelines = node.ingest?.pipelines || {};
            const pipelineNames = Object.keys(pipelines);
            pipelineNames.forEach((pipelineName) => {
              const pipelineData = pipelines[pipelineName];
              if (!pipelineStatsMap[pipelineName]) {
                pipelineStatsMap[pipelineName] = { count: 0, failed: 0 };
              }
              pipelineStatsMap[pipelineName].count += pipelineData.count || 0;
              pipelineStatsMap[pipelineName].failed += pipelineData.failed || 0;
            });
          });

          // Step 2: Get index settings to find which indices use which pipelines
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

          const indexNames = Object.keys(settingsResponse);
          indexNames.forEach((indexName) => {
            const indexData = settingsResponse[indexName];
            const defaultPipeline = indexData.settings?.index?.default_pipeline;
            const finalPipeline = indexData.settings?.index?.final_pipeline;
            addPipelineIndex(defaultPipeline, indexName);
            addPipelineIndex(finalPipeline, indexName);
          });

          // Step 3: Combine stats with indices mapping
          const pipelines: PipelinesResponse = [];
          // Filter out pipelines with 0 docs processed
          const activePipelineNames = Object.keys(pipelineStatsMap).filter(
            (name) => pipelineStatsMap[name].count > 0
          );

          activePipelineNames.forEach((name) => {
            const activePipelineStats = pipelineStatsMap[name];
            pipelines.push({
              name,
              indices: Array.from(pipelineToIndices[name] || []),
              docsCount: activePipelineStats.count,
              failedDocsCount: activePipelineStats.failed,
            });
          });

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
