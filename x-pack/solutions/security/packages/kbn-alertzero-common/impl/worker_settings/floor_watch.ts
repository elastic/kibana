/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  WATCH_AUTONOMY_LEVELS,
} from '../../constants';
import type { WorkerSettingsDeclaration } from './types';

const AlertTriageWorkerExtras = z.object({
  /**
   * Minimum confidence score [0–1] for a false-positive verdict to trigger auto-close. Alerts below
   * this threshold are tagged and noted but not closed. Default aligns with the standalone workflow.
   */
  autoCloseConfidenceScoreMinThreshold: z.number().min(0).max(1),
});

type AlertTriageWorkerExtras = z.infer<typeof AlertTriageWorkerExtras>;

export const ALERT_TRIAGE_SETTINGS: WorkerSettingsDeclaration<AlertTriageWorkerExtras> = {
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  allowedAutonomyLevels: WATCH_AUTONOMY_LEVELS,
  extras: {
    schema: AlertTriageWorkerExtras,
    defaultValue: { autoCloseConfidenceScoreMinThreshold: 0.85 },
  },
};
