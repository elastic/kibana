/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodesStatsRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PipelineStats } from '@kbn/siem-readiness';

export const fetchPipelines = async ({
  esClient,
  isServerless,
  logger,
}: {
  esClient: ElasticsearchClient;
  isServerless: boolean;
  logger: Logger;
}): Promise<PipelineStats[]> => {
  const settingsResponse = await esClient.indices.getSettings({
    index: ['logs-*', 'metrics-*', '.ds-logs-*', '.ds-metrics-*'],
    filter_path: ['*.settings.index.default_pipeline', '*.settings.index.final_pipeline'],
    allow_no_indices: true,
    ignore_unavailable: true,
  });

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

  if (isServerless) {
    const pipelines: PipelineStats[] = Object.keys(pipelineToIndices).map((name) => ({
      name,
      indices: Array.from(pipelineToIndices[name]),
      docsCount: 0,
      failedDocsCount: 0,
      statsAvailable: false,
    }));

    logger.info(`Retrieved ${pipelines.length} ingest pipelines (serverless mode)`);
    return pipelines;
  }

  const nodesStatsRequest: NodesStatsRequest = {
    metric: 'ingest',
    filter_path: ['nodes.*.ingest.pipelines.*.count', 'nodes.*.ingest.pipelines.*.failed'],
    timeout: '30s',
  };

  const nodesStatsResponse = await esClient.nodes.stats(nodesStatsRequest);

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

  const pipelines: PipelineStats[] = Object.keys(pipelineStatsMap)
    .filter((name) => pipelineStatsMap[name].count > 0)
    .map((name) => ({
      name,
      indices: Array.from(pipelineToIndices[name] || []),
      docsCount: pipelineStatsMap[name].count,
      failedDocsCount: pipelineStatsMap[name].failed,
      statsAvailable: true,
    }));

  logger.info(`Retrieved ${pipelines.length} active ingest pipelines`);
  return pipelines;
};
