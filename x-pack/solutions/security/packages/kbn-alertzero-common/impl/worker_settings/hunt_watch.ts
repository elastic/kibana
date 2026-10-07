/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID } from '../../constants';
import type { WorkerSettingsDeclaration } from './types';

/**
 * Hunt Watch Continuous Threat Hunt: fixed Manual autonomy and a locked 4h schedule
 * (scheduled + manual triggers). Its tier2When, candidateLimit, and fanOutMax dials are
 * fixed implementation constants, not user-configurable; see `HUNT_WORKER_DEFAULTS` in
 * `worker_template_values.ts`.
 */
export const CONTINUOUS_THREAT_HUNT_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  allowedAutonomyLevels: ['manual'],
  scheduleInterval: { defaultValue: '4h', readOnly: true },
};
