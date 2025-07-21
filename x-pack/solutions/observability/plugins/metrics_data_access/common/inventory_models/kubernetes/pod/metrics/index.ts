/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { podOverview } from './tsvb/pod_overview';
import { podCpuUsage } from './tsvb/pod_cpu_usage';
import { podLogUsage } from './tsvb/pod_log_usage';
import { podMemoryUsage } from './tsvb/pod_memory_usage';
import { podNetworkTraffic } from './tsvb/pod_network_traffic';
import { MetricsCatalog } from '../../../shared/metrics/metrics_catalog';
import type { PodAggregations } from './snapshot';
import type { InventoryMetricsConfig } from '../../../shared/metrics/types';

export const metrics: InventoryMetricsConfig<PodAggregations> = {
  tsvb: {
    podOverview,
    podCpuUsage,
    podLogUsage,
    podNetworkTraffic,
    podMemoryUsage,
  },
  getAggregations: async (args) => {
    const { snapshot } = await import('./snapshot');
    const catalog = new MetricsCatalog(snapshot);
    return catalog;
  },
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
