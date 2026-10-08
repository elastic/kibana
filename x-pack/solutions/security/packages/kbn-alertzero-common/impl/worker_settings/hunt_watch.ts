/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  WATCH_AUTONOMY_LEVELS,
} from '../../constants';
import type { WorkerSettingsDeclaration } from './types';

/**
 * Hunt Watch Continuous Threat Hunt has no Worker-specific settings: enabled/disabled
 * (autonomy) and the schedule interval are its only configurable settings. Its tier2When,
 * candidateLimit, and fanOutMax dials are fixed implementation constants, not
 * user-configurable; see `HUNT_WORKER_DEFAULTS` in `worker_template_values.ts`.
 */
export const CONTINUOUS_THREAT_HUNT_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  allowedAutonomyLevels: WATCH_AUTONOMY_LEVELS,
  scheduleInterval: { defaultValue: '4h' },
};
