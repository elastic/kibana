/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { LogExtractionConfigSchema } from '../log_extraction_config_schema';

export const DEFAULT_HISTORY_SNAPSHOT_FREQUENCY = '24h';

export const LOG_EXTRACTION_DELAY_DEFAULT = '1m';
export const LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT = '3h';
// Max amount of entities to extract in one ESQL query
export const LOG_EXTRACTION_DOCS_LIMIT_DEFAULT = 10000;
// Max raw log documents per logs to be processed in a query (inside elastic search)
export const LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT = 50_000;
export const LOG_EXTRACTION_TIMEOUT_DEFAULT = '59s';
export const LOG_EXTRACTION_MAX_TIME_WINDOW_SIZE_DEFAULT = '15m';
// Max total raw log documents to process per task run; 0 = no cap
export const LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT = 100_000;
export const LOG_EXTRACTION_CAP_BEHAVIOR_DEFAULT = 'drop' as const;

const { shape } = LogExtractionConfigSchema;

// Used for global SO, with defaults
export type LogExtractionConfig = z.infer<typeof LogExtractionConfig>;
export const LogExtractionConfig = z.object({
  additionalIndexPatterns: shape.additionalIndexPatterns.default([]),
  excludedIndexPatterns: shape.excludedIndexPatterns.default([]),
  fieldHistoryLength: shape.fieldHistoryLength.default(10),
  lookbackPeriod: shape.lookbackPeriod.default(LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT),
  delay: shape.delay.default(LOG_EXTRACTION_DELAY_DEFAULT),
  docsLimit: shape.docsLimit.default(LOG_EXTRACTION_DOCS_LIMIT_DEFAULT),
  maxLogsPerPage: shape.maxLogsPerPage.default(LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT),
  timeout: shape.timeout.default(LOG_EXTRACTION_TIMEOUT_DEFAULT),
  maxTimeWindowSize: shape.maxTimeWindowSize.default(LOG_EXTRACTION_MAX_TIME_WINDOW_SIZE_DEFAULT),
  maxLogsPerWindow: shape.maxLogsPerWindow.default(LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT),
  maxLogsPerWindowCapBehavior: shape.maxLogsPerWindowCapBehavior.default(
    LOG_EXTRACTION_CAP_BEHAVIOR_DEFAULT
  ),
});

export type HistorySnapshotStatus = z.infer<typeof HistorySnapshotStatus>;
export const HistorySnapshotStatus = z.enum(['started', 'stopped']);

export type HistorySnapshotState = z.infer<typeof HistorySnapshotState>;
export const HistorySnapshotState = z.object({
  status: HistorySnapshotStatus.default('started'),
  frequency: z
    .string()
    .regex(/[smdh]$/)
    .default(DEFAULT_HISTORY_SNAPSHOT_FREQUENCY),
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
