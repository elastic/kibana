/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SchemaBasedFormula } from '../../../../shared/metrics/types';

export const nodeDiskCapacity: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.capacity', {
    defaultMessage: 'Capacity',
  }),
  value: {
    ecs: 'max(kubernetes.node.fs.capacity.bytes)',
    semconv: 'max(metrics.k8s.node.filesystem.capacity)',
  },
  format: 'bytes',
  decimals: 1,
};

export const nodeDiskUsed: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.used', {
    defaultMessage: 'Used',
  }),
  value: {
    ecs: 'average(kubernetes.node.fs.used.bytes)',
    semconv: 'average(metrics.k8s.node.filesystem.usage)',
  },
  format: 'bytes',
  decimals: 1,
};
