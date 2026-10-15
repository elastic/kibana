/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TSVBMetricModelCreator, TSVBMetricModel } from '../../../../types';
import { podCpuSeries, podMemorySeries, podModelRequires, podNetworkSeries } from './pod_series';

export const podOverview: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval,
  options
): TSVBMetricModel => ({
  id: 'podOverview',
  requires: podModelRequires(options?.schema),
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [
    podCpuSeries(options?.schema),
    podMemorySeries(options?.schema),
    podNetworkSeries(options?.schema, 'rx', 'posonly-deriv-max-network-rx'),
    podNetworkSeries(options?.schema, 'tx', 'posonly-deriv-max-network-tx'),
  ],
});
