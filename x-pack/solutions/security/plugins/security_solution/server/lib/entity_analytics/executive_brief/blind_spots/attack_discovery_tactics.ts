/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsStringTermsBucketKeys } from '@elastic/elasticsearch/lib/api/types';
import type { SnapshotContext } from '../snapshot/context';
import { AD_TACTICS_FIELD, MAX_TACTIC_BUCKETS, getAttackDiscoveryIndices } from './constants';
import type { TacticLookup } from './mitre_tactics';

export interface AttackDiscoveryTactics {
  /** False when neither AD index exists (source is reported as missing_index). */
  indexExists: boolean;
  /** Attack discoveries per tactic id. */
  byTactic: Map<string, number>;
}

interface AdTacticsAggs {
  tactics?: { buckets: AggregationsStringTermsBucketKeys[] };
}

/** Aliases v18 / v19 names to ids and merges buckets that resolve to the same tactic. */
export const reduceAttackDiscoveryTactics = (
  buckets: readonly AggregationsStringTermsBucketKeys[],
  lookup: TacticLookup
): Map<string, number> => {
  const byTactic = new Map<string, number>();
  for (const bucket of buckets) {
    const tacticId = lookup.resolveId(String(bucket.key));
    if (tacticId) {
      byTactic.set(tacticId, (byTactic.get(tacticId) ?? 0) + bucket.doc_count);
    }
  }
  return byTactic;
};

export const fetchAttackDiscoveryTactics = async (
  ctx: SnapshotContext,
  lookup: TacticLookup
): Promise<AttackDiscoveryTactics> => {
  const response = await ctx.esClient.search<unknown, AdTacticsAggs>(
    {
      index: getAttackDiscoveryIndices(ctx.spaceId),
      size: 0,
      ignore_unavailable: true,
      allow_no_indices: true,
      query: {
        bool: {
          filter: [{ range: { '@timestamp': { gte: ctx.timeRange.from, lte: ctx.timeRange.to } } }],
        },
      },
      aggs: { tactics: { terms: { field: AD_TACTICS_FIELD, size: MAX_TACTIC_BUCKETS } } },
    },
    { signal: ctx.abortSignal }
  );
  // No matching index means zero shards were searched.
  const indexExists = (response._shards?.total ?? 0) > 0;
  return {
    indexExists,
    byTactic: reduceAttackDiscoveryTactics(response.aggregations?.tactics?.buckets ?? [], lookup),
  };
};
