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
import { createInventoryModelMetrics } from '../../../shared/create_inventory_model';
import { getAggregation } from '../../../shared/metrics/resolve_schema_metrics';

export const metrics = createInventoryModelMetrics({
  tsvb: {
    podOverview,
    podCpuUsage,
    podLogUsage,
    podNetworkTraffic,
    podMemoryUsage,
  },
  getAggregation: async (aggregation) => {
    return import('./snapshot').then(({ snapshot }) => {
      const a = getAggregation(snapshot)(aggregation);
      return a;
    });
  },
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
});
