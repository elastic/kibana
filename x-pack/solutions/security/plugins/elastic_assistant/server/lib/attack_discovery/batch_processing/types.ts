/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Configuration for batch processing
 */
export interface BatchProcessingConfig {
  /** Number of alerts per batch (default: 100) */
  batchSize: number;
  /** Maximum total alerts to process (0 = unlimited) */
  maxTotalAlerts: number;
  /** Number of batches to process in parallel */
  parallelBatches: number;
  /** Strategy for merging batch results */
  mergeStrategy: 'sequential' | 'hierarchical' | 'map_reduce';
  /** Enable alert deduplication before processing */
  deduplication: boolean;
  /** Preset for alert deduplication */
  deduplicationPreset?: 'malware' | 'processBased' | 'userFocused' | 'networkBased' | 'aggressive';
}

/**
 * Default batch processing configuration
 */
export const DEFAULT_BATCH_CONFIG: BatchProcessingConfig = {
  batchSize: 100,
  maxTotalAlerts: 0, // unlimited
  parallelBatches: 1,
  mergeStrategy: 'hierarchical',
  deduplication: true,
};

/**
 * Minimum batch size for processing
 */
export const MIN_BATCH_SIZE = 10;

/**
 * Maximum batch size for processing
 */
export const MAX_BATCH_SIZE = 100;

/**
 * Batch size reduction factor on context limit errors
 */
export const BATCH_SIZE_REDUCTION_FACTOR = 0.5;

/**
 * Result of a single batch processing
 */
export interface BatchResult {
  /** Batch index */
  batchIndex: number;
  /** Alerts processed in this batch */
  alertsProcessed: number;
  /** Attack discoveries from this batch */
  discoveries: AttackDiscoveryResult[];
  /** Processing duration in ms */
  durationMs: number;
  /** Any errors encountered */
  error?: string;
  /** Batch size used (may differ from config if reduced) */
  actualBatchSize: number;
}

/**
 * Attack discovery result structure
 */
export interface AttackDiscoveryResult {
  id: string;
  title: string;
  summaryMarkdown: string;
  detailsMarkdown: string;
  entitySummaryMarkdown?: string;
  alertIds: string[];
  mitreAttackTactics?: string[];
  riskScore?: number;
}

/**
 * Overall batch processing result
 */
export interface BatchProcessingResult {
  /** Total alerts processed */
  totalAlertsProcessed: number;
  /** Number of batches processed */
  batchesProcessed: number;
  /** Final merged discoveries */
  discoveries: AttackDiscoveryResult[];
  /** Individual batch results */
  batchResults: BatchResult[];
  /** Total duration in ms */
  totalDurationMs: number;
  /** Final batch size used (after any adaptive reductions) */
  effectiveBatchSize: number;
  /** Whether batch size was reduced due to context limits */
  batchSizeReduced: boolean;
  /** Merge operations performed */
  mergeOperations: number;
  /** Any errors */
  errors: string[];
}

/**
 * Context limit error identifier
 */
export const CONTEXT_LIMIT_ERROR_PATTERNS = [
  'context_length_exceeded',
  'maximum context length',
  'context window',
  'token limit',
  'max_tokens',
  'too many tokens',
  'input too long',
];

/**
 * Check if an error is a context limit error
 */
export function isContextLimitError(error: unknown): boolean {
  const errorMessage = String(error).toLowerCase();
  return CONTEXT_LIMIT_ERROR_PATTERNS.some((pattern) =>
    errorMessage.includes(pattern.toLowerCase())
  );
}
