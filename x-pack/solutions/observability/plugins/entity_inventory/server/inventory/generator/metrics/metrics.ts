/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicMetric, DynamicMetricAgg } from '@kbn/entity-store/common';
import type { QueryEngine } from '../../../../common';
import { quoteIdentifier } from '../esql_syntax';
import { canonicalizeEsqlFilter } from '../filters';
import { canEngineComputeMetricAgg, isCountMetricAgg, overTimeInnerAgg } from './utils';

const TIMESTAMP = quoteIdentifier('@timestamp');

/** Plan-group key for metrics that declare no filter (and for a source with no metrics). */
const NO_METRIC_FILTER = '';

/** Metrics that share one list-query plan: same canonical metric filter (empty = unfiltered). */
export type MetricFilterPlanGroup = {
  /** Canonical metric filter text, or empty when the group is unfiltered. */
  canonicalMetricFilter: string;
  metrics: DynamicMetric[];
};

/**
 * Groups a source's metrics into list-query plan groups: unfiltered metrics first (when any),
 * then each distinct canonical metric filter in first-appearance order. A source with no metrics
 * yields one empty unfiltered group. A source whose every metric has a filter has no unfiltered
 * group.
 */
export const groupSourceMetricsByFilterForPlans = (
  metrics: readonly DynamicMetric[],
  indexPattern: string
): MetricFilterPlanGroup[] => {
  if (metrics.length === 0) {
    return [{ canonicalMetricFilter: NO_METRIC_FILTER, metrics: [] }];
  }

  const metricsByCanonicalFilter = new Map<string, DynamicMetric[]>();
  const filterAppearanceOrder: string[] = [];
  metrics.forEach((metric) => {
    const canonicalMetricFilter =
      metric.filter === undefined
        ? NO_METRIC_FILTER
        : canonicalizeEsqlFilter(
            metric.filter,
            `filter of metric "${metric.name}" on ${indexPattern}`
          );
    const metricsInGroup = metricsByCanonicalFilter.get(canonicalMetricFilter);
    if (metricsInGroup === undefined) {
      metricsByCanonicalFilter.set(canonicalMetricFilter, [metric]);
      filterAppearanceOrder.push(canonicalMetricFilter);
    } else {
      metricsInGroup.push(metric);
    }
  });

  const orderedFilters = filterAppearanceOrder.includes(NO_METRIC_FILTER)
    ? [NO_METRIC_FILTER, ...filterAppearanceOrder.filter((key) => key !== NO_METRIC_FILTER)]
    : filterAppearanceOrder;

  return orderedFilters.map((canonicalMetricFilter) => ({
    canonicalMetricFilter,
    metrics: metricsByCanonicalFilter.get(canonicalMetricFilter) ?? [],
  }));
};

/**
 * Combines a source's filter with a metric-filter plan group into the plan's WHERE filter.
 * Undefined when neither side has a filter.
 */
export const combineSourceFilterWithMetricFilter = (
  sourceFilter: string | undefined,
  canonicalMetricFilter: string
): string | undefined => {
  if (sourceFilter === undefined && canonicalMetricFilter === NO_METRIC_FILTER) {
    return undefined;
  }
  if (sourceFilter === undefined) {
    return canonicalMetricFilter;
  }
  if (canonicalMetricFilter === NO_METRIC_FILTER) {
    return sourceFilter;
  }
  return `(${sourceFilter}) AND (${canonicalMetricFilter})`;
};

/**
 * Builds the STATS aggregation for one metric under `engine`, or undefined when the engine cannot
 * compute it (rates on `FROM`).
 */
export const buildMetricStatsAgg = (
  columnName: string,
  field: string,
  agg: DynamicMetricAgg,
  engine: QueryEngine
): string | undefined => {
  if (!canEngineComputeMetricAgg(engine, agg)) {
    return undefined;
  }
  const quotedName = quoteIdentifier(columnName);
  const quotedField = quoteIdentifier(field);
  switch (agg) {
    case 'last':
      return `${quotedName} = LAST(${quotedField}, ${TIMESTAMP}) WHERE ${quotedField} IS NOT NULL`;
    case 'avg':
      return engine === 'TS'
        ? `${quotedName} = ${overTimeInnerAgg('AVG', quotedField)}`
        : `${quotedName} = AVG(${quotedField})`;
    case 'min':
      return engine === 'TS'
        ? `${quotedName} = ${overTimeInnerAgg('MIN', quotedField)}`
        : `${quotedName} = MIN(${quotedField})`;
    case 'max':
      return engine === 'TS'
        ? `${quotedName} = ${overTimeInnerAgg('MAX', quotedField)}`
        : `${quotedName} = MAX(${quotedField})`;
    case 'sum':
      return engine === 'TS'
        ? `${quotedName} = ${overTimeInnerAgg('SUM', quotedField)}`
        : `${quotedName} = SUM(${quotedField})`;
    case 'count':
      return engine === 'TS'
        ? `${quotedName} = SUM(COUNT_OVER_TIME(${quotedField}))`
        : `${quotedName} = COUNT(${quotedField})`;
    case 'count_distinct':
      return `${quotedName} = COUNT_DISTINCT(${quotedField})`;
    case 'sum_rate':
      return `${quotedName} = SUM(RATE(${quotedField}))`;
    case 'max_rate':
      return `${quotedName} = MAX(RATE(${quotedField}))`;
    case 'avg_rate':
      return `${quotedName} = AVG(RATE(${quotedField}))`;
    case 'min_rate':
      return `${quotedName} = MIN(RATE(${quotedField}))`;
  }
};

/**
 * Builds the WHERE predicate that requires metric fields to be present on the plan's documents:
 * OR of `field IS NOT NULL` over value-metric fields (including rates), or over count fields when
 * the plan is counts-only. Undefined when the plan has no metrics.
 */
export const buildMetricPresenceWherePredicate = (
  metrics: readonly DynamicMetric[]
): string | undefined => {
  if (metrics.length === 0) {
    return undefined;
  }
  const valueMetricFields = metrics
    .filter(({ agg }) => !isCountMetricAgg(agg))
    .map(({ field }) => field);
  const fieldsForPresence =
    valueMetricFields.length > 0 ? valueMetricFields : metrics.map(({ field }) => field);
  const uniqueFields = [...new Set(fieldsForPresence)];
  const fieldIsNotNullPredicates = uniqueFields.map(
    (field) => `${quoteIdentifier(field)} IS NOT NULL`
  );
  return fieldIsNotNullPredicates.length === 1
    ? fieldIsNotNullPredicates[0]
    : `(${fieldIsNotNullPredicates.join(' OR ')})`;
};

/**
 * Builds the post-STATS EVAL that applies scale/offset to a metric column, or undefined when
 * neither is set. Form: `m = m * scale + offset` with omitted factors dropped.
 */
export const buildMetricScaleOffsetEval = (
  columnName: string,
  scale: number | undefined,
  offset: number | undefined
): string | undefined => {
  if (scale === undefined && offset === undefined) {
    return undefined;
  }
  const quotedColumn = quoteIdentifier(columnName);
  if (scale !== undefined && offset !== undefined) {
    return `${quotedColumn} = ${quotedColumn} * ${scale} + ${offset}`;
  }
  if (scale !== undefined) {
    return `${quotedColumn} = ${quotedColumn} * ${scale}`;
  }
  return `${quotedColumn} = ${quotedColumn} + ${offset}`;
};
