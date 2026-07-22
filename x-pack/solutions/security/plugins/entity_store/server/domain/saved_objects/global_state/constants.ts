/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { isEqual } from 'lodash';

export const DEFAULT_HISTORY_SNAPSHOT_FREQUENCY = '24h';

export const LOG_EXTRACTION_DELAY_DEFAULT = '1m';
export const LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT = '3h';
export const LOG_EXTRACTION_FREQUENCY_DEFAULT = '1m';
// Max amount of entities to extract in one ESQL query
export const LOG_EXTRACTION_DOCS_LIMIT_DEFAULT = 10000;
// Max raw log documents per logs to be processed in a query (inside elastic search)
export const LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT = 50_000;
export const LOG_EXTRACTION_TIMEOUT_DEFAULT = '59s';
export const LOG_EXTRACTION_MAX_TIME_WINDOW_SIZE_DEFAULT = '15m';
// Max total raw log documents to process per task run; 0 = no cap
export const LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT = 100_000;
export const LOG_EXTRACTION_CAP_BEHAVIOR_DEFAULT = 'drop' as const;

const DurationSchema = z.string().regex(/[smdh]$/);

/** Root schema (shape + validation, no defaults); the resolved and input layers derive from it. */
export type LogExtractionConfigBase = z.infer<typeof LogExtractionConfigBase>;
export const LogExtractionConfigBase = z.object({
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

const base = LogExtractionConfigBase.shape;

/** Resolved config: Base + per-field defaults. The only place defaults live; read resolution parses with this. */
export type LogExtractionConfig = z.infer<typeof LogExtractionConfig>;
export const LogExtractionConfig = z.object({
  additionalIndexPatterns: base.additionalIndexPatterns.default([]),
  excludedIndexPatterns: base.excludedIndexPatterns.default([]),
  fieldHistoryLength: base.fieldHistoryLength.default(10),
  lookbackPeriod: base.lookbackPeriod.default(LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT),
  delay: base.delay.default(LOG_EXTRACTION_DELAY_DEFAULT),
  docsLimit: base.docsLimit.default(LOG_EXTRACTION_DOCS_LIMIT_DEFAULT),
  maxLogsPerPage: base.maxLogsPerPage.default(LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT),
  timeout: base.timeout.default(LOG_EXTRACTION_TIMEOUT_DEFAULT),
  frequency: base.frequency.default(LOG_EXTRACTION_FREQUENCY_DEFAULT),
  maxTimeWindowSize: base.maxTimeWindowSize.default(LOG_EXTRACTION_MAX_TIME_WINDOW_SIZE_DEFAULT),
  maxLogsPerWindow: base.maxLogsPerWindow.default(LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT),
  maxLogsPerWindowCapBehavior: base.maxLogsPerWindowCapBehavior.default(
    LOG_EXTRACTION_CAP_BEHAVIOR_DEFAULT
  ),
});

/** API body + persisted shape: settable fields, optional, no defaults (only overrides are stored). `timeout` excluded — not user-settable. */
export type LogExtractionConfigInput = z.infer<typeof LogExtractionConfigInput>;
export const LogExtractionConfigInput = LogExtractionConfigBase.omit({ timeout: true }).partial();

/** The log extraction defaults, resolved from the schema. */
export const LOG_EXTRACTION_DEFAULTS: LogExtractionConfig = LogExtractionConfig.parse({});

/** Reduces a config to only the values differing from the current defaults; a value equal to its default is dropped (stays tracking defaults). */
export const toLogExtractionOverrides = (
  config: Partial<LogExtractionConfig>
): LogExtractionConfigInput => {
  const overrides: Partial<Record<keyof LogExtractionConfig, unknown>> = {};
  for (const key of Object.keys(LOG_EXTRACTION_DEFAULTS) as Array<keyof LogExtractionConfig>) {
    const value = config[key];
    if (value !== undefined && !isEqual(value, LOG_EXTRACTION_DEFAULTS[key])) {
      overrides[key] = value;
    }
  }
  return overrides as LogExtractionConfigInput;
};

export type HistorySnapshotStatus = z.infer<typeof HistorySnapshotStatus>;
export const HistorySnapshotStatus = z.enum(['started', 'stopped']);

export type HistorySnapshotState = z.infer<typeof HistorySnapshotState>;
export const HistorySnapshotState = z.object({
  status: HistorySnapshotStatus.default('started'),
  frequency: DurationSchema.default(DEFAULT_HISTORY_SNAPSHOT_FREQUENCY),
  lastExecutionTimestamp: z.string().optional(),
  lastError: z
    .object({
      message: z.string(),
      timestamp: z.string().optional(),
    })
    .optional(),
});

export type EntityStoreGlobalState = z.infer<typeof EntityStoreGlobalState>;
export const EntityStoreGlobalState = z.object({
  historySnapshot: HistorySnapshotState,
  logsExtraction: LogExtractionConfig,
});

/** Persisted shape: like {@link EntityStoreGlobalState} but `logsExtraction` holds sparse overrides, not a resolved config. */
export interface StoredEntityStoreGlobalState {
  historySnapshot: HistorySnapshotState;
  logsExtraction: LogExtractionConfigInput;
}
