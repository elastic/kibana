/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { InventoryItemType, InventoryModel } from '../types';
import type {
  AggregationConfig,
  InventoryMetricsConfig,
  LensFormulaConfig,
  LensMetricChartConfig,
  MetricConfigMap,
} from './metrics/types';

export function createInventoryModel<
  TType extends InventoryItemType,
  TMetrics extends InventoryMetricsConfig<any, any, any>
>(id: TType, config: Omit<InventoryModel<TType, TMetrics>, 'id'>): InventoryModel<TType, TMetrics> {
  return { id, ...config };
}
export function createInventoryModelMetrics<
  TAggeggations extends MetricConfigMap<AggregationConfig> = MetricConfigMap<AggregationConfig>,
  TFormulas extends MetricConfigMap<LensFormulaConfig> | undefined = undefined,
  TCharts extends LensMetricChartConfig | undefined = undefined
>(
  config: InventoryMetricsConfig<TAggeggations, TFormulas, TCharts>
): InventoryMetricsConfig<TAggeggations, TFormulas, TCharts> {
  return config;
}
