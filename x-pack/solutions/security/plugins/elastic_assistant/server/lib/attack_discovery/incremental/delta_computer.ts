/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateTracker } from './state_tracker';
import type { Alert } from './types';

/**
 * Compute delta (NEW alerts) since last run
 *
 * @param alerts - All current alerts
 * @param stateTracker - State tracker with processed alert history
 * @returns Only unprocessed (new) alerts
 */
export async function computeDelta(
  alerts: Alert[],
  stateTracker: StateTracker
): Promise<Alert[]> {
  return await stateTracker.filterUnprocessed(alerts);
}
