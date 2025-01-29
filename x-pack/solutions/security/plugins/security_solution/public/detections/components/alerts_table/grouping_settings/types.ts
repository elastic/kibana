/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericBuckets } from '@kbn/grouping/src';
// Elasticsearch returns `null` when a sub-aggregation cannot be computed
type NumberOrNull = number | null;
export interface AlertsGroupingAggregation {
  unitsCount?: {
    value?: NumberOrNull;
  };
  description?: {
    buckets?: GenericBuckets[];
  };
  severitiesSubAggregation?: {
    buckets?: GenericBuckets[];
  };
  countSeveritySubAggregation?: {
    value?: NumberOrNull;
  };
  usersCountAggregation?: {
    value?: NumberOrNull;
  };
  hostsCountAggregation?: {
    value?: NumberOrNull;
  };
  ipsCountAggregation?: {
    value?: NumberOrNull;
  };
  rulesCountAggregation?: {
    value?: NumberOrNull;
  };
  ruleTags?: {
    doc_count_error_upper_bound?: number;
    sum_other_doc_count?: number;
    buckets?: GenericBuckets[];
  };
  stackByMultipleFields1?: {
    buckets?: GenericBuckets[];
    doc_count_error_upper_bound?: number;
    sum_other_doc_count?: number;
  };
}
