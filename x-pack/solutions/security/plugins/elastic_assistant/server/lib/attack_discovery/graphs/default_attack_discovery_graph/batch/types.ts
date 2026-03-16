/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import type { Document } from '@langchain/core/documents';

export interface BatchProcessingConfig {
  batchSize: number;
  maxBatches: number;
  concurrency: number;
}

export interface BatchResult {
  batchIndex: number;
  attackDiscoveries: AttackDiscovery[];
  anonymizedAlerts: Document[];
  replacements: Replacements;
  alertCount: number;
  durationMs: number;
  errors: string[];
}

export interface MergeResult {
  attackDiscoveries: AttackDiscovery[];
  anonymizedAlerts: Document[];
  replacements: Replacements;
  mergeMetrics: MergeQualityMetrics;
}

export interface MergeQualityMetrics {
  totalDiscoveriesBeforeMerge: number;
  totalDiscoveriesAfterMerge: number;
  discoveriesConsolidated: number;
  consolidationRatio: number;
  totalUniqueAlertIdsBeforeMerge: number;
  totalUniqueAlertIdsAfterMerge: number;
  alertCoverage: number;
  batchesProcessed: number;
  batchesFailed: number;
  totalDurationMs: number;
  mergeDurationMs: number;
}

export const DEFAULT_BATCH_SIZE = 50;
export const DEFAULT_MAX_BATCHES = 20;
export const DEFAULT_CONCURRENCY = 2;

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

export const ESTIMATED_TOKENS_PER_ALERT = 800;
export const RESERVED_TOKEN_BUDGET = 8000;
export const CONTEXT_WINDOW_UTILIZATION = 0.7;
