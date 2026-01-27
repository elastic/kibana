/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, values, first } from 'lodash';
import * as rt from 'io-ts';
import type {
  MetricsAPIRequest,
  MetricsAPISeries,
  MetricsAPIColumn,
  MetricsAPIRow,
} from '../../../../common/http_api/metrics_api';
import type { Bucket } from '../types';
import {
  BasicMetricValueRT,
  NormalizedMetricValueRT,
  PercentilesTypeRT,
  PercentilesKeyedTypeRT,
  TopMetricsTypeRT,
  MetricValueTypeRT,
  FilterWithNestedAggRT,
} from '../types';

const BASE_COLUMNS = [{ name: 'timestamp', type: 'date' }] as MetricsAPIColumn[];

const ValueObjectTypeRT = rt.union([
  rt.string,
  rt.number,
  MetricValueTypeRT,
  FilterWithNestedAggRT,
]);
type ValueObjectType = rt.TypeOf<typeof ValueObjectTypeRT>;

const getValue = (valueObject: ValueObjectType): number | null | object[] => {
  if (NormalizedMetricValueRT.is(valueObject)) {
    return valueObject.normalized_value || valueObject.value;
  }

  if (PercentilesTypeRT.is(valueObject)) {
    const percentileValues = values(valueObject.values);
    if (percentileValues.length > 1) {
      throw new Error(
        'Metrics API only supports a single percentile, multiple percentiles should be sent separately'
      );
    }
    return first(percentileValues) || null;
  }

  if (PercentilesKeyedTypeRT.is(valueObject)) {
    if (valueObject.values.length > 1) {
      throw new Error(
        'Metrics API only supports a single percentile, multiple percentiles should be sent separately'
      );
    }
    const percentileValue = first(valueObject.values);
    return (percentileValue && percentileValue.value) || null;
  }

  if (BasicMetricValueRT.is(valueObject)) {
    return valueObject.value;
  }

  if (TopMetricsTypeRT.is(valueObject)) {
    return valueObject.top.map((res) => res.metrics);
  }

  // Handle filter aggregation wrapping another aggregation (e.g., filter + top_metrics)
  if (FilterWithNestedAggRT.is(valueObject)) {
    const nestedKey = Object.keys(valueObject).find((k) => k !== 'doc_count' && k !== 'meta');
    if (nestedKey) {
      const nestedValue = (valueObject as Record<string, unknown>)[nestedKey];
      if (MetricValueTypeRT.is(nestedValue) || FilterWithNestedAggRT.is(nestedValue)) {
        return getValue(nestedValue as ValueObjectType);
      }
    }
  }

  return null;
};

const dropOutOfBoundsBuckets =
  (from: number, to: number, bucketSizeInMillis: number) => (row: MetricsAPIRow) =>
    row.timestamp >= from && row.timestamp + bucketSizeInMillis <= to;

// Extract first numeric value from top_metrics result for non-metadata fields
const extractFirstNumericValue = (metricsArray: object[]): number | null => {
  const firstItem = first(metricsArray);
  if (!firstItem) return null;
  const firstValue = first(values(firstItem));
  return typeof firstValue === 'number' ? firstValue : null;
};

// Metadata key that should keep full top_metrics array
const META_KEY = '__metadata__';

export const convertBucketsToRows = (
  options: MetricsAPIRequest,
  buckets: Bucket[]
): MetricsAPIRow[] => {
  return buckets.map((bucket) => {
    const ids = options.metrics.map((metric) => metric.id);
    const metrics = ids.reduce((acc, id) => {
      const valueObject = get(bucket, [id]);
      const value = ValueObjectTypeRT.is(valueObject) ? getValue(valueObject) : null;
      // For non-metadata fields, extract numeric value from top_metrics array
      acc[id] = Array.isArray(value) && id !== META_KEY ? extractFirstNumericValue(value) : value;
      return acc;
    }, {} as Record<string, number | null | object[]>);

    return { timestamp: bucket.key as number, ...metrics };
  });
};

export const convertBucketsToMetricsApiSeries = (
  keys: string[],
  options: MetricsAPIRequest,
  buckets: Bucket[],
  bucketSizeInMillis: number
): MetricsAPISeries => {
  const id = keys.join(':');
  // If there are no metrics then we just return the empty series
  // but still maintain the groupings.
  if (options.metrics.length === 0) {
    return { id, keys, columns: [], rows: [] };
  }
  const columns = options.metrics.map((metric) => ({
    name: metric.id,
    type: 'number',
  })) as MetricsAPIColumn[];
  const allRows = convertBucketsToRows(options, buckets);

  const rows =
    options.dropPartialBuckets && options.includeTimeseries
      ? allRows.filter(
          dropOutOfBoundsBuckets(options.timerange.from, options.timerange.to, bucketSizeInMillis)
        )
      : allRows;

  return {
    id,
    keys,
    rows,
    columns: [...BASE_COLUMNS, ...columns],
  };
};
