/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { BucketItem } from '../../../../../common/search_strategy/security_solution/cti';

export type GroupBySelection = 'host.name' | 'user.name' | 'source.ip' | 'destination.ip';
export interface AlertsByGroupingAgg {
  alertsByGrouping: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: BucketItem[];
  };
  missingFields: {
    doc_count: number;
  };
}
export interface AlertsProgressBarData {
  key: string;
  value: number;
  percentage: number;
  percentageLabel: string;
  label: string;
}
