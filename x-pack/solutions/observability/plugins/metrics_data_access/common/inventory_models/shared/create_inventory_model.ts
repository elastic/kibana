/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  InventoryItemType,
  InventoryMetrics,
  InventoryModel,
  LensMetricChartMap,
  LensMetricFormulaMap,
  MetricAggregationMap,
} from '../types';

export function createInventoryModel<
  TType extends InventoryItemType,
  TMetrics extends InventoryMetrics
>(id: TType, config: Omit<InventoryModel<TType, TMetrics>, 'id'>): InventoryModel<TType, TMetrics> {
  return { id, ...config };
}
export function createInventoryModelMetrics<
  TAggregations extends MetricAggregationMap = MetricAggregationMap,
  TFormulas extends LensMetricFormulaMap | undefined = undefined,
  TCharts extends LensMetricChartMap | undefined = undefined
>(
  input: InventoryMetrics<TAggregations, TFormulas, TCharts>
): InventoryMetrics<TAggregations, TFormulas, TCharts> {
  return input;
}
