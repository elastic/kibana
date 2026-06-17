/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

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

// Default confidence floor for the KI confidence-classification channel's
// `schema`-feature query. 0 = include every qualifying schema feature
// regardless of confidence; operators can raise it. Source discovery uses
// deterministic `dataset_analysis` features (always confidence 100) and does
// not consult this floor.
export const LOG_EXTRACTION_DISCOVERED_SOURCE_MIN_CONFIDENCE_DEFAULT = 0;

export type LogExtractionConfig = z.infer<typeof LogExtractionConfig>;
export const LogExtractionConfig = z.object({
  additionalIndexPatterns: z.array(z.string()).default([]),
  excludedIndexPatterns: z.array(z.string()).default([]),
  /**
   * POC feature flag (idea 01 re-scope): when true, each engine sources its
   * `FROM` from KI-discovered, per-entity-type index patterns instead of the
   * Security Solution data view. The data view is NOT used as a source while
   * this is enabled (no silent fallback). Default `false` keeps behavior
   * byte-identical to a deployment without this feature.
   */
  useDiscoveredIndexSource: z.boolean().default(false),
  /**
   * POC feature flag (idea 02 re-scope / POC 5): when true, the user engine
   * derives `entity.namespace` and `entity.confidence` (high=IdP / medium=non-IdP)
   * from KI `schema`-feature `identity_classification` instead of the hardcoded
   * `idpGate` / namespace allowlist / confidence rules in `user.ts`. Composes
   * with `useDiscoveredIndexSource` but is independent of it. Default `false`
   * keeps behavior byte-identical. Only affects the `user` engine; when enabled
   * but no source is classified, behavior stays rule-based for that run.
   */
  useDiscoveredConfidenceClassification: z.boolean().default(false),
  /**
   * Confidence floor (0–100) for the KI confidence-classification channel's
   * `schema`-feature query. Only effective while
   * `useDiscoveredConfidenceClassification` is on. Source discovery
   * (`useDiscoveredIndexSource`) reads deterministic `dataset_analysis`
   * features, which are always confidence 100 and do not consult this floor.
   */
  discoveredIndexSourceMinConfidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(LOG_EXTRACTION_DISCOVERED_SOURCE_MIN_CONFIDENCE_DEFAULT),
  fieldHistoryLength: z.number().int().default(10),
  lookbackPeriod: z
    .string()
    .regex(/[smdh]$/)
    .default(LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT),
  delay: z
    .string()
    .regex(/[smdh]$/)
    .default(LOG_EXTRACTION_DELAY_DEFAULT),
  docsLimit: z.number().int().min(1).default(LOG_EXTRACTION_DOCS_LIMIT_DEFAULT),
  maxLogsPerPage: z.number().int().min(1).default(LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT),
  timeout: z
    .string()
    .regex(/[smdh]$/)
    .default(LOG_EXTRACTION_TIMEOUT_DEFAULT),
  frequency: z
    .string()
    .regex(/[smdh]$/)
    .default(LOG_EXTRACTION_FREQUENCY_DEFAULT),
  maxTimeWindowSize: z
    .string()
    .regex(/[smdh]$/)
    .default(LOG_EXTRACTION_MAX_TIME_WINDOW_SIZE_DEFAULT),
  maxLogsPerWindow: z.number().int().min(0).default(LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT),
  maxLogsPerWindowCapBehavior: z
    .enum(['defer', 'drop'])
    .default(LOG_EXTRACTION_CAP_BEHAVIOR_DEFAULT),
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
