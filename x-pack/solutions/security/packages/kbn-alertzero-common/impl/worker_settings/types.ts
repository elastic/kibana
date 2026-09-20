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
   *
   * `defaultValue` is what makes the extras mandatory. Declare it and a fresh install writes it,
   * and the complete schema requires the key. Omit it and the Worker's extras are optional
   * end-to-end: a fresh install writes no `extras` key, and a document stored before the Worker
   * declared any extras still reads back — which is the only way to add an opt-in setting to a
   * Worker that already has installed documents, since adding one is not a settings-version change
   * and so has nothing to migrate on. An `extras` object that *is* present is validated just as
   * strictly either way.
   */
  extras?: { schema: z.ZodType<TExtras>; defaultValue?: TExtras };
}
