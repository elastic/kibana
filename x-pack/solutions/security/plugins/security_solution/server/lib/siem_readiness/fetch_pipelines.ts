/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { NodesStatsRequest } from '@elastic/elasticsearch/lib/api/types';
import type { PipelineStats } from '@kbn/siem-readiness-common';

/**
 * Fetches ingest pipeline stats for SIEM-related indices (`logs-*`, `metrics-*`).
 * In serverless mode, node stats are unavailable so `docsCount` and `failedDocsCount`
 * are both 0 and `statsAvailable` is false.
 *
 * Shared between the HTTP route handler and agent tool handlers.
 */
export const fetchPipelines = async (
  esClient: ElasticsearchClient,
  isServerless: boolean
): Promise<PipelineStats[]> => {
  // Step 1: Build pipeline → indices map from index settings (works in both modes)
  const settingsResponse = await esClient.indices.getSettings({
    index: ['logs-*', 'metrics-*', '.ds-logs-*', '.ds-metrics-*'],
    filter_path: ['*.settings.index.default_pipeline', '*.settings.index.final_pipeline'],
    allow_no_indices: true,
    ignore_unavailable: true,
  });

  const pipelineToIndices: Record<string, Set<string>> = {};
  const addPipelineIndex = (pipeline: string | undefined, indexName: string) => {
    if (!pipeline) return;
    if (!pipelineToIndices[pipeline]) pipelineToIndices[pipeline] = new Set();
    pipelineToIndices[pipeline].add(indexName);
  };

  Object.entries(settingsResponse).forEach(([indexName, indexData]) => {
    addPipelineIndex(indexData.settings?.index?.default_pipeline, indexName);
    addPipelineIndex(indexData.settings?.index?.final_pipeline, indexName);
  });

  // Step 2 (serverless): return pipeline list without stats
  if (isServerless) {
    return Object.keys(pipelineToIndices).map((name) => ({
      name,
      indices: Array.from(pipelineToIndices[name]),
      docsCount: 0,
      failedDocsCount: 0,
      statsAvailable: false,
    }));
  }

  // Step 3 (non-serverless): aggregate pipeline stats across all nodes
  const nodesStatsRequest: NodesStatsRequest = {
    metric: 'ingest',
    filter_path: ['nodes.*.ingest.pipelines.*.count', 'nodes.*.ingest.pipelines.*.failed'],
    timeout: '30s',
  };

  const nodesStatsResponse = await esClient.nodes.stats(nodesStatsRequest);
  const pipelineStatsMap: Record<string, { count: number; failed: number }> = {};

  Object.values(nodesStatsResponse.nodes ?? {}).forEach((node) => {
    Object.entries(node.ingest?.pipelines ?? {}).forEach(([name, data]) => {
      if (!pipelineStatsMap[name]) pipelineStatsMap[name] = { count: 0, failed: 0 };
      pipelineStatsMap[name].count += data.count ?? 0;
      pipelineStatsMap[name].failed += data.failed ?? 0;
    });
  });

  return Object.keys(pipelineStatsMap)
    .filter((name) => pipelineStatsMap[name].count > 0)
    .map((name) => ({
      name,
      indices: Array.from(pipelineToIndices[name] ?? []),
      docsCount: pipelineStatsMap[name].count,
      failedDocsCount: pipelineStatsMap[name].failed,
      statsAvailable: true,
    }));
};
