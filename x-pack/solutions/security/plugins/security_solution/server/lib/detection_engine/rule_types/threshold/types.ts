/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsCardinalityAggregate,
  AggregationsCompositeBucketKeys,
  AggregationsMaxAggregate,
  AggregationsMinAggregate,
} from '@elastic/elasticsearch/lib/api/types';
import type { ESSearchResponse } from '@kbn/es-types';
import type { RuleTypeState } from '@kbn/alerting-plugin/server';
import type { SignalSource } from '../types';
import type { SearchTypes } from '../../../../../common/detection_engine/types';
import type {
  buildThresholdMultiBucketAggregation,
  buildThresholdSingleBucketAggregation,
} from './build_threshold_aggregation';

export interface ThresholdLeafAggregates {
  max_timestamp: AggregationsMaxAggregate;
  min_timestamp: AggregationsMinAggregate;
  cardinality_count?: AggregationsCardinalityAggregate;
}

export type ThresholdMultiBucketAggregationResult = ESSearchResponse<
  SignalSource,
  {
    aggregations: ReturnType<typeof buildThresholdMultiBucketAggregation>;
  }
>;

export type ThresholdSingleBucketAggregationResult = ESSearchResponse<
  SignalSource,
  {
    aggregations: ReturnType<typeof buildThresholdSingleBucketAggregation>;
  }
>;

export type ThresholdCompositeBucket = AggregationsCompositeBucketKeys & ThresholdLeafAggregates;

export interface ThresholdResult {
  terms?: Array<{
    field: string;
    value: string;
  }>;
  cardinality?: Array<{
    field: string;
    value: number;
  }>;
  count: number;
  from: string;
}

export interface ThresholdSignalHistoryRecord {
  terms: Array<{
    field?: string;
    value: SearchTypes;
  }>;
  lastSignalTimestamp: number;
}

export interface ThresholdSignalHistory {
  [hash: string]: ThresholdSignalHistoryRecord;
}

export interface ThresholdAlertState extends RuleTypeState {
  initialized: boolean;
  signalHistory: ThresholdSignalHistory;
}
