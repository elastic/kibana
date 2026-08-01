/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CorrelatedEntityType } from '../build_entity_candidates_query';
import { CORRELATED_ENTITY_TYPES, getEuidAggName } from '../build_entity_candidates_query';

/**
 * One EUID candidate derived from the alerts behind a discovery: the EUID
 * terms-bucket key, the entity type it was derived for, and the `_source` of
 * the bucket's `top_hits` sample document.
 */
export interface EntityCandidate {
  entityType: CorrelatedEntityType;
  euid: string;
  sampleSource: Record<string, unknown>;
}

interface TermsBucketWithTopHits {
  key: string;
  doc_count: number;
  sample?: {
    hits: {
      hits: Array<{ _source?: Record<string, unknown> }>;
    };
  };
}

interface TermsAggregation {
  buckets?: TermsBucketWithTopHits[];
}

/**
 * Parses the aggregations of a `buildEntityCandidatesQuery` response into a
 * flat list of entity candidates.
 */
export const extractEntityCandidates = (
  aggregations: Record<string, unknown> | undefined
): EntityCandidate[] => {
  if (aggregations == null) {
    return [];
  }

  return CORRELATED_ENTITY_TYPES.flatMap((entityType) => {
    const aggregation = aggregations[getEuidAggName(entityType)] as TermsAggregation | undefined;
    const buckets = aggregation?.buckets;

    if (!Array.isArray(buckets)) {
      return [];
    }

    return buckets.flatMap((bucket) => {
      if (typeof bucket.key !== 'string' || bucket.key.length === 0) {
        return [];
      }

      const sampleSource = bucket.sample?.hits?.hits?.[0]?._source;

      return [
        {
          entityType,
          euid: bucket.key,
          sampleSource:
            sampleSource != null && typeof sampleSource === 'object' && !Array.isArray(sampleSource)
              ? sampleSource
              : {},
        },
      ];
    });
  });
};
