/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { EntityAnalyticsRoutesDeps } from '../types';

// ── case_count enrichment ─────────────────────────────────────────────────────

// cases-attachments SO type has `attachmentId: keyword` mapping. The scoped SO client
// handles namespace isolation automatically, so one aggregation replaces N individual lookups.

interface CaseTermsBucket {
  key: string;
  doc_count: number;
}

interface CaseAggs {
  by_entity: { buckets: CaseTermsBucket[] };
}

/** Returns case counts keyed by entity ID for the given page of entity IDs (one SO query). */
export const batchCaseCounts = async (
  soClient: ISavedObjectsRepository,
  entityIds: readonly string[],
  logger: EntityAnalyticsRoutesDeps['logger']
): Promise<Map<string, number>> => {
  if (entityIds.length === 0) return new Map();
  try {
    // KQL: attribute path uses `.attributes.` prefix; ES aggregation uses the raw field path.
    // Filter to `security.entity` type only — alert attachments also use `attachmentId` (as arrays).
    const idFilter = entityIds
      .map((id) => `cases-attachments.attributes.attachmentId: "${id.replace(/"/g, '\\"')}"`)
      .join(' OR ');
    const filter = `cases-attachments.attributes.type: "security.entity" AND (${idFilter})`;
    const result = await soClient.find<unknown, CaseAggs>({
      type: 'cases-attachments',
      perPage: 1,
      filter,
      aggs: {
        by_entity: {
          terms: { field: 'cases-attachments.attributes.attachmentId', size: entityIds.length },
        },
      },
    });
    const counts = new Map<string, number>();
    for (const b of result.aggregations?.by_entity?.buckets ?? []) {
      counts.set(b.key, b.doc_count);
    }
    return counts;
  } catch (e) {
    logger.error(`batchCaseCounts: ${e}`);
    return new Map();
  }
};
