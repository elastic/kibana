/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  WATCH_AUTONOMY_LEVELS,
} from '../../constants';
import type { WorkerSettingsDeclaration } from './types';

export const ALERT_TRIAGE_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  allowedAutonomyLevels: WATCH_AUTONOMY_LEVELS,
};

export const ATTACK_DISCOVERY_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  allowedAutonomyLevels: WATCH_AUTONOMY_LEVELS,
  // Matches the Attack Discovery schedule form default.
  scheduleInterval: { defaultValue: '24h' },
};
