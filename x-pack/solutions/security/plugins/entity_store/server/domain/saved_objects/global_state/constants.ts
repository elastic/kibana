/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { LATEST_LOG_EXTRACTION_DEFAULTS, LogExtractionConfig } from '../../logs_extraction/config';

export const DEFAULT_HISTORY_SNAPSHOT_FREQUENCY = '24h';

export const LOG_EXTRACTION_DELAY_DEFAULT = LATEST_LOG_EXTRACTION_DEFAULTS.delay;
export const LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT = LATEST_LOG_EXTRACTION_DEFAULTS.lookbackPeriod;
export const LOG_EXTRACTION_FREQUENCY_DEFAULT = LATEST_LOG_EXTRACTION_DEFAULTS.frequency;
export const LOG_EXTRACTION_DOCS_LIMIT_DEFAULT = LATEST_LOG_EXTRACTION_DEFAULTS.docsLimit;
export const LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT =
  LATEST_LOG_EXTRACTION_DEFAULTS.maxLogsPerPage;
export const LOG_EXTRACTION_TIMEOUT_DEFAULT = LATEST_LOG_EXTRACTION_DEFAULTS.timeout;
export const LOG_EXTRACTION_MAX_TIME_WINDOW_SIZE_DEFAULT =
  LATEST_LOG_EXTRACTION_DEFAULTS.maxTimeWindowSize;
export const LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT =
  LATEST_LOG_EXTRACTION_DEFAULTS.maxLogsPerWindow;
export const LOG_EXTRACTION_CAP_BEHAVIOR_DEFAULT =
  LATEST_LOG_EXTRACTION_DEFAULTS.maxLogsPerWindowCapBehavior;

export type { LogExtractionConfig as LogExtractionConfigType } from '../../logs_extraction/config';
export {
  LATEST_LOG_EXTRACTION_DEFAULTS,
  LEGACY_LOG_EXTRACTION_DEFAULTS,
  LogExtractionConfig,
  LogExtractionOverrides,
  resolveLogExtractionConfig,
  getLatestLogExtractionOverrides as toStoredOverrides,
} from '../../logs_extraction/config';

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
  logsExtraction: LogExtractionConfig.optional(),
});
