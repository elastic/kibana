/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericBuckets } from '../../../../../../common/search_strategy/common';

export type RawBucket = GenericBuckets & {
  maxRiskSubAggregation?: {
    value?: number | null; // Elasticsearch returns `null` when a sub-aggregation cannot be computed
  };
  stackByField1?: {
    buckets?: GenericBuckets[];
    doc_count_error_upper_bound?: number;
    sum_other_doc_count?: number;
  };
};

/** Defines the shape of the aggregation returned by Elasticsearch to visualize the treemap */
export interface AlertsTreeMapAggregation {
  stackByField0?: {
    buckets?: RawBucket[];
  };
}

export type FlattenedBucket = Pick<
  RawBucket,
  'doc_count' | 'key' | 'key_as_string' | 'maxRiskSubAggregation'
> & {
  stackByField1Key?: string;
  stackByField1DocCount?: number;
};
