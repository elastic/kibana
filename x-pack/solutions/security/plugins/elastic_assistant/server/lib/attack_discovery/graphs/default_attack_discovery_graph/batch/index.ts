/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { runBatchedAttackDiscovery } from './orchestrator';
export type { RunBatchedAttackDiscoveryParams } from './orchestrator';
export { mergeDiscoveries } from './merge';
export type { MergeDiscoveriesParams } from './merge';
export { getAdaptiveBatchSize, splitIntoBatches } from './split';
export type { BatchProcessingConfig, BatchResult, MergeQualityMetrics, MergeResult } from './types';
export { DEFAULT_BATCH_SIZE, DEFAULT_CONCURRENCY, DEFAULT_MAX_BATCHES } from './types';
