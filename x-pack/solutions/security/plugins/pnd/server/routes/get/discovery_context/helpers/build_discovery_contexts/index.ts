/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndDiscoveryContext, PndDiscoveryContextEntity } from '@kbn/pnd-common';

import { PND_DISCOVERY_CONTEXT_ENTITY_FIELDS } from '../build_discovery_context_query';

/** One term of an entity field's sub-aggregation. */
export interface PndDiscoveryContextTermsBucket {
  doc_count: number;
  key: string;
}

/**
 * One discovery's bucket of the `filters` aggregation: a terms sub-aggregation per entity field,
 * plus the max risk score. Every sub-aggregation is optional because a response that lost one must
 * degrade to a smaller blast radius rather than throw.
 */
export interface PndDiscoveryContextBucket {
  destination_ip?: { buckets: PndDiscoveryContextTermsBucket[] };
  doc_count: number;
  host_name?: { buckets: PndDiscoveryContextTermsBucket[] };
  max_risk_score?: { value: number | null };
  source_ip?: { buckets: PndDiscoveryContextTermsBucket[] };
  user_name?: { buckets: PndDiscoveryContextTermsBucket[] };
}

export interface BuildDiscoveryContextsParams {
  /** The `by_discovery` buckets, keyed on Attack Discovery id as the query named them. */
  buckets: Record<string, PndDiscoveryContextBucket>;
}

/**
 * Highest count first, then field and value ascending. The tie-break is not cosmetic: the chips
 * render in the order they arrive, and equal counts are the common case for a small discovery, so
 * without it the blast radius would reshuffle between two reads of the same data.
 */
const byCountThenName = (a: PndDiscoveryContextEntity, b: PndDiscoveryContextEntity): number =>
  b.count - a.count || a.field.localeCompare(b.field) || a.value.localeCompare(b.value);

const toEntities = (bucket: PndDiscoveryContextBucket): PndDiscoveryContextEntity[] =>
  PND_DISCOVERY_CONTEXT_ENTITY_FIELDS.flatMap(({ aggName, field }) =>
    (bucket[aggName]?.buckets ?? []).map(({ doc_count: count, key: value }) => ({
      count,
      field,
      value,
    }))
  ).sort(byCountThenName);

/**
 * Project the aggregation onto the `PndDiscoveryContext` contract.
 *
 * Two absences are deliberately different. A discovery whose alerts matched nothing — because they
 * were deleted, or because the caller cannot read them — yields **no entry**, since an entry
 * asserting an empty blast radius and no score would be a claim the data does not support. A
 * discovery that matched alerts but has no `max_risk_score` yields an entry with no `riskScore`
 * key, never a zero: the badge must be able to tell "no score is possible" from "the score is
 * zero".
 */
export const buildDiscoveryContexts = ({
  buckets,
}: BuildDiscoveryContextsParams): PndDiscoveryContext[] =>
  Object.entries(buckets).flatMap(([correlationId, bucket]) => {
    if (bucket.doc_count === 0) {
      return [];
    }

    const riskScore = bucket.max_risk_score?.value;

    return [
      {
        correlationId,
        entities: toEntities(bucket),
        ...(riskScore != null ? { riskScore } : {}),
      },
    ];
  });
