/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SchemaBasedFormula } from '../../../shared/metrics/types';

export const rx: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.rx', {
    defaultMessage: 'Network Inbound (RX)',
  }),
  value: {
    ecs: '8 * counter_rate(max(system.network.in.bytes))',
    semconv: "8 * counter_rate(max(metrics.system.network.io, kql='direction: receive'))",
  },
  format: 'bits',
  decimals: 1,
  normalizeByUnit: 's',
};

export const tx: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.tx', {
    defaultMessage: 'Network Outbound (TX)',
  }),
  value: {
    ecs: '8 * counter_rate(max(system.network.out.bytes))',
    semconv: "8 * counter_rate(max(metrics.system.network.io, kql='direction: transmit'))",
  },
  format: 'bits',
  decimals: 1,
  normalizeByUnit: 's',
};
