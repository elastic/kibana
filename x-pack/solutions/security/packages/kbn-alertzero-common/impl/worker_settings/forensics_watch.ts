/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  WATCH_AUTONOMY_LEVELS,
} from '../../constants';
import type { WorkerSettingsDeclaration } from './types';

export const ENDPOINT_ANALYSIS_SETTINGS: WorkerSettingsDeclaration = {
  workerId: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  allowedAutonomyLevels: WATCH_AUTONOMY_LEVELS,
  // Sweep is cheap; the child drop-concurrency is what caps analysis. Default
  // often enough that a pending indicator is not left sitting for hours.
  scheduleInterval: { defaultValue: '15m' },
};
