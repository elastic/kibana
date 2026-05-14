/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { RELATIONSHIP_HISTORY_INDEX } from './relationship_history_index';

/** Shape of each raw event written to the index (append-only). */
interface RelationshipHistoryEvent {
  entity_id: string;
  rel_type: string;
  target_euid: string;
  seen: string;
}

/** Aggregated summary returned by the API — first/last seen derived at query time. */
export interface RelationshipHistorySummary {
  entity_id: string;
  rel_type: string;
  target_euid: string;
  first_seen: string;
  last_seen: string;
  seen_count: number;
}

export interface AppendBatch {
  entityId: string;
  relType: string;
  euids: string[];
  seen: string;
}

export class RelationshipHistoryClient {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly logger: Logger
  ) {}

  /** Appends one event per entity×rel_type×EUID for this scan. */
  async appendBatch(batches: AppendBatch[]): Promise<void> {
    if (batches.length === 0) return;

    const operations = batches.flatMap(({ entityId, relType, euids, seen }) =>
      euids.flatMap((targetEuid) => [
        { index: { _index: RELATIONSHIP_HISTORY_INDEX } },
        { entity_id: entityId, rel_type: relType, target_euid: targetEuid, seen } satisfies RelationshipHistoryEvent,
      ])
    );

    try {
      const result = await this.esClient.bulk({ operations, refresh: true });
      if (result.errors) {
        const errors = result.items.filter((item) => item.index?.error);
        this.logger.warn(`[POC B] ${errors.length} bulk errors appending relationship history`);
      }
    } catch (err) {
      this.logger.error(`[POC B] Failed to append relationship history: ${err}`);
    }
  }

  /**
   * Aggregates raw events for an entity and returns one summary per
   * rel_type×target_euid with first_seen (MIN) and last_seen (MAX).
   */
  async getHistoryForEntity(entityId: string): Promise<RelationshipHistorySummary[]> {
    const result = await this.esClient.search({
      index: RELATIONSHIP_HISTORY_INDEX,
      size: 0,
      query: { term: { entity_id: entityId } },
      aggs: {
        by_rel_type: {
          terms: { field: 'rel_type', size: 20 },
          aggs: {
            by_target: {
              terms: { field: 'target_euid', size: 200 },
              aggs: {
                first_seen: { min: { field: 'seen' } },
                last_seen: { max: { field: 'seen' } },
              },
            },
          },
        },
      },
    });

    const summaries: RelationshipHistorySummary[] = [];
    const byRelType = (result.aggregations?.by_rel_type as any)?.buckets ?? [];

    for (const relTypeBucket of byRelType) {
      const relType: string = relTypeBucket.key;
      const byTarget = relTypeBucket.by_target?.buckets ?? [];

      for (const targetBucket of byTarget) {
        summaries.push({
          entity_id: entityId,
          rel_type: relType,
          target_euid: targetBucket.key,
          first_seen: targetBucket.first_seen.value_as_string ?? targetBucket.first_seen.value,
          last_seen: targetBucket.last_seen.value_as_string ?? targetBucket.last_seen.value,
          seen_count: targetBucket.doc_count,
        });
      }
    }

    return summaries;
  }
}
