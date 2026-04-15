/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { CompositeSLOSummary } from '@kbn/slo-schema';
import { compositeSloSummaryIndexSummaryFieldsSchema } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/Either';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../common/constants';

export function buildCompositeSloSummaryDocId(spaceId: string, compositeId: string): string {
  return `${spaceId}:${compositeId}`;
}

export function mapCompositeSummaryIndexSourceToSummary(
  source: unknown
): CompositeSLOSummary | undefined {
  const decoded = compositeSloSummaryIndexSummaryFieldsSchema.decode(source);
  if (isLeft(decoded)) {
    return undefined;
  }
  const f = decoded.right;
  return {
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
  };
}

export async function fetchCompositeSloSummariesFromIndex(
  esClient: ElasticsearchClient,
  spaceId: string,
  compositeIds: readonly string[]
): Promise<Map<string, CompositeSLOSummary>> {
  const result = new Map<string, CompositeSLOSummary>();
  if (compositeIds.length === 0) {
    return result;
  }

  const ids = compositeIds.map((id) => buildCompositeSloSummaryDocId(spaceId, id));

  const response = await esClient.mget({
    index: COMPOSITE_SUMMARY_INDEX_NAME,
    ids,
  });

  if (response.docs.length !== ids.length) {
    throw new Error(
      `composite summary mget: expected ${ids.length} docs, got ${response.docs.length}`
    );
  }

  for (let i = 0; i < compositeIds.length; i++) {
    const compositeId = compositeIds[i];
    const doc = response.docs[i];
    if ('found' in doc && doc.found && doc._source) {
      const summary = mapCompositeSummaryIndexSourceToSummary(doc._source);
      if (summary) {
        result.set(compositeId, summary);
      }
    }
  }

  return result;
}
