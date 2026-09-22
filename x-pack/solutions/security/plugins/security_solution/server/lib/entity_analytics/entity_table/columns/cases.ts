/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type {
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
} from '@elastic/elasticsearch/lib/api/types';
import { ENTITY_ID_FIELD } from '../common';
import type { Row } from '../common';

const CASE_COUNT_FIELD = 'case_count';

interface CaseAggs {
  by_entity: AggregationsStringTermsAggregate;
}

/** Returns case counts keyed by entity ID for the given page of entity IDs */
const batchCaseCounts = async (
  logger: Logger,
  soClient: ISavedObjectsRepository,
  entityIds: readonly string[]
): Promise<Map<string, number>> => {
  if (entityIds.length === 0) return new Map();

  try {
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
    const buckets = (result.aggregations?.by_entity?.buckets ??
      []) as AggregationsStringTermsBucket[];

    for (const b of buckets) {
      counts.set(b.key as string, b.doc_count);
    }

    return counts;
  } catch (e) {
    logger.error(`batchCaseCounts: ${e}`);
    return new Map();
  }
};

// ── enrichment ────────────────────────────────────────────────────────────────

/** Populates case_count for a page of entity rows. */
export const enrichCaseCounts = async (
  logger: Logger,
  pageRows: Row[],
  soClient: ISavedObjectsRepository
): Promise<void> => {
  const counts = await batchCaseCounts(
    logger,
    soClient,
    pageRows.map((r) => r[ENTITY_ID_FIELD] as string).filter(Boolean)
  );

  for (const row of pageRows) {
    row[CASE_COUNT_FIELD] = counts.get(row[ENTITY_ID_FIELD] as string) ?? 0;
  }
};
