/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SchemaBasedFormula } from '../../../../shared/metrics/types';

export const podCpuUsage: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.cpuUsage', {
    defaultMessage: 'CPU Usage',
  }),
  value: {
    ecs: 'average(kubernetes.pod.cpu.usage.limit.pct)',
    semconv: 'average(metrics.k8s.pod.cpu_limit_utilization)',
  },
  format: 'percent',
  decimals: 1,
};
