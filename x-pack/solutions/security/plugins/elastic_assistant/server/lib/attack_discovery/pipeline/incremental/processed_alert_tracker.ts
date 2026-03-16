/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ProcessedAlertTracker } from '../types';

const TRACKER_INDEX_PREFIX = '.security-ad-processed-alerts';

const SAFE_SPACE_ID = /^[a-z0-9_-]{1,100}$/i;

const getTrackerIndexName = (spaceId: string): string => {
  if (!SAFE_SPACE_ID.test(spaceId)) {
    throw new Error(`Invalid spaceId for tracker index name: ${spaceId}`);
  }
  return `${TRACKER_INDEX_PREFIX}-${spaceId}`;
};

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
          auto_expand_replicas: '0-1',
          hidden: true,
        },
        mappings: TRACKER_MAPPINGS,
      });
      logger.info(`Created processed alert tracker index: ${indexName}`);
    }
  } catch (error) {
    const meta = (error as { meta?: { statusCode?: number; body?: { error?: { type?: string } } } })
      .meta;
    const isAlreadyExists =
      meta?.statusCode === 400 && meta?.body?.error?.type === 'resource_already_exists_exception';
    if (!isAlreadyExists) {
      throw error;
    }
    logger.debug(`Tracker index ${indexName} already exists (concurrent creation)`);
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
      seq_no_primary_term: true,
    });

    const hit = result.hits.hits[0];
    if (!hit?._source) return null;

    const source = hit._source as Record<string, unknown>;
    const caseIdValue = source.case_id;
    const processedIds = source.processed_alert_ids;
    const lastProcessed = source.last_processed_at;
    const genUuids = source.generation_uuids;

    if (typeof caseIdValue !== 'string' || typeof lastProcessed !== 'string') {
      logger.warn(`Invalid tracker document structure for case ${caseId}, treating as empty`);
      return null;
    }

    return {
      caseId: caseIdValue,
      processedAlertIds: Array.isArray(processedIds) ? (processedIds as string[]) : [],
      lastProcessedAt: lastProcessed,
      generationUuids: Array.isArray(genUuids) ? (genUuids as string[]) : [],
      seqNo: hit._seq_no,
      primaryTerm: hit._primary_term,
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
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const existing = await getProcessedAlertIds({ esClient, spaceId, caseId, logger });

    const MAX_TRACKED_ALERTS = 10000;
    const mergedAlertIds = [...new Set([...(existing?.processedAlertIds ?? []), ...newAlertIds])];
    const allAlertIds =
      mergedAlertIds.length > MAX_TRACKED_ALERTS
        ? mergedAlertIds.slice(-MAX_TRACKED_ALERTS)
        : mergedAlertIds;
    const allGenerationUuids = [...new Set([...(existing?.generationUuids ?? []), generationUuid])];

    const baseParams = {
      index: indexName,
      id: `tracker-${caseId}`,
      document: {
        case_id: caseId,
        processed_alert_ids: allAlertIds,
        last_processed_at: new Date().toISOString(),
        generation_uuids: allGenerationUuids,
      },
      refresh: 'wait_for' as const,
    };

    const indexParams =
      existing?.seqNo != null && existing.primaryTerm != null
        ? { ...baseParams, if_seq_no: existing.seqNo, if_primary_term: existing.primaryTerm }
        : baseParams;

    try {
      await esClient.index(indexParams);
      logger.debug(
        () =>
          `Updated processed alert tracker for case ${caseId}: ${allAlertIds.length} total alert IDs (${newAlertIds.length} new)`
      );
      return;
    } catch (error) {
      const statusCode = (error as { meta?: { statusCode?: number } }).meta?.statusCode;
      if (statusCode === 409 && attempt < maxRetries - 1) {
        logger.warn(
          `Version conflict updating tracker for case ${caseId}, retrying (attempt ${
            attempt + 1
          }/${maxRetries})`
        );
      } else {
        throw error;
      }
    }
  }
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
