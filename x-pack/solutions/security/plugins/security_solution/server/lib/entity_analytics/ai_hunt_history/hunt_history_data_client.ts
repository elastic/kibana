/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';

import {
  getAiHuntHistoryIndexName,
  MAX_HUNT_HISTORY_RESULTS,
} from '../../../../common/entity_analytics/ai_hunt_history/constants';
import type {
  CreateHuntRequest,
  HuntListItem,
  HuntRecord,
  HuntSummary,
  PatchHuntRequest,
} from '../../../../common/entity_analytics/ai_hunt_history/types';
import { createHuntHistoryIndexService } from './indices/hunt_history_index_service';

export interface HuntHistoryDataClientDeps {
  readonly esClient: ElasticsearchClient;
  readonly logger: Logger;
  readonly spaceId: string;
}

export interface HuntHistoryDataClient {
  createHunt(params: CreateHuntRequest, createdBy: string): Promise<string>;
  listHunts(size?: number): Promise<{ hunts: HuntListItem[]; total: number }>;
  getHunt(id: string): Promise<HuntRecord | undefined>;
  patchHunt(id: string, updates: PatchHuntRequest): Promise<HuntRecord | undefined>;
  deleteHunt(id: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// ES error classification
// ---------------------------------------------------------------------------

const getEsErrorType = (e: unknown): string | undefined =>
  (e as { meta?: { body?: { error?: { type?: string } } } })?.meta?.body?.error?.type;

const isEsIndexNotFoundException = (e: unknown): boolean =>
  getEsErrorType(e) === 'index_not_found_exception';

// ---------------------------------------------------------------------------
// camelCase (API) <-> snake_case (index) transforms.
//
// Mappings are the source of truth and use snake_case; the API/common types
// use camelCase. The heavy `result` payload is stored verbatim (its shape is
// owned by the client canvas and indexing is disabled for it).
// ---------------------------------------------------------------------------

interface EsHuntSummary {
  verdict: string;
  severity?: HuntSummary['severity'];
  confidence?: number;
  finding_count: number;
  entity_count: number;
  alert_count: number;
}

interface EsHuntDoc {
  id: string;
  space: string;
  question: string;
  scoped_prompt?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  name?: string;
  pinned: boolean;
  status: HuntRecord['status'];
  summary: EsHuntSummary;
  result: HuntRecord['result'];
}

const summaryToEs = (summary: HuntSummary): EsHuntSummary => ({
  verdict: summary.verdict,
  severity: summary.severity,
  confidence: summary.confidence,
  finding_count: summary.findingCount,
  entity_count: summary.entityCount,
  alert_count: summary.alertCount,
});

const esToSummary = (summary: EsHuntSummary | undefined): HuntSummary => ({
  verdict: summary?.verdict ?? '',
  severity: summary?.severity,
  confidence: summary?.confidence,
  findingCount: summary?.finding_count ?? 0,
  entityCount: summary?.entity_count ?? 0,
  alertCount: summary?.alert_count ?? 0,
});

const esDocToRecord = (doc: EsHuntDoc): HuntRecord => ({
  id: doc.id,
  space: doc.space,
  question: doc.question,
  scopedPrompt: doc.scoped_prompt,
  createdAt: doc.created_at,
  updatedAt: doc.updated_at,
  createdBy: doc.created_by,
  name: doc.name,
  pinned: doc.pinned ?? false,
  status: doc.status ?? 'complete',
  summary: esToSummary(doc.summary),
  result: doc.result ?? { content: '', artifacts: [], activities: [] },
});

const esDocToListItem = (doc: Omit<EsHuntDoc, 'result' | 'space'>): HuntListItem => ({
  id: doc.id,
  question: doc.question,
  scopedPrompt: doc.scoped_prompt,
  createdAt: doc.created_at,
  updatedAt: doc.updated_at,
  createdBy: doc.created_by,
  name: doc.name,
  pinned: doc.pinned ?? false,
  status: doc.status ?? 'complete',
  summary: esToSummary(doc.summary),
});

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createHuntHistoryDataClient = ({
  esClient,
  logger,
  spaceId,
}: HuntHistoryDataClientDeps): HuntHistoryDataClient => {
  const indexName = getAiHuntHistoryIndexName(spaceId);
  const indexService = createHuntHistoryIndexService({ esClient, logger, spaceId });

  const createHunt = async (params: CreateHuntRequest, createdBy: string): Promise<string> => {
    await indexService.createIndexIfMissing();

    const id = uuidv4();
    const now = new Date().toISOString();
    const doc: EsHuntDoc = {
      id,
      space: spaceId,
      question: params.question,
      scoped_prompt: params.scopedPrompt,
      created_at: now,
      updated_at: now,
      created_by: createdBy,
      name: params.name,
      pinned: false,
      status: params.status ?? 'complete',
      summary: summaryToEs(params.summary),
      result: params.result,
    };

    await esClient.index({ index: indexName, id, document: doc, refresh: 'wait_for' });
    logger.debug(`[AiHuntHistory] Saved hunt ${id} in space "${spaceId}"`);
    return id;
  };

  const listHunts = async (
    size: number = MAX_HUNT_HISTORY_RESULTS
  ): Promise<{ hunts: HuntListItem[]; total: number }> => {
    const boundedSize = Math.min(Math.max(size, 1), MAX_HUNT_HISTORY_RESULTS);
    try {
      const resp = await esClient.search<Omit<EsHuntDoc, 'result'>>({
        index: indexName,
        size: boundedSize,
        track_total_hits: true,
        // Pinned first, then most recent. Secondary tiebreaks keep ordering stable.
        sort: [
          { pinned: { order: 'desc' as estypes.SortOrder } },
          { updated_at: { order: 'desc' as estypes.SortOrder } },
          { created_at: { order: 'desc' as estypes.SortOrder } },
        ],
        _source_excludes: ['result'],
        ignore_unavailable: true,
      });

      const total =
        typeof resp.hits.total === 'number' ? resp.hits.total : resp.hits.total?.value ?? 0;
      const hunts = resp.hits.hits
        .map((hit) => hit._source)
        .filter((doc): doc is Omit<EsHuntDoc, 'result'> => doc != null)
        .map(esDocToListItem);

      return { hunts, total };
    } catch (e) {
      if (isEsIndexNotFoundException(e)) {
        logger.debug(`[AiHuntHistory] History index not created yet for space "${spaceId}"`);
        return { hunts: [], total: 0 };
      }
      throw e;
    }
  };

  const getHunt = async (id: string): Promise<HuntRecord | undefined> => {
    try {
      const resp = await esClient.get<EsHuntDoc>({ index: indexName, id });
      return resp._source ? esDocToRecord(resp._source) : undefined;
    } catch (e) {
      if (isEsIndexNotFoundException(e) || getEsErrorType(e) === undefined) {
        // A 404 from `get` surfaces as a statusCode without an ES error type.
        const statusCode = (e as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || isEsIndexNotFoundException(e)) return undefined;
      }
      throw e;
    }
  };

  const patchHunt = async (
    id: string,
    updates: PatchHuntRequest
  ): Promise<HuntRecord | undefined> => {
    const existing = await getHunt(id);
    if (!existing) return undefined;

    const doc: Partial<EsHuntDoc> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) {
      // `null` clears the name; a string sets it.
      doc.name = updates.name === null ? undefined : updates.name;
    }
    if (updates.pinned !== undefined) {
      doc.pinned = updates.pinned;
    }

    await esClient.update({
      index: indexName,
      id,
      doc,
      refresh: 'wait_for',
    });

    return getHunt(id);
  };

  const deleteHunt = async (id: string): Promise<boolean> => {
    try {
      const resp = await esClient.delete({ index: indexName, id, refresh: 'wait_for' });
      return resp.result === 'deleted';
    } catch (e) {
      const statusCode = (e as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || isEsIndexNotFoundException(e)) return false;
      throw e;
    }
  };

  return { createHunt, listHunts, getHunt, patchHunt, deleteHunt };
};
