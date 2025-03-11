/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';

export const nodeCpuCapacity: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.capacity', {
    defaultMessage: 'Capacity',
  }),
  value: 'max(kubernetes.node.cpu.allocatable.cores) * 1000000000',
  format: 'number',
  decimals: 1,
  compactValues: true,
};

export const nodeCpuUsed: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.used', {
    defaultMessage: 'Used',
  }),
  value: 'average(kubernetes.node.cpu.usage.nanocores)',
  format: 'number',
  decimals: 1,
  compactValues: true,
};
