/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicMetric, DynamicMetricAgg } from '@kbn/entity-store/common';
import type { QueryEngine, UnsupportedMetric } from '../../../../common';
import type { QueryPlan } from '../types';

const COUNT_AGGS: ReadonlySet<DynamicMetricAgg> = new Set(['count', 'count_distinct']);
const RATE_AGGS: ReadonlySet<DynamicMetricAgg> = new Set([
  'sum_rate',
  'max_rate',
  'avg_rate',
  'min_rate',
]);

/** Whether `agg` is a count-style aggregate (no scale/offset; presence uses count fields). */
export const isCountMetricAgg = (agg: DynamicMetricAgg): boolean => COUNT_AGGS.has(agg);

/** Whether `agg` is a counter rate (supported under `TS` only). */
export const isRateMetricAgg = (agg: DynamicMetricAgg): boolean => RATE_AGGS.has(agg);

/** Whether `engine` can compute this metric aggregate (`FROM` cannot compute rates). */
export const canEngineComputeMetricAgg = (engine: QueryEngine, agg: DynamicMetricAgg): boolean =>
  !(engine === 'FROM' && isRateMetricAgg(agg));

/** Metrics that `engine` cannot compute (rates under `FROM`). */
export const listMetricsUnsupportedOnEngine = (
  metrics: readonly DynamicMetric[],
  engine: QueryEngine
): DynamicMetric[] => metrics.filter(({ agg }) => !canEngineComputeMetricAgg(engine, agg));

/**
 * Metrics this plan's engine cannot compute, as `UnsupportedMetric` for `_list` / `_plan`
 * (`indexPattern`, `engine`, `column`, `field`, `agg`).
 */
export const listSkippedMetricsOnPlan = (
  plan: Pick<QueryPlan, 'indexPattern' | 'engine' | 'metrics'>
): UnsupportedMetric[] =>
  listMetricsUnsupportedOnEngine(plan.metrics, plan.engine).map(({ name, field, agg }) => ({
    indexPattern: plan.indexPattern,
    engine: plan.engine,
    column: name,
    field,
    agg,
  }));

/** ES|QL over-time form used under `TS`: `AGG(AGG_OVER_TIME(field))`. */
export const overTimeInnerAgg = (agg: 'AVG' | 'MIN' | 'MAX' | 'SUM', field: string): string =>
  `${agg}(${agg}_OVER_TIME(${field}))`;
