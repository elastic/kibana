/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SchemaBasedFormula } from '../../../../shared/metrics/types';

export const nodeMemoryCapacity: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.capacity', {
    defaultMessage: 'Capacity',
  }),
  value: {
    ecs: 'max(kubernetes.node.memory.allocatable.bytes)',
    semconv: 'max(metrics.k8s.node.memory.allocatable)',
  },
  format: 'bytes',
  decimals: 1,
};

export const nodeMemoryUsed: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.used', {
    defaultMessage: 'Used',
  }),
  value: {
    ecs: 'average(kubernetes.node.memory.usage.bytes)',
    semconv: 'average(metrics.k8s.node.memory.usage)',
  },
  format: 'bytes',
  decimals: 1,
};
