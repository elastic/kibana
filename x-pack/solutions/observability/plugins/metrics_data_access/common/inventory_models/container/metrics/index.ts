/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsCatalog } from '../../shared/metrics/metrics_catalog';
import type { InventoryMetricsConfig } from '../../shared/metrics/types';
import type { ContainerCharts } from './charts';
import type { ContainerFormulas } from './formulas';
import type { ContainerAggregations } from './snapshot';

export const metrics: InventoryMetricsConfig<
  ContainerAggregations,
  ContainerFormulas,
  ContainerCharts
> = {
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
  getCharts: async () => import('./charts').then(({ charts }) => charts),
  getWaffleMapTooltipMetrics: () => ['cpu', 'memory', 'rx', 'tx'],
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
