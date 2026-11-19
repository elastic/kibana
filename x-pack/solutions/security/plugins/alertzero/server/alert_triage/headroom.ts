/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IN_FLIGHT_CEILING, TM_DELAY_LIMIT_MS } from './constants';
import type { HeadroomResult } from './types';

export interface ReadHeadroomParams {
  /** Batches currently running or queued in this space. */
  countInFlight: () => Promise<number>;
  /** How long the oldest overdue `workflow:run` task has been waiting, in milliseconds. */
  readTmLagMs: () => Promise<number>;
}

/**
 * Whether the sweep may start batches. `behind` and `unknown` both start nothing.
 *
 * `workflow:run` lag is cluster-wide, so a busy space also holds back the other spaces' sweeps.
 * That is intended: the lag is the shared signal that Task Manager is saturated. Time a batch
 * spends waiting in its own concurrency queue is not task lag and does not count here.
 */
export const readHeadroom = async ({
  countInFlight,
  readTmLagMs,
}: ReadHeadroomParams): Promise<HeadroomResult> => {
  let lagMs: number;
  try {
    lagMs = await readTmLagMs();
  } catch {
    return { status: 'unknown' };
  }
  if (lagMs > TM_DELAY_LIMIT_MS) {
    return { status: 'behind', lagMs };
  }

  let inFlight: number;
  try {
    inFlight = await countInFlight();
  } catch {
    // Assume half the ceiling: enough room to keep working, not enough to flood a blind sweep.
    inFlight = Math.floor(IN_FLIGHT_CEILING / 2);
  }
  return { status: 'ok', inFlight, slots: Math.max(0, IN_FLIGHT_CEILING - inFlight) };
};
