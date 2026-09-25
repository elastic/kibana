/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hunt Watch Worker settings. Adding a Continuous Threat Hunt dial means: add the field
 * to `ContinuousThreatHuntWorkerExtras`, add its default here, forward it in
 * `renderHuntWorkerYaml`, and (when UI lands) build its control under the Watch page.
 */

import { z } from '@kbn/zod/v4';
import {
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  WATCH_AUTONOMY_LEVELS,
} from '../../constants';
import { HuntTechnology } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

export const ContinuousThreatHuntWorkerExtras = z
  .object({
    tier2When: z.enum(['on_hits', 'always']),
    candidateLimit: z.number().int().min(1).max(10),
    fanOutMax: z.number().int().min(1).max(10),
    /** Absent means the coordinator auto-resolves technologies from index scope. */
    technology: HuntTechnology.optional(),
  })
  .strict();
export type ContinuousThreatHuntWorkerExtras = z.infer<typeof ContinuousThreatHuntWorkerExtras>;

export const CONTINUOUS_THREAT_HUNT_DEFAULT_EXTRAS: ContinuousThreatHuntWorkerExtras = {
  tier2When: 'on_hits',
  candidateLimit: 10,
  fanOutMax: 10,
};

export const CONTINUOUS_THREAT_HUNT_SETTINGS: WorkerSettingsDeclaration<ContinuousThreatHuntWorkerExtras> =
  {
    workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    allowedAutonomyLevels: WATCH_AUTONOMY_LEVELS,
    scheduleInterval: { defaultValue: '4h' },
    extras: {
      schema: ContinuousThreatHuntWorkerExtras,
      defaultValue: CONTINUOUS_THREAT_HUNT_DEFAULT_EXTRAS,
    },
  };
