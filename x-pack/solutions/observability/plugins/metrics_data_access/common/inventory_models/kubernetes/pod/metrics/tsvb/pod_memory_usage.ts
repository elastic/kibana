/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TSVBMetricModelCreator, TSVBMetricModel } from '../../../../types';
import { podMemorySeries, podModelRequires } from './pod_series';

export const podMemoryUsage: TSVBMetricModelCreator = (
  timeField,
  indexPattern,
  interval,
  options
): TSVBMetricModel => ({
  id: 'podMemoryUsage',
  requires: podModelRequires(options?.schema),
  index_pattern: indexPattern,
  interval,
  time_field: timeField,
  type: 'timeseries',
  series: [podMemorySeries(options?.schema)],
});
