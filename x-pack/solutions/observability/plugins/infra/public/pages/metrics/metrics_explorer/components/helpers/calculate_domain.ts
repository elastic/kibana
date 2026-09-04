/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { min, max, sum, isNumber } from 'lodash';
import type { MetricsExplorerSeries } from '../../../../../../common/http_api/metrics_explorer';
import {
  MetricsExplorerYAxisMode,
  type MetricsExplorerOptionsMetric,
} from '../../../../../../common/metrics_explorer_views';
import { getMetricId } from './get_metric_id';

interface Domain {
  min: number;
  max: number;
}

const getMin = (values: number[]) => {
  const minValue = min(values);
  return isNumber(minValue) && Number.isFinite(minValue) ? minValue : undefined;
};

const getMax = (values: number[]) => {
  const maxValue = max(values);
  return isNumber(maxValue) && Number.isFinite(maxValue) ? maxValue : undefined;
};

export const calculateDomain = (
  series: MetricsExplorerSeries,
  metrics: MetricsExplorerOptionsMetric[],
  stacked = false
): Domain => {
  const values = series.rows.flatMap((row) => {
    const rowValues = metrics
      .map((metric, index) => row[getMetricId(metric, index)])
      .filter((value): value is number => isNumber(value) && Number.isFinite(value));

    if (rowValues.length === 0) {
      return [];
    }

    // For stacked domains we want to add 10% head room so the charts have
    // enough room to draw the 2 pixel line as well.
    return [getMin(rowValues), stacked ? sum(rowValues) * 1.1 : getMax(rowValues)].filter(
      (value): value is number => value !== undefined
    );
  });
  const minValue = getMin(values) ?? 0;
  const maxValue = getMax(values) ?? 0;

  return {
    min: minValue,
    max: maxValue,
  };
};

export const applyHeadroomToDomain = (
  domain: Domain,
  headroom: { min?: number; max?: number } = { max: 1.1 }
): Domain => {
  const minValue = domain.min * (headroom.min ?? 1);
  const maxValue = domain.max * (headroom.max ?? 1);
  return {
    min: Math.min(minValue, maxValue),
    max: Math.max(minValue, maxValue),
  };
};

export const applyYAxisModeToDomain = (
  dataDomain: Domain,
  yAxisMode: MetricsExplorerYAxisMode
): Domain => {
  if (yAxisMode !== MetricsExplorerYAxisMode.fromZero) {
    return dataDomain;
  }

  return {
    min: Math.min(0, dataDomain.min),
    max: Math.max(0, dataDomain.max),
  };
};
