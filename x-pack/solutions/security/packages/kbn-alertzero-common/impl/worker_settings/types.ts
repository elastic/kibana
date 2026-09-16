/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { WatchAutonomyLevel } from '../schemas/components/watch_settings.gen';

export interface WorkerExtrasDeclaration<TExtras extends Record<string, unknown>> {
  /** Zod schema for extras validation. Use `.strict()` at validation time to reject unknown keys. */
  schema: z.ZodObject<{ [K in keyof TExtras]: z.ZodTypeAny }>;
  defaultValue: TExtras;
}

export interface WorkerSettingsDeclaration<
  TExtras extends Record<string, unknown> = Record<never, never>
> {
  workerId: string;
  allowedAutonomyLevels: readonly WatchAutonomyLevel[];
  extras?: WorkerExtrasDeclaration<TExtras>;
}
