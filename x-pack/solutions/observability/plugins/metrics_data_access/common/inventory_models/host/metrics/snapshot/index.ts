/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpuV2 } from './cpu_v2';
import { cpu } from './cpu';
import { diskSpaceUsage } from './disk_space_usage';
import { load } from './load';
import { logRate } from './log_rate';
import { memory } from './memory';
import { memoryFree } from './memory_free';
import { normalizedLoad1m } from './normalized_load_1m';
import { rx } from './rx';
import { tx } from './tx';
import { txV2 } from './tx_v2';
import { rxV2 } from './rx_v2';
import type { MetricConfigMap } from '../../../shared/metrics/types';

export const snapshot = {
  cpuV2,
  diskSpaceUsage,
  load,
  logRate,
  memory,
  memoryFree,
  normalizedLoad1m,
  rxV2,
  txV2,
  cpu,
  rx,
  tx,
} satisfies MetricConfigMap;

export type HostAggregations = typeof snapshot;
