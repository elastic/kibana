/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertZeroWorkerSetting } from '../constants';

const SETTING_BY_KEY: ReadonlyMap<string, AlertZeroWorkerSetting> = new Map([
  ['autonomy', 'autonomy'],
  ['extras', 'extras'],
  ['scheduleInterval', 'schedule_interval'],
  ['serviceAccountId', 'service_account'],
]);

/** Maps a Worker settings key to its allowlisted telemetry name, else to `other`. */
export const resolveWorkerSetting = (key: string): AlertZeroWorkerSetting =>
  SETTING_BY_KEY.get(key) ?? 'other';
