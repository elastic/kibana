/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SchemaBasedFormula } from '../../../../shared/metrics/types';

export const nodeCpuCapacity: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.capacity', {
    defaultMessage: 'Capacity',
  }),
  value: {
    ecs: 'max(kubernetes.node.cpu.allocatable.cores) * 1000000000',
    semconv: 'max(metrics.k8s.node.cpu.allocatable)',
  },
  format: 'number',
  decimals: 1,
  compactValues: true,
};

export const nodeCpuUsed: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.used', {
    defaultMessage: 'Used',
  }),
  value: {
    ecs: 'average(kubernetes.node.cpu.usage.nanocores)',
    semconv: 'average(metrics.k8s.node.cpu.usage)',
  },
  format: 'number',
  decimals: 1,
  compactValues: true,
};
