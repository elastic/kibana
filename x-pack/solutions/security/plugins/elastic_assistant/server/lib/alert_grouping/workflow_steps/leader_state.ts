/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { EnrichedAlert } from '../services/hybrid_alert_deduplication';

const DEFAULT_STATE_INDEX = '.kibana-alert-dedup-state';

interface LeaderStateDocument {
  workflow_id: string;
  space_id: string;
  leaders: string;
  last_updated: string;
  total_clusters: number;
  total_llm_calls: number;
  version: number;
}

interface LeaderStateMetrics {
  totalClusters: number;
  totalLlmCalls: number;
}

/**
 * Ensure the leader state index exists with the correct mappings.
 */
export const ensureStateIndex = async (
  esClient: ElasticsearchClient,
  stateIndex: string = DEFAULT_STATE_INDEX,
  logger?: Logger
): Promise<void> => {
  const exists = await esClient.indices.exists({ index: stateIndex });
  if (!exists) {
    try {
      await esClient.indices.create({
        index: stateIndex,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          'index.auto_expand_replicas': '0-1',
        },
        mappings: {
          properties: {
            workflow_id: { type: 'keyword' },
            space_id: { type: 'keyword' },
            leaders: { type: 'text', index: false },
            last_updated: { type: 'date' },
            total_clusters: { type: 'long' },
            total_llm_calls: { type: 'long' },
            version: { type: 'integer' },
          },
        },
      });
    } catch (error: unknown) {
      // Index may have been created by another concurrent execution
      if (
        error instanceof Error &&
        'meta' in error &&
        (error as { meta?: { statusCode?: number } }).meta?.statusCode === 400
      ) {
        logger?.debug(`State index ${stateIndex} already exists`);
      } else {
        throw error;
      }
    }
  }
};

/**
 * Load persisted leader state for a workflow.
 * Returns the serialized leaders JSON string, or null if no state exists.
 */
export const loadLeaderState = async (
  esClient: ElasticsearchClient,
  workflowId: string,
  spaceId: string,
  stateIndex: string = DEFAULT_STATE_INDEX
): Promise<string | null> => {
  try {
    const docId = `${workflowId}_${spaceId}`;
    const response = await esClient.get<LeaderStateDocument>({
      index: stateIndex,
      id: docId,
    });

    return response._source?.leaders ?? null;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'meta' in error &&
      (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
    ) {
      return null;
    }
    throw error;
  }
};

/**
 * Save updated leader state for a workflow.
 */
export const saveLeaderState = async (
  esClient: ElasticsearchClient,
  workflowId: string,
  spaceId: string,
  serializedLeaders: string,
  metrics: LeaderStateMetrics,
  stateIndex: string = DEFAULT_STATE_INDEX
): Promise<void> => {
  const docId = `${workflowId}_${spaceId}`;
  await esClient.index({
    index: stateIndex,
    id: docId,
    document: {
      workflow_id: workflowId,
      space_id: spaceId,
      leaders: serializedLeaders,
      last_updated: new Date().toISOString(),
      total_clusters: metrics.totalClusters,
      total_llm_calls: metrics.totalLlmCalls,
      version: 1,
    },
    refresh: 'wait_for',
  });
};

/**
 * Evict leaders that are too old or exceed the max count.
 * Leaders are expected to have a `@timestamp` or `kibana.alert.start` field.
 */
export const evictStaleLeaders = (
  leaders: EnrichedAlert[],
  maxAgeHours: number,
  maxCount: number
): EnrichedAlert[] => {
  const now = Date.now();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  // Filter by age
  let filtered = leaders.filter((leader) => {
    const timestamp =
      (leader['@timestamp'] as string) ??
      (leader['kibana.alert.start'] as string);
    if (!timestamp) return true; // Keep leaders without timestamps
    const leaderTime = new Date(timestamp).getTime();
    return now - leaderTime < maxAgeMs;
  });

  // Cap by count (keep most recent)
  if (filtered.length > maxCount) {
    filtered.sort((a, b) => {
      const aTime = new Date(
        (a['@timestamp'] as string) ?? (a['kibana.alert.start'] as string) ?? 0
      ).getTime();
      const bTime = new Date(
        (b['@timestamp'] as string) ?? (b['kibana.alert.start'] as string) ?? 0
      ).getTime();
      return bTime - aTime; // Most recent first
    });
    filtered = filtered.slice(0, maxCount);
  }

  return filtered;
};
