/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, has } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import type { MetricsUIAggregation } from '@kbn/metrics-data-access-plugin/common';
import {
  isBasicMetricAgg,
  isDerivativeAgg,
  isSumBucketAgg,
  isTermsWithAggregation,
  isFilterWithAggregations,
} from '@kbn/metrics-data-access-plugin/common';
import type { SnapshotCustomMetricInput } from '../../../../../common/http_api';

export interface InterfaceRateConfig {
  field: string;
  interfaceField: string;
  filter?: estypes.QueryDslQueryContainer;
}

export const isMetricRate = (metric: MetricsUIAggregation | undefined): boolean => {
  if (!metric) {
    return false;
  }
  const values = Object.values(metric);
  return (
    values.some((agg) => isDerivativeAgg(agg)) &&
    values.some((agg) => isBasicMetricAgg(agg) && has(agg, 'max'))
  );
};

export const isCustomMetricRate = (customMetric: SnapshotCustomMetricInput) => {
  return customMetric.aggregation === 'rate';
};

const hasInterfaceRatePattern = (aggs: Record<string, unknown>): boolean => {
  const aggValues = Object.values(aggs);
  return (
    aggValues.some((agg) => isTermsWithAggregation(agg)) &&
    aggValues.some((agg) => isSumBucketAgg(agg))
  );
};

export const isInterfaceRateAgg = (metric: MetricsUIAggregation | undefined) => {
  if (!metric) {
    return false;
  }

  // Check for direct interface rate pattern (terms + sum_bucket at top level)
  if (hasInterfaceRatePattern(metric)) {
    return true;
  }

  // Check for filter-wrapped interface rate pattern
  return isFilteredInterfaceRateAgg(metric);
};

export const isFilteredInterfaceRateAgg = (metric: MetricsUIAggregation | undefined) => {
  if (!metric) {
    return false;
  }
  const values = Object.values(metric);

  // Check for filter-wrapped interface rate pattern (filter with nested terms + sum_bucket)
  return values.some((agg) => {
    if (isFilterWithAggregations(agg)) {
      const nestedAggs = agg.aggs as Record<string, unknown>;
      return hasInterfaceRatePattern(nestedAggs);
    }
    return false;
  });
};

export const getInterfaceRateFields = (
  metric: MetricsUIAggregation | undefined,
  metricId: string
): InterfaceRateConfig | null => {
  if (!metric) {
    return null;
  }

  if (isFilteredInterfaceRateAgg(metric)) {
    const basePath = `${metricId}_dimension.aggs.${metricId}_interfaces`;
    const field = get(metric, `${basePath}.aggregations.${metricId}_interface_max.max.field`) as
      | string
      | undefined;
    const interfaceField = get(metric, `${basePath}.terms.field`) as string | undefined;
    if (!field || !interfaceField) {
      return null;
    }
    return {
      field,
      interfaceField,
      filter: get(metric, `${metricId}_dimension.filter`) as estypes.QueryDslQueryContainer,
    };
  }

  if (hasInterfaceRatePattern(metric)) {
    const basePath = `${metricId}_interfaces`;
    const field = get(metric, `${basePath}.aggregations.${metricId}_interface_max.max.field`) as
      | string
      | undefined;
    const interfaceField = get(metric, `${basePath}.terms.field`) as string | undefined;
    if (!field || !interfaceField) {
      return null;
    }
    return { field, interfaceField };
  }

  return null;
};

export const isRate = (
  metric: MetricsUIAggregation | undefined,
  customMetric?: SnapshotCustomMetricInput
) => {
  return (
    isMetricRate(metric) ||
    isInterfaceRateAgg(metric) ||
    (customMetric && isCustomMetricRate(customMetric))
  );
};
