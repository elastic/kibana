/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { WatchAutonomyLevel, WorkerScheduleInterval, WorkerSettingsExtras } from '../schemas';

/**
 * The one declaration a Worker makes about its settings. Everything else — the complete read/write
 * schema, the defaults, which controls the shared Watch page renders and which autonomy options it
 * offers — is derived from this, so there is no second list to keep in step with it.
 */
export interface WorkerSettingsDeclaration<
  TExtras extends WorkerSettingsExtras = WorkerSettingsExtras
> {
  workerId: string;
  /**
   * Autonomy levels this Worker supports, in ascending order. The UI offers only these; the server
   * rejects any other. Manual is the default for a fresh install when allowed, otherwise the first.
   */
  allowedAutonomyLevels: readonly [WatchAutonomyLevel, ...WatchAutonomyLevel[]];
  /** Present only for schedule-driven Workers; its presence is what renders the interval control. */
  scheduleInterval?: { defaultValue: WorkerScheduleInterval };
  /**
   * Worker-specific settings, owned by the Worker's Watch team. The schema is the closed, complete
   * `extras` object: it is validated whole on every write and every read.
   */
  extras?: { schema: z.ZodType<TExtras>; defaultValue: TExtras };
}
