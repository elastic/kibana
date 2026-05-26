/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const DurationSchema = z.string().regex(/[smhd]$/);
const PositiveInt = z.int().min(1);
const NonNegativeInt = z.int().nonnegative();

/**
 * Root schema for entity log extraction config. Used to derive:
 * 1) `LogExtractionConfig` — global state SO. Adds `.default(...)` per field so `.parse()` fills missing values.
 * 2) `EngineLogExtractionConfig` — per-engine SO. `frequency` is seeded per-type at init time (see `extractEntityTaskFrequencyByType`), not via a schema default.
 * 3) `LogExtractionConfigBody` — HTTP body for install/update. Intentionally has no defaults — `.partial()` would otherwise preserve them and silently fill omitted fields.
 */
export const LogExtractionConfigSchema = z.object({
  additionalIndexPatterns: z.array(z.string()),
  excludedIndexPatterns: z.array(z.string()),
  fieldHistoryLength: z.int(),
  lookbackPeriod: DurationSchema,
  delay: DurationSchema,
  docsLimit: PositiveInt,
  maxLogsPerPage: PositiveInt,
  timeout: DurationSchema,
  maxTimeWindowSize: DurationSchema,
  maxLogsPerWindow: NonNegativeInt,
  maxLogsPerWindowCapBehavior: z.enum(['defer', 'drop']),
  /** Per-engine — seeded at engine init from `extractEntityTaskFrequencyByType`. */
  frequency: DurationSchema,
});
