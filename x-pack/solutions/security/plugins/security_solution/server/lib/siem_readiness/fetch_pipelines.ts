/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { NodesStatsRequest } from '@elastic/elasticsearch/lib/api/types';
import type { PipelineStats } from '@kbn/siem-readiness-common';
import { fetchPipelineVolumeStats } from './fetch_index_volume';

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

  // Normalise pipelineToIndices values to plain string arrays for the volume fetch
  const pipelineToIndicesArray: Record<string, string[]> = Object.fromEntries(
    Object.entries(pipelineToIndices).map(([k, v]) => [k, Array.from(v)])
  );

  // Step 2 (serverless): return pipeline list with volume stats only (no node ingest stats)
  if (isServerless) {
    const volumeStats = await fetchPipelineVolumeStats(esClient, pipelineToIndicesArray);
    return Object.keys(pipelineToIndices).map((name) => ({
      name,
      indices: pipelineToIndicesArray[name],
      docsCount: 0,
      failedDocsCount: 0,
      statsAvailable: false,
      volume: volumeStats[name] ?? null,
    }));
  }

  // Step 3 (non-serverless): aggregate pipeline stats across all nodes + volume
  const nodesStatsRequest: NodesStatsRequest = {
    metric: 'ingest',
    filter_path: ['nodes.*.ingest.pipelines.*.count', 'nodes.*.ingest.pipelines.*.failed'],
    timeout: '30s',
  };

  const [nodesStatsResponse, volumeStats] = await Promise.all([
    esClient.nodes.stats(nodesStatsRequest),
    fetchPipelineVolumeStats(esClient, pipelineToIndicesArray),
  ]);

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
      indices: pipelineToIndicesArray[name] ?? [],
      docsCount: pipelineStatsMap[name].count,
      failedDocsCount: pipelineStatsMap[name].failed,
      statsAvailable: true,
      volume: volumeStats[name] ?? null,
    }));
};
