/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';
import { RX_LABEL, TX_LABEL } from '../../../shared/charts/constants';

export const dockerContainerNetworkRx: LensBaseLayer = {
  label: RX_LABEL,
  value:
    "average(docker.network.inbound.bytes) * 8 / (max(metricset.period, kql='docker.network.inbound.bytes: *') / 1000)",
  format: 'bits',
  decimals: 1,
  normalizeByUnit: 's',
};

export const dockerContainerNetworkTx: LensBaseLayer = {
  label: TX_LABEL,
  value:
    "average(docker.network.outbound.bytes) * 8 / (max(metricset.period, kql='docker.network.outbound.bytes: *') / 1000)",
  format: 'bits',
  decimals: 1,
  normalizeByUnit: 's',
};
