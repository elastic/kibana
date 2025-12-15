/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum GapRangeValue {
  LAST_24_H = 'last_24_h',
  LAST_3_D = 'last_3_d',
  LAST_7_D = 'last_7_d',
  LAST_90_D = 'last_90_d',
}

export const defaultRangeValue = GapRangeValue.LAST_90_D;

export const DEFAULT_GAP_AUTO_FILL_SCHEDULER_NAME = 'Security Solution Gap Auto Fill Scheduler';
export const DEFAULT_GAP_AUTO_FILL_SCHEDULER_INTERVAL = '5m';
export const DEFAULT_GAP_AUTO_FILL_SCHEDULER_MAX_BACKFILLS = 100;
export const DEFAULT_GAP_AUTO_FILL_SCHEDULER_NUM_RETRIES = 3;
export const DEFAULT_GAP_AUTO_FILL_SCHEDULER_GAP_FILL_RANGE = 'now-90d';
export const DEFAULT_GAP_AUTO_FILL_SCHEDULER_SCOPE = ['security_solution'];
export const DEFAULT_GAP_AUTO_FILL_SCHEDULER_ID_PREFIX =
  'security-solution-gap-auto-fill-scheduler';
