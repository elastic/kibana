/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MEMORY_FREE_LABEL, MEMORY_USAGE_LABEL } from '../../../shared/charts/constants';
import type { SchemaBasedFormula } from '../../../shared/metrics/types';

export const memoryCache: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.cache', {
    defaultMessage: 'cache',
  }),
  value: {
    ecs: 'average(system.memory.used.bytes) - average(system.memory.actual.used.bytes)',
    semconv:
      "average(metrics.system.memory.usage, kql='state: cache') / average(metrics.system.memory.usage, kql='state: slab_reclaimable') + average(metrics.system.memory.usage, kql='state: slab_unreclaimable')",
  },
  format: 'bytes',
  decimals: 1,
};

export const memoryFree: SchemaBasedFormula = {
  label: MEMORY_FREE_LABEL,
  value: {
    ecs: 'max(system.memory.total) - average(system.memory.actual.used.bytes)',
    semconv:
      "(max(metrics.system.memory.usage, kql='state: free') + max(metrics.system.memory.usage, kql='state: cached')) - (average(metrics.system.memory.usage, kql='state: slab_unreclaimable') + average(metrics.system.memory.usage, kql='state: slab_reclaimable'))",
  },
  format: 'bytes',
  decimals: 1,
};

export const memoryFreeExcludingCache: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.free', {
    defaultMessage: 'free',
  }),
  value: {
    ecs: 'average(system.memory.free)',
    semconv: "average(metrics.system.memory.usage, kql='state: free')",
  },
  format: 'bytes',
  decimals: 1,
};

export const memoryUsage: SchemaBasedFormula = {
  label: MEMORY_USAGE_LABEL,
  value: {
    ecs: 'average(system.memory.actual.used.pct)',
    semconv:
      "average(system.memory.utilization, kql='state: used') + average(system.memory.utilization, kql='state: buffered') + average(system.memory.utilization, kql='state: slab_reclaimable') + average(system.memory.utilization, kql='state: slab_unreclaimable')",
  },
  format: 'percent',

  decimals: 0,
};

export const memoryUsed: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.used', {
    defaultMessage: 'used',
  }),
  value: {
    ecs: 'average(system.memory.actual.used.bytes)',
    semconv:
      "average(metrics.system.memory.usage, kql='state: used') + average(metrics.system.memory.usage, kql='state: buffered') + average(metrics.system.memory.usage, kql='state: slab_reclaimable') + average(metrics.system.memory.usage, kql='state: slab_unreclaimable')",
  },
  format: 'bytes',
  decimals: 1,
};
