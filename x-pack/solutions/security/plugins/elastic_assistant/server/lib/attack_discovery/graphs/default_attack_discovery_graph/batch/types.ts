/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { Document } from '@langchain/core/documents';

export interface BatchProcessingConfig {
  /** Maximum number of alerts per batch sent to the LLM */
  batchSize: number;
  /** Maximum number of batches to process (0 = unlimited) */
  maxBatches: number;
  /** Maximum number of batches to run concurrently */
  concurrency: number;
}

export interface BatchResult {
  /** The batch index (0-based) */
  batchIndex: number;
  /** Attack discoveries generated from this batch */
  attackDiscoveries: AttackDiscovery[];
  /** Anonymized alerts included in this batch */
  anonymizedAlerts: Document[];
  /** Replacements accumulated during this batch */
  replacements: Replacements;
  /** Number of alerts in this batch */
  alertCount: number;
  /** Duration in ms for this batch */
  durationMs: number;
  /** Errors encountered during this batch (non-fatal) */
  errors: string[];
}

export interface MergeResult {
  /** Consolidated attack discoveries after hierarchical merge */
  attackDiscoveries: AttackDiscovery[];
  /** All anonymized alerts across all batches */
  anonymizedAlerts: Document[];
  /** Combined replacements from all batches */
  replacements: Replacements;
  /** Quality metrics for the merge operation */
  mergeMetrics: MergeQualityMetrics;
}

export interface MergeQualityMetrics {
  /** Total discoveries before merge */
  totalDiscoveriesBeforeMerge: number;
  /** Total discoveries after merge */
  totalDiscoveriesAfterMerge: number;
  /** Number of discoveries consolidated (merged together) */
  discoveriesConsolidated: number;
  /** Consolidation ratio (1.0 = no consolidation, 0.0 = all merged into one) */
  consolidationRatio: number;
  /** Total unique alert IDs before merge */
  totalUniqueAlertIdsBeforeMerge: number;
  /** Total unique alert IDs after merge */
  totalUniqueAlertIdsAfterMerge: number;
  /** Alert coverage (ratio of alert IDs preserved after merge) */
  alertCoverage: number;
  /** Number of batches processed */
  batchesProcessed: number;
  /** Number of batches that failed */
  batchesFailed: number;
  /** Total duration in ms */
  totalDurationMs: number;
  /** Duration of the merge pass in ms */
  mergeDurationMs: number;
}

export const DEFAULT_BATCH_SIZE = 50;
export const DEFAULT_MAX_BATCHES = 20;
export const DEFAULT_CONCURRENCY = 2;

/**
 * Known context window sizes for common LLM providers/models.
 * Used for adaptive batch sizing when connector metadata is unavailable.
 */
export const KNOWN_CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4': 8192,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'claude-3-opus': 200000,
  'claude-3-sonnet': 200000,
  'claude-3-haiku': 200000,
  'claude-3.5-sonnet': 200000,
  'claude-3.5-haiku': 200000,
  'claude-4-sonnet': 200000,
  'claude-opus-4': 200000,
  'bedrock-claude': 200000,
  'gemini-1.5-pro': 1000000,
  'gemini-1.5-flash': 1000000,
  'gemini-2.0-flash': 1000000,
};

/**
 * Approximate tokens per alert after anonymization.
 * This is a rough estimate used for batch size calculation.
 */
export const ESTIMATED_TOKENS_PER_ALERT = 800;

/**
 * Reserve tokens for the system prompt, format instructions, and output.
 * We leave a significant margin to avoid truncation.
 */
export const RESERVED_TOKEN_BUDGET = 8000;

/**
 * Target utilization of the context window (leave headroom for safety).
 */
export const CONTEXT_WINDOW_UTILIZATION = 0.7;
