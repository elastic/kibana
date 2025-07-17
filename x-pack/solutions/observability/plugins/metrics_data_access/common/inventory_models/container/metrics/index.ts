/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInventoryModelMetrics } from '../../shared/create_inventory_model';

export const metrics = createInventoryModelMetrics({
  getAggregation: async (aggregation) =>
    await import('./snapshot').then(({ snapshot }) => snapshot[aggregation]),
  getAggregations: async () => await import('./snapshot').then(({ snapshot }) => snapshot),
  getFormulas: async () => await import('./formulas').then(({ formulas }) => formulas),
  getCharts: async () => await import('./charts').then(({ charts }) => charts),
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
});
