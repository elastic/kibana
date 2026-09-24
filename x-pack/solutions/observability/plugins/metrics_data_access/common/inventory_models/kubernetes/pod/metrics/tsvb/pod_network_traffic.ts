/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TSVBMetricModelCreator, TSVBMetricModel } from '../../../../types';
import { podModelRequires, podNetworkSeries } from './pod_series';

export const podNetworkTraffic: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval,
  options
): TSVBMetricModel => ({
  id: 'podNetworkTraffic',
  requires: podModelRequires(options?.schema),
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    podNetworkSeries(options?.schema, 'tx', 'posonly-deriv-max-net-tx'),
    podNetworkSeries(
      options?.schema,
      'rx',
      'posonly-deriv-max-net-rx',
      'invert-posonly-deriv-max-network-rx'
    ),
  ],
});
