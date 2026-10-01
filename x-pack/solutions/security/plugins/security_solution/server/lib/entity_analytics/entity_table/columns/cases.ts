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
interface CaseAggs {
  by_entity: AggregationsStringTermsAggregate;
}

/** Returns case counts keyed by entity ID for the given entity IDs. */
export const batchCaseCounts = async (
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
