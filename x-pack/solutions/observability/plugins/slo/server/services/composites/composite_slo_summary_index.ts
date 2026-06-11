/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { CompositeSLOMemberWithSummary, CompositeSLOSummary } from '@kbn/slo-schema';
import { storedCompositeSloSummarySchema } from '@kbn/slo-schema';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../common/constants';

export interface PersistedCompositeSummary {
  summary: CompositeSLOSummary;
  members?: CompositeSLOMemberWithSummary[];
}

export function buildCompositeSloSummaryDocId(spaceId: string, compositeId: string): string {
  return `${spaceId}:${compositeId}`;
}

/**
 * Member summaries used to be persisted with an `id` field; they now use `sloId` to mirror the
 * definition member shape. Normalise legacy docs so they keep decoding until the background task
 * rewrites them.
 */
function normalizeLegacyMemberIds(source: unknown): unknown {
  if (typeof source !== 'object' || source === null || !('members' in source)) {
    return source;
  }
  const { members } = source as { members?: unknown };
  if (!Array.isArray(members)) {
    return source;
  }
  const normalizedMembers = members.map((member) => {
    if (typeof member !== 'object' || member === null) {
      return member;
    }
    const { id, sloId, ...rest } = member as Record<string, unknown>;
    return { ...rest, sloId: sloId ?? id };
  });
  return { ...source, members: normalizedMembers };
}

export function mapCompositeSummaryIndexSource(
  source: unknown
): PersistedCompositeSummary | undefined {
  const decoded = storedCompositeSloSummarySchema.safeParse(normalizeLegacyMemberIds(source));
  if (!decoded.success) {
    return undefined;
  }
  const f = decoded.data;
  return {
    summary: {
      sliValue: f.sliValue,
      status: f.status,
      errorBudget: {
        initial: f.errorBudgetInitial,
        consumed: f.errorBudgetConsumed,
        remaining: f.errorBudgetRemaining,
        isEstimated: f.errorBudgetIsEstimated,
      },
      fiveMinuteBurnRate: f.fiveMinuteBurnRate,
      oneHourBurnRate: f.oneHourBurnRate,
      oneDayBurnRate: f.oneDayBurnRate,
    },
    members: f.members,
  };
}

export async function fetchCompositeSloSummariesFromIndex(
  esClient: ElasticsearchClient,
  spaceId: string,
  compositeIds: readonly string[]
): Promise<Map<string, PersistedCompositeSummary>> {
  const result = new Map<string, PersistedCompositeSummary>();
  if (compositeIds.length === 0) {
    return result;
  }

  const docIds = compositeIds.map((id) => buildCompositeSloSummaryDocId(spaceId, id));

  const response = await esClient.search({
    index: COMPOSITE_SUMMARY_INDEX_NAME,
    size: compositeIds.length,
    query: {
      bool: {
        filter: [{ ids: { values: docIds } }, { term: { spaceId } }],
      },
    },
  });

  const docIdToCompositeId = new Map(docIds.map((docId, i) => [docId, compositeIds[i]]));

  for (const hit of response.hits.hits) {
    if (!hit._source || !hit._id) continue;
    const compositeId = docIdToCompositeId.get(hit._id);
    if (!compositeId) continue;
    const persisted = mapCompositeSummaryIndexSource(hit._source);
    if (persisted) {
      result.set(compositeId, persisted);
    }
  }

  return result;
}
