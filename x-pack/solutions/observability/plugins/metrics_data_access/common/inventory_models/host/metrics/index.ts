/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createInventoryModelMetrics } from '../../shared/create_inventory_model';
import { getAggregation } from '../../shared/metrics/resolve_schema_metrics';

export const metrics = createInventoryModelMetrics({
  getAggregation: async (aggregation) =>
    await import('./snapshot').then(({ snapshot }) => getAggregation(snapshot, aggregation)),
  getFormulas: async () => await import('./formulas').then(({ formulas }) => formulas),
  getCharts: async () => await import('./charts').then(({ charts }) => charts),
  defaultSnapshot: 'cpuV2',
  defaultTimeRangeInSeconds: 3600, // 1 hour
});
