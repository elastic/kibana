/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A `terms` or `multi_terms` aggregate as Elasticsearch returns it, around the given buckets. */
export const termsAggregate = <TBucket>(buckets: TBucket[], sumOtherDocCount = 0) => {
  return { doc_count_error_upper_bound: 0, sum_other_doc_count: sumOtherDocCount, buckets };
};

/** Buckets of a `terms` aggregation without sub-aggregations, one document each. */
export const keyBuckets = (keys: string[]) => {
  return keys.map((key) => {
    return { key, doc_count: 1 };
  });
};

/** A `top_hits` aggregate with one hit per given `fields`. */
export const topHitsAggregate = (hitFields: Array<Record<string, unknown[]>>) => {
  return {
    hits: {
      total: { value: hitFields.length, relation: 'eq' as const },
      max_score: null,
      hits: hitFields.map((fields, index) => {
        return { _index: 'logs', _id: String(index), _source: undefined, fields };
      }),
    },
  };
};

/** The `byEnvironment` aggregates of a search that found no environment. */
export const NO_ENVIRONMENTS = {
  environments: termsAggregate([]),
  environmentNames: termsAggregate([]),
  environmentNotDefined: { doc_count: 0 },
};
