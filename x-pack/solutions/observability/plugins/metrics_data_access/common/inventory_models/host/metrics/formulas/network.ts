/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';

export const rx: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.rx', {
    defaultMessage: 'Network Inbound (RX)',
  }),
  value: `defaults(
        counter_rate(max(system.network.in.bytes)),
        counter_rate(max(metrics.system.network.io, kql='direction: receive'))
    )`,
  format: 'bytes',
  decimals: 1,
};

export const tx: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.tx', {
    defaultMessage: 'Network Outbound (TX)',
  }),
  value: `defaults(
        counter_rate(max(system.network.out.bytes)),
        counter_rate(max(metrics.system.network.io, kql='direction: transmit'))
    )`,
  format: 'bytes',
  decimals: 1,
};
