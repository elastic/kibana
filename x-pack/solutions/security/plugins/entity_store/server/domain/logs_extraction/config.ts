/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, isUndefined, omitBy } from 'lodash';
import { z } from '@kbn/zod/v4';

const DurationSchema = z.string().regex(/[smdh]$/);

export type LogExtractionConfig = z.infer<typeof LogExtractionConfig>;
export const LogExtractionConfig = z.object({
  additionalIndexPatterns: z.array(z.string()),
  excludedIndexPatterns: z.array(z.string()),
  fieldHistoryLength: z.number().int(),
  lookbackPeriod: DurationSchema,
  delay: DurationSchema,
  docsLimit: z.number().int().min(1),
  maxLogsPerPage: z.number().int().min(1),
  timeout: DurationSchema,
  frequency: DurationSchema,
  maxTimeWindowSize: DurationSchema,
  maxLogsPerWindow: z.number().int().min(0),
  maxLogsPerWindowCapBehavior: z.enum(['defer', 'drop']),
});

export const LEGACY_LOG_EXTRACTION_DEFAULTS: LogExtractionConfig = {
  additionalIndexPatterns: [],
  excludedIndexPatterns: [],
  fieldHistoryLength: 10,
  lookbackPeriod: '3h',
  delay: '1m',
  docsLimit: 10_000,
  maxLogsPerPage: 50_000,
  timeout: '59s',
  frequency: '1m',
  maxTimeWindowSize: '15m',
  maxLogsPerWindow: 100_000,
  maxLogsPerWindowCapBehavior: 'drop',
};

export const LATEST_LOG_EXTRACTION_DEFAULTS: LogExtractionConfig = {
  ...LEGACY_LOG_EXTRACTION_DEFAULTS,
  maxLogsPerPage: 100_000,
  frequency: '10m',
};

// Overrides are explicit changes to the defaults, so they are sparse and partial
export type LogExtractionOverrides = z.infer<typeof LogExtractionOverrides>;
export const LogExtractionOverrides = LogExtractionConfig.partial();

export const omitEqualToBaseline = (
  config: Partial<LogExtractionConfig>,
  baseline: LogExtractionConfig
): LogExtractionOverrides => {
  const overrides: LogExtractionOverrides = {};
  for (const key of Object.keys(baseline) as Array<keyof LogExtractionConfig>) {
    const value = config[key];
    if (value !== undefined && !isEqual(value, baseline[key])) {
      (overrides as Record<string, unknown>)[key] = value;
    }
  }
  return overrides;
};

export const resolveLogExtractionConfig = (
  overrides: LogExtractionOverrides = {}
): LogExtractionConfig =>
  LogExtractionConfig.parse({
    ...LATEST_LOG_EXTRACTION_DEFAULTS,
    ...omitBy(overrides, isUndefined),
  });

export const getLegacyLogExtractionOverrides = (
  logsExtraction: Partial<LogExtractionConfig>
): LogExtractionOverrides => omitEqualToBaseline(logsExtraction, LEGACY_LOG_EXTRACTION_DEFAULTS);

export const getLatestLogExtractionOverrides = (
  config: Partial<LogExtractionConfig>
): LogExtractionOverrides => omitEqualToBaseline(config, LATEST_LOG_EXTRACTION_DEFAULTS);
