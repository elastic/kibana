/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ProcessedAlertTracker } from '../types';

const TRACKER_INDEX_PREFIX = '.security-ad-processed-alerts';

const getTrackerIndexName = (spaceId: string): string => `${TRACKER_INDEX_PREFIX}-${spaceId}`;

const TRACKER_MAPPINGS = {
  properties: {
    case_id: { type: 'keyword' as const },
    processed_alert_ids: { type: 'keyword' as const },
    last_processed_at: { type: 'date' as const },
    generation_uuids: { type: 'keyword' as const },
  },
};

export const ensureTrackerIndex = async ({
  esClient,
  spaceId,
  logger,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  logger: Logger;
}): Promise<void> => {
  const indexName = getTrackerIndexName(spaceId);
  try {
    const exists = await esClient.indices.exists({ index: indexName });
    if (!exists) {
      await esClient.indices.create({
        index: indexName,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          hidden: true,
        },
        mappings: TRACKER_MAPPINGS,
      });
      logger.info(`Created processed alert tracker index: ${indexName}`);
    }
  } catch (error) {
    if ((error as { meta?: { statusCode?: number } }).meta?.statusCode !== 400) {
      throw error;
    }
  }
};

export const getProcessedAlertIds = async ({
  esClient,
  spaceId,
  caseId,
  logger,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  caseId: string;
  logger: Logger;
}): Promise<ProcessedAlertTracker | null> => {
  const indexName = getTrackerIndexName(spaceId);
  try {
    const result = await esClient.search({
      index: indexName,
      query: { term: { case_id: caseId } },
      size: 1,
      sort: [{ last_processed_at: { order: 'desc' as const } }],
    });

    const hit = result.hits.hits[0];
    if (!hit?._source) return null;

    const source = hit._source as Record<string, unknown>;
    return {
      caseId: source.case_id as string,
      processedAlertIds: (source.processed_alert_ids ?? []) as string[],
      lastProcessedAt: source.last_processed_at as string,
      generationUuids: (source.generation_uuids ?? []) as string[],
    };
  } catch (error) {
    logger.warn(`Failed to get processed alert IDs for case ${caseId}: ${error}`);
    return null;
  }
};

export const updateProcessedAlertIds = async ({
  esClient,
  spaceId,
  caseId,
  newAlertIds,
  generationUuid,
  logger,
}: {
  esClient: ElasticsearchClient;
  spaceId: string;
  caseId: string;
  newAlertIds: string[];
  generationUuid: string;
  logger: Logger;
}): Promise<void> => {
  const indexName = getTrackerIndexName(spaceId);
  const existing = await getProcessedAlertIds({ esClient, spaceId, caseId, logger });

  const allAlertIds = [...new Set([...(existing?.processedAlertIds ?? []), ...newAlertIds])];
  const allGenerationUuids = [...new Set([...(existing?.generationUuids ?? []), generationUuid])];

  await esClient.index({
    index: indexName,
    id: `tracker-${caseId}`,
    document: {
      case_id: caseId,
      processed_alert_ids: allAlertIds,
      last_processed_at: new Date().toISOString(),
      generation_uuids: allGenerationUuids,
    },
    refresh: 'wait_for',
  });

  logger.debug(
    () =>
      `Updated processed alert tracker for case ${caseId}: ${allAlertIds.length} total alert IDs (${newAlertIds.length} new)`
  );
};

export const computeDeltaAlertIds = ({
  allCaseAlertIds,
  tracker,
}: {
  allCaseAlertIds: string[];
  tracker: ProcessedAlertTracker | null;
}): string[] => {
  if (!tracker) return allCaseAlertIds;

  const processedSet = new Set(tracker.processedAlertIds);
  return allCaseAlertIds.filter((id) => !processedSet.has(id));
};
