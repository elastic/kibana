/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SchemaBasedFormula } from '../../../../shared/metrics/types';

export const podMemoryUsage: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.memoryUsage', {
    defaultMessage: 'Memory Usage',
  }),
  value: {
    ecs: 'average(kubernetes.pod.memory.usage.limit.pct)',
    semconv: 'average(metrics.k8s.pod.memory_limit_utilization)',
  },
  format: 'percent',
  decimals: 1,
};
