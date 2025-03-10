/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { createHash } from 'crypto';
import { v5 as uuidv5 } from 'uuid';

import type { AlertWithCommonFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import type { BaseFieldsLatest } from '../../../../../common/api/detection_engine/model/alerts';
import type {
  ThresholdNormalized,
  ThresholdWithCardinality,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleRangeTuple, SignalSearchResponse } from '../types';
import type {
  ThresholdSignalHistory,
  ThresholdAlertState,
  ThresholdSingleBucketAggregationResult,
  ThresholdMultiBucketAggregationResult,
} from './types';

/**
 * Returns a new signal history based on what the previous
 * threshold rule state had stored and what the current rule
 * run tuple timestamp is.
 *
 * This is used to determine which terms buckets over
 * which periods of time are to be used in the search after
 *
 * @param state ThresholdAlertState
 * @param signalHistory ThresholdSignalHistory
 * @param tuple RuleRangeTuple
 * @returns ThresholdSignalHistory
 */
export const getSignalHistory = (
  state: ThresholdAlertState,
  signalHistory: ThresholdSignalHistory,
  tuple: RuleRangeTuple
): ThresholdSignalHistory => {
  if (state.initialized) {
    return Object.entries(signalHistory).reduce((acc, [hash, entry]) => {
      if (entry.lastSignalTimestamp > tuple.from.valueOf()) {
        acc[hash] = entry;
        return acc;
      } else {
        return acc;
      }
    }, {} as ThresholdSignalHistory);
  }
  return signalHistory;
};

export const shouldFilterByCardinality = (
  threshold: ThresholdNormalized
): threshold is ThresholdWithCardinality => !!threshold.cardinality?.length;

export const calculateThresholdSignalUuid = (
  ruleId: string,
  startedAt: Date,
  thresholdFields: string[],
  key?: string
): string => {
  // used to generate stable Threshold Signals ID when run with the same params
  const NAMESPACE_ID = '0684ec03-7201-4ee0-8ee0-3a3f6b2479b2';

  const startedAtString = startedAt.toISOString();
  const keyString = key ?? '';
  const baseString = `${ruleId}${startedAtString}${thresholdFields.join(',')}${keyString}`;

  return uuidv5(baseString, NAMESPACE_ID);
};

export const getThresholdTermsHash = (
  terms: Array<{
    field: string;
    value: string;
  }>
): string => {
  return createHash('sha256')
    .update(
      terms
        .sort((term1, term2) => (term1.field > term2.field ? 1 : -1))
        .map((term) => {
          return `${term.field}:${term.value}`;
        })
        .join(',')
    )
    .digest('hex');
};

export const searchResultHasAggs = <
  T extends ThresholdSingleBucketAggregationResult | ThresholdMultiBucketAggregationResult
>(
  obj: SignalSearchResponse<Record<estypes.AggregateName, estypes.AggregationsAggregate>>
): obj is T => obj?.aggregations != null;

/**
 * transforms documents returned from bulk creation into Hit formatting
 * basically, moving all fields(apart from _id & _index) from root node to _source property
 * { _id: 1, _index: "logs", field1, field2 } => { _id: 1, _index: "logs", _source: { field1, field2 } }
 */
export const transformBulkCreatedItemsToHits = <T extends BaseFieldsLatest>(
  items: Array<AlertWithCommonFieldsLatest<T> & { _id: string; _index: string }>
) =>
  items.map((alert) => {
    const { _id, _index, ...source } = alert;
    return {
      _id,
      _index,
      _source: {
        ...source,
      },
    };
  });
