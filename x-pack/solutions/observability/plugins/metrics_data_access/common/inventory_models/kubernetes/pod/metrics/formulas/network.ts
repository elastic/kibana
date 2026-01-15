/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RX_LABEL, TX_LABEL } from '../../../../shared/charts/constants';
import type { SchemaBasedFormula } from '../../../../shared/metrics/types';

export const podNetworkRx: SchemaBasedFormula = {
  label: RX_LABEL,
  value: {
    ecs: "average(kubernetes.pod.network.rx.bytes) * 8 / (max(metricset.period, kql='kubernetes.pod.network.rx.bytes: *') / 1000)",
    semconv: "average(metrics.k8s.pod.network.io, kql='direction: receive') * 8",
  },
  format: 'bits',
  decimals: 1,
  normalizeByUnit: 's',
};

export const podNetworkTx: SchemaBasedFormula = {
  label: TX_LABEL,
  value: {
    ecs: "average(kubernetes.pod.network.tx.bytes) * 8 / (max(metricset.period, kql='kubernetes.pod.network.tx.bytes: *') / 1000)",
    semconv: "average(metrics.k8s.pod.network.io, kql='direction: transmit') * 8",
  },
  format: 'bits',
  decimals: 1,
  normalizeByUnit: 's',
};
