/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricConfigMap } from '../../../../shared/metrics/types';
import { podCpuUsage } from './cpu';
import { podMemoryUsage } from './memory';
import { podNetworkRx, podNetworkTx } from './network';

export const formulas = {
  podCpuUsage,
  podMemoryUsage,
  podNetworkRx,
  podNetworkTx,
} satisfies MetricConfigMap;

export type PodFormulas = typeof formulas;
