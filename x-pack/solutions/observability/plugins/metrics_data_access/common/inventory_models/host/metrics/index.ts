/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MetricsCatalog } from '../../shared/metrics/metrics_catalog';
import type { HostAggregations } from './snapshot';
import type { HostFormulas } from './formulas';
import type { HostCharts } from './charts';
import type { InventoryMetricsConfig } from '../../shared/metrics/types';

export const metrics: InventoryMetricsConfig<HostAggregations, HostFormulas, HostCharts> = {
  getAggregations: async (args) => {
    const { snapshot } = await import('./snapshot');
    const catalog = new MetricsCatalog(snapshot, args?.schema);
    return catalog;
  },
  getFormulas: async (args) => {
    const { formulas } = await import('./formulas');
    const catalog = new MetricsCatalog(formulas, args?.schema);
    return catalog;
  },
  getCharts: async () => {
    const { charts } = await import('./charts');
    return charts;
  },
  defaultSnapshot: 'cpuV2',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
