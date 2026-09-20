/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Hunt Watch Worker settings, owned by the Hunt Watch team. Adding a Continuous Threat Hunt
 * setting means: add the field to `ContinuousThreatHuntWorkerExtras` in
 * `hunt_watch_settings.schema.yaml`, forward it in the Hunt workflow template, and build its
 * control under the Watch page's `custom_settings/hunt/`. Nothing outside Hunt-owned code changes.
 */

import {
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  WATCH_AUTONOMY_LEVELS,
} from '../../constants';
import { ContinuousThreatHuntWorkerExtras } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

export const CONTINUOUS_THREAT_HUNT_SETTINGS: WorkerSettingsDeclaration<ContinuousThreatHuntWorkerExtras> =
  {
    workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    allowedAutonomyLevels: WATCH_AUTONOMY_LEVELS,
    // No `defaultValue`: the agent is opt-in. Until someone picks one, the Worker stores no
    // `extras` at all and the workflow runs its own default agent, so installing this setting
    // changes nothing for a Worker already in the field.
    extras: { schema: ContinuousThreatHuntWorkerExtras },
  };
