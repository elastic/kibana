/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { WatchAutonomyLevel, WorkerScheduleInterval, WorkerSettingsExtras } from '../schemas';

/**
 * One step in a Worker's settings migration chain. `migrations[0]` upgrades a stored
 * `settingsVersion` of 1 to 2. Steps see template values (`autonomyLevel`, not the API's
 * `autonomy`). Return the same object when the step has nothing to do, and do not mutate it.
 */
export type WorkerSettingsMigration = (stored: Record<string, unknown>) => Record<string, unknown>;

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
   * Current template-value shape. Stays `1` while changes are only new fields with defaults.
   * Bump it, and add the matching `migrations` step, when a stored value has to move or change type.
   * `migrations.length` is `settingsVersion - 1`.
   */
  settingsVersion: number;
  /**
   * Ordered upgrades of stored template values. Empty at version 1. See `README.md` in this folder.
   */
  migrations?: readonly WorkerSettingsMigration[];
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
