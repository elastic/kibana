/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregators } from '../../../common/custom_threshold_rule/types';
import { GenericMetric } from './rule_condition_chart';

export interface LensOperation {
  operation: string;
  operationWithField: string;
  sourceField: string;
}

export const getLensOperationFromRuleMetric = (metric: GenericMetric): LensOperation => {
  const { aggType, field, filter = '' } = metric;
  let operation: string = aggType;
  const operationArgs: string[] = [];
  const escapedFilter = filter.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  if (aggType === Aggregators.RATE) {
    return {
      operation: 'counter_rate',
      operationWithField: `counter_rate(max("${field}"), kql='${escapedFilter}')`,
      sourceField: `"${field}"` || '',
    };
  }

  if (aggType === Aggregators.AVERAGE) operation = 'average';
  if (aggType === Aggregators.CARDINALITY) operation = 'unique_count';
  if (aggType === Aggregators.P95 || aggType === Aggregators.P99) operation = 'percentile';
  if (aggType === Aggregators.COUNT) operation = 'count';

  if (field) {
    operationArgs.push(`"${field}"`);
  }

  if (aggType === Aggregators.P95) {
    operationArgs.push('percentile=95');
  }

  if (aggType === Aggregators.P99) {
    operationArgs.push('percentile=99');
  }

  if (escapedFilter) operationArgs.push(`kql='${escapedFilter}'`);
  return {
    operation,
    operationWithField: `${operation}(${operationArgs.join(', ')})`,
    sourceField: `"${field}"` || '',
  };
};

export const getBufferThreshold = (threshold?: number): string =>
  (Math.ceil((threshold || 0) * 1.1 * 100) / 100).toFixed(2).toString();

export const LensFieldFormat = {
  NUMBER: 'number',
  PERCENT: 'percent',
  BITS: 'bits',
} as const;

export const lensFieldFormatter = (
  metrics: GenericMetric[]
): (typeof LensFieldFormat)[keyof typeof LensFieldFormat] => {
  if (metrics.length < 1 || !metrics[0].field) return LensFieldFormat.NUMBER;
  const firstMetricField = metrics[0].field;
  if (firstMetricField.endsWith('.pct')) return LensFieldFormat.PERCENT;
  if (firstMetricField.endsWith('.bytes')) return LensFieldFormat.BITS;
  return LensFieldFormat.NUMBER;
};

export const isRate = (metrics: GenericMetric[]): boolean =>
  Boolean(metrics.length > 0 && metrics[0].aggType === Aggregators.RATE);
