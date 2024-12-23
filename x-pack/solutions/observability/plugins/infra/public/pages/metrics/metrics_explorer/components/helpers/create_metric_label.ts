/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsExplorerOptionsMetric } from '../../hooks/use_metrics_explorer_options';

export const createMetricLabel = (metric: MetricsExplorerOptionsMetric) => {
  if (metric.label) {
    return metric.label;
  }
  return `${metric.aggregation}(${metric.field || ''})`;
};
