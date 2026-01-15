/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RX_LABEL, TX_LABEL } from '../../../shared/charts/constants';
import type { SchemaBasedFormula } from '../../../shared/metrics/types';

export const dockerContainerNetworkRx: SchemaBasedFormula = {
  label: RX_LABEL,
  value: {
    ecs: "average(docker.network.inbound.bytes) * 8 / (max(metricset.period, kql='docker.network.inbound.bytes: *') / 1000)",
    semconv:
      'average(metrics.container.network.io, kql="metric.network.io.direction: receive") * 8',
  },
  format: 'bits',
  decimals: 1,
  normalizeByUnit: 's',
};

export const dockerContainerNetworkTx: SchemaBasedFormula = {
  label: TX_LABEL,
  value: {
    ecs: "average(docker.network.outbound.bytes) * 8 / (max(metricset.period, kql='docker.network.outbound.bytes: *') / 1000)",
    semconv:
      'average(metrics.container.network.io, kql="metric.network.io.direction: transmit") * 8',
  },
  format: 'bits',
  decimals: 1,
  normalizeByUnit: 's',
};
