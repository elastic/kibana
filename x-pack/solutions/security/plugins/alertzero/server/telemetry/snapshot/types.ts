/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertZeroAutonomyLevel } from '../constants';
import type { AlertZeroSnapshotFlag } from './constants';

/** One installed Worker, as the snapshot reads it from one space. */
export interface SpaceWorkerSnapshot {
  autonomyLevel: AlertZeroAutonomyLevel;
  enabled: boolean;
  workerId: string;
}

/** What the daily snapshot reads from one space, before it is summed across the cluster. */
export interface SpaceSnapshot {
  flags: Readonly<Record<AlertZeroSnapshotFlag, boolean>>;
  workers: readonly SpaceWorkerSnapshot[];
}
