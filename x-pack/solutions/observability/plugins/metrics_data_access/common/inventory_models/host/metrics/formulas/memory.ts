/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';
import { MEMORY_FREE_LABEL, MEMORY_USAGE_LABEL } from '../../../shared/charts/constants';

export const memoryCache: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.cache', {
    defaultMessage: 'cache',
  }),
  value: `defaults(
        average(system.memory.used.bytes),
        average(metrics.system.memory.usage, kql='state: cached')
    ) - defaults(
        average(system.memory.actual.used.bytes), 
        average(metrics.system.memory.usage, kql='state: slab_reclaimable') + 
        average(metrics.system.memory.usage, kql='state: slab_unreclaimable')
    )`,
  format: 'bytes',
  decimals: 1,
};

export const memoryFree: LensBaseLayer = {
  label: MEMORY_FREE_LABEL,
  value: `defaults(
        average(system.memory.actual.free),
        (average(metrics.system.memory.usage, kql='state: free') +
        average(metrics.system.memory.usage, kql='state: cached')) - 
        (average(metrics.system.memory.usage, kql='state: slab_unreclaimable') +
        average(metrics.system.memory.usage, kql='state: slab_reclaimable')) 
    )`,
  format: 'bytes',
  decimals: 1,
};

export const memoryFreeExcludingCache: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.free', {
    defaultMessage: 'free',
  }),
  value: `defaults(
        average(system.memory.free),
        average(metrics.system.memory.usage, kql='state: free')
    )`,
  format: 'bytes',
  decimals: 1,
};

export const memoryUsage: LensBaseLayer = {
  label: MEMORY_USAGE_LABEL,
  value: `defaults(
        average(system.memory.actual.used.pct), 
        (
            average(system.memory.utilization, kql='state: used') + 
            average(system.memory.utilization, kql='state: buffered') + 
            average(system.memory.utilization, kql='state: slab_reclaimable')+ 
            average(system.memory.utilization, kql='state: slab_unreclaimable')
        )
    )`,
  format: 'percent',
  decimals: 0,
};

export const memoryUsed: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.metric.label.used', {
    defaultMessage: 'used',
  }),
  value: `defaults(
        average(system.memory.actual.used.bytes),
        average(metrics.system.memory.usage, kql='state: used') + 
        average(metrics.system.memory.usage, kql='state: buffered') + 
        average(metrics.system.memory.usage, kql='state: slab_reclaimable') + 
        average(metrics.system.memory.usage, kql='state: slab_unreclaimable')
    )`,
  format: 'bytes',
  decimals: 1,
};
