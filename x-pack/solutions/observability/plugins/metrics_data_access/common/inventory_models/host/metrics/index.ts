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

const legacyMetrics: Array<keyof HostAggregations> = ['cpu', 'tx', 'rx'];
const loadFormulas = () => import('./formulas').then((m) => m.formulas);

export const metrics: InventoryMetricsConfig<HostAggregations, HostFormulas, HostCharts> = {
  legacyMetrics,
  getAggregations: async (args) => {
    const { snapshot } = await import('./snapshot');
    const catalog = new MetricsCatalog(snapshot, args?.schema, {
      includeLegacyMetrics: (args?.schema ?? 'ecs') === 'ecs',
      legacyMetrics,
    });
    return catalog;
  },
  getFormulas: async (args) => {
    const formulas = await loadFormulas();
    const catalog = new MetricsCatalog(formulas, args?.schema);
    return catalog;
  },
  getCharts: async (args) => {
    const formulas = await loadFormulas();
    const { initCharts } = await import('./charts');
    const formulasCatalog = new MetricsCatalog(formulas, args?.schema);

    return initCharts(formulasCatalog);
  },
  getWaffleMapTooltipMetrics: (args) => {
    if (args?.schema === 'semconv') {
      return ['cpuV2', 'memory', 'txV2', 'rxV2'];
    }

    return ['cpuV2', 'memory', 'txV2', 'rxV2', ...legacyMetrics];
  },
  defaultSnapshot: 'cpuV2',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
