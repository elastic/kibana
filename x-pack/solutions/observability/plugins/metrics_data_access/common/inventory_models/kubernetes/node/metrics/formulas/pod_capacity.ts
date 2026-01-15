/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SchemaBasedFormula } from '../../../../shared/metrics/types';

export const nodePodCapacity: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.capacity', {
    defaultMessage: 'Capacity',
  }),
  value: {
    ecs: "last_value(kubernetes.node.pod.allocatable.total,  kql='kubernetes.node.pod.allocatable.total: *')",
    semconv: '',
  },
  format: 'number',
  decimals: 0,
};

export const nodePodUsed: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.kubernetes.used', {
    defaultMessage: 'Used',
  }),
  value: {
    ecs: 'unique_count(kubernetes.pod.uid)',
    semconv: '',
  },
  format: 'number',
  decimals: 0,
};
