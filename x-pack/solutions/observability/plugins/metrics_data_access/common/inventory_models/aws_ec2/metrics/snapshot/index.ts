/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cpu } from './cpu';
import { rx } from './rx';
import { tx } from './tx';
import { diskIOReadBytes } from './disk_io_read_bytes';
import { diskIOWriteBytes } from './disk_io_write_bytes';
import type { MetricConfigMap } from '../../../shared/metrics/types';

export const snapshot = {
  cpu,
  rx,
  tx,
  diskIOReadBytes,
  diskIOWriteBytes,
} satisfies MetricConfigMap;

export type SQSAggregations = typeof snapshot;
