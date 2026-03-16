/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getIncrementalDelta, markAlertsProcessed } from './incremental_processor';
export type { IncrementalAdResult } from './incremental_processor';
export {
  ensureTrackerIndex,
  getProcessedAlertIds,
  updateProcessedAlertIds,
  computeDeltaAlertIds,
} from './processed_alert_tracker';
