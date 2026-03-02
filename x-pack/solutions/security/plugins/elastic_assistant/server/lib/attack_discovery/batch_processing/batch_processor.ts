/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';

import {
  type BatchProcessingConfig,
  type BatchResult,
  type BatchProcessingResult,
  type AttackDiscoveryResult,
  DEFAULT_BATCH_CONFIG,
  MIN_BATCH_SIZE,
  MAX_BATCH_SIZE,
  BATCH_SIZE_REDUCTION_FACTOR,
  isContextLimitError,
} from './types';

/**
 * Alert document for processing
 */
export interface AlertForProcessing {
  id: string;
  content: string; // Anonymized alert content
}

/**
 * Function type for processing a single batch
 */
export type BatchProcessorFn = (
  alerts: AlertForProcessing[],
  batchIndex: number
) => Promise<AttackDiscoveryResult[]>;

/**
 * Function type for merging two discovery results
 */
export type MergeDiscoveriesFn = (
  discoveriesA: AttackDiscoveryResult[],
  discoveriesB: AttackDiscoveryResult[]
) => Promise<AttackDiscoveryResult[]>;

/**
 * Function type for caching batch size
 */
export type CacheBatchSizeFn = (connectorId: string, batchSize: number) => Promise<void>;

/**
 * Function type for getting cached batch size
 */
export type GetCachedBatchSizeFn = (connectorId: string) => Promise<number | null>;

/**
 * Service for processing alerts in batches with adaptive sizing
 */
export class BatchProcessor {
  private readonly logger: Logger;
  private readonly config: BatchProcessingConfig;
  private readonly processBatch: BatchProcessorFn;
  private readonly mergeDiscoveries: MergeDiscoveriesFn;
  private readonly cacheBatchSize?: CacheBatchSizeFn;
  private readonly getCachedBatchSize?: GetCachedBatchSizeFn;
  private readonly connectorId?: string;

  private currentBatchSize: number;
  private batchSizeReduced = false;

  constructor({
    logger,
    config,
    processBatch,
    mergeDiscoveries,
    cacheBatchSize,
    getCachedBatchSize,
    connectorId,
  }: {
    logger: Logger;
    config?: Partial<BatchProcessingConfig>;
    processBatch: BatchProcessorFn;
    mergeDiscoveries: MergeDiscoveriesFn;
    cacheBatchSize?: CacheBatchSizeFn;
    getCachedBatchSize?: GetCachedBatchSizeFn;
    connectorId?: string;
  }) {
    this.logger = logger;
    this.config = {
      ...DEFAULT_BATCH_CONFIG,
      ...config,
      batchSize: Math.min(
        Math.max(config?.batchSize ?? DEFAULT_BATCH_CONFIG.batchSize, MIN_BATCH_SIZE),
        MAX_BATCH_SIZE
      ),
    };
    this.processBatch = processBatch;
    this.mergeDiscoveries = mergeDiscoveries;
    this.cacheBatchSize = cacheBatchSize;
    this.getCachedBatchSize = getCachedBatchSize;
    this.connectorId = connectorId;
    this.currentBatchSize = this.config.batchSize;
  }

  /**
   * Process alerts in batches
   */
  async process(alerts: AlertForProcessing[]): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const batchResults: BatchResult[] = [];

    // Try to get cached batch size for this connector
    if (this.getCachedBatchSize && this.connectorId) {
      const cachedSize = await this.getCachedBatchSize(this.connectorId);
      if (cachedSize && cachedSize < this.currentBatchSize) {
        this.logger.info(`Using cached batch size ${cachedSize} for connector ${this.connectorId}`);
        this.currentBatchSize = cachedSize;
      }
    }

    // Limit total alerts if configured
    let alertsToProcess = alerts;
    if (this.config.maxTotalAlerts > 0 && alerts.length > this.config.maxTotalAlerts) {
      this.logger.info(`Limiting alerts from ${alerts.length} to ${this.config.maxTotalAlerts}`);
      alertsToProcess = alerts.slice(0, this.config.maxTotalAlerts);
    }

    // Split into batches
    const batches = this.splitIntoBatches(alertsToProcess);
    this.logger.info(
      `Processing ${alertsToProcess.length} alerts in ${batches.length} batches (batch size: ${this.currentBatchSize})`
    );

    // Process batches based on strategy
    let allDiscoveries: AttackDiscoveryResult[] = [];

    if (this.config.parallelBatches > 1 && batches.length > 1) {
      // Parallel processing
      allDiscoveries = await this.processParallel(batches, batchResults, errors);
    } else {
      // Sequential processing
      allDiscoveries = await this.processSequential(batches, batchResults, errors);
    }

    // Merge based on strategy
    let mergeOperations = 0;
    let finalDiscoveries = allDiscoveries;

    if (batchResults.length > 1 && this.config.mergeStrategy !== 'sequential') {
      const { discoveries, operations } = await this.mergeBatchResults(batchResults);
      finalDiscoveries = discoveries;
      mergeOperations = operations;
    }

    // Cache successful batch size
    if (this.cacheBatchSize && this.connectorId && batchResults.some((b) => !b.error)) {
      await this.cacheBatchSize(this.connectorId, this.currentBatchSize);
    }

    const totalDurationMs = Date.now() - startTime;

    return {
      totalAlertsProcessed: batchResults.reduce((sum, b) => sum + b.alertsProcessed, 0),
      batchesProcessed: batchResults.length,
      discoveries: finalDiscoveries,
      batchResults,
      totalDurationMs,
      effectiveBatchSize: this.currentBatchSize,
      batchSizeReduced: this.batchSizeReduced,
      mergeOperations,
      errors,
    };
  }

  /**
   * Split alerts into batches
   */
  private splitIntoBatches(alerts: AlertForProcessing[]): AlertForProcessing[][] {
    const batches: AlertForProcessing[][] = [];
    for (let i = 0; i < alerts.length; i += this.currentBatchSize) {
      batches.push(alerts.slice(i, i + this.currentBatchSize));
    }
    return batches;
  }

  /**
   * Process batches sequentially
   */
  private async processSequential(
    batches: AlertForProcessing[][],
    batchResults: BatchResult[],
    errors: string[]
  ): Promise<AttackDiscoveryResult[]> {
    const allDiscoveries: AttackDiscoveryResult[] = [];

    for (let i = 0; i < batches.length; i++) {
      const result = await this.processSingleBatch(batches[i], i);
      batchResults.push(result);

      if (result.error) {
        errors.push(`Batch ${i}: ${result.error}`);
      } else {
        allDiscoveries.push(...result.discoveries);
      }
    }

    return allDiscoveries;
  }

  /**
   * Process batches in parallel
   */
  private async processParallel(
    batches: AlertForProcessing[][],
    batchResults: BatchResult[],
    errors: string[]
  ): Promise<AttackDiscoveryResult[]> {
    const allDiscoveries: AttackDiscoveryResult[] = [];
    const parallelBatches = this.config.parallelBatches;

    // Process in chunks of parallelBatches
    for (let i = 0; i < batches.length; i += parallelBatches) {
      const chunk = batches.slice(i, i + parallelBatches);
      const promises = chunk.map((batch, idx) => this.processSingleBatch(batch, i + idx));
      const results = await Promise.all(promises);

      for (const result of results) {
        batchResults.push(result);
        if (result.error) {
          errors.push(`Batch ${result.batchIndex}: ${result.error}`);
        } else {
          allDiscoveries.push(...result.discoveries);
        }
      }
    }

    return allDiscoveries;
  }

  /**
   * Process a single batch with retry on context limit errors
   */
  private async processSingleBatch(
    alerts: AlertForProcessing[],
    batchIndex: number
  ): Promise<BatchResult> {
    const startTime = Date.now();
    let currentAlerts = alerts;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      try {
        const discoveries = await this.processBatch(currentAlerts, batchIndex);

        return {
          batchIndex,
          alertsProcessed: currentAlerts.length,
          discoveries,
          durationMs: Date.now() - startTime,
          actualBatchSize: currentAlerts.length,
        };
      } catch (error) {
        if (isContextLimitError(error) && this.currentBatchSize > MIN_BATCH_SIZE) {
          // Reduce batch size
          const newBatchSize = Math.max(
            MIN_BATCH_SIZE,
            Math.floor(this.currentBatchSize * BATCH_SIZE_REDUCTION_FACTOR)
          );

          this.logger.warn(
            `Context limit error in batch ${batchIndex}, reducing batch size from ${this.currentBatchSize} to ${newBatchSize}`
          );

          this.currentBatchSize = newBatchSize;
          this.batchSizeReduced = true;

          // Re-split the current batch
          currentAlerts = alerts.slice(0, newBatchSize);
          retryCount++;
        } else {
          // Non-recoverable error
          return {
            batchIndex,
            alertsProcessed: 0,
            discoveries: [],
            durationMs: Date.now() - startTime,
            actualBatchSize: currentAlerts.length,
            error: String(error),
          };
        }
      }
    }

    // Max retries exceeded
    return {
      batchIndex,
      alertsProcessed: 0,
      discoveries: [],
      durationMs: Date.now() - startTime,
      actualBatchSize: currentAlerts.length,
      error: `Max retries (${maxRetries}) exceeded after batch size reductions`,
    };
  }

  /**
   * Merge batch results based on strategy
   */
  private async mergeBatchResults(
    batchResults: BatchResult[]
  ): Promise<{ discoveries: AttackDiscoveryResult[]; operations: number }> {
    const successfulResults = batchResults.filter((r) => !r.error && r.discoveries.length > 0);

    if (successfulResults.length === 0) {
      return { discoveries: [], operations: 0 };
    }

    if (successfulResults.length === 1) {
      return { discoveries: successfulResults[0].discoveries, operations: 0 };
    }

    switch (this.config.mergeStrategy) {
      case 'hierarchical':
        return this.hierarchicalMerge(successfulResults.map((r) => r.discoveries));

      case 'map_reduce':
        // For map_reduce, we still use hierarchical merge but could add a final summarization pass
        return this.hierarchicalMerge(successfulResults.map((r) => r.discoveries));

      case 'sequential':
      default:
        // Sequential just concatenates, no actual merge
        return {
          discoveries: successfulResults.flatMap((r) => r.discoveries),
          operations: 0,
        };
    }
  }

  /**
   * Hierarchical merge of discovery results
   * Merges pairs, then pairs of results, etc.
   */
  private async hierarchicalMerge(
    discoveryGroups: AttackDiscoveryResult[][]
  ): Promise<{ discoveries: AttackDiscoveryResult[]; operations: number }> {
    let currentGroups = discoveryGroups;
    let totalOperations = 0;

    while (currentGroups.length > 1) {
      const nextGroups: AttackDiscoveryResult[][] = [];

      for (let i = 0; i < currentGroups.length; i += 2) {
        if (i + 1 < currentGroups.length) {
          // Merge pair
          try {
            const merged = await this.mergeDiscoveries(currentGroups[i], currentGroups[i + 1]);
            nextGroups.push(merged);
            totalOperations++;
          } catch (error) {
            this.logger.error(`Merge operation failed: ${error}`);
            // On merge failure, just concatenate
            nextGroups.push([...currentGroups[i], ...currentGroups[i + 1]]);
          }
        } else {
          // Odd one out, carry forward
          nextGroups.push(currentGroups[i]);
        }
      }

      currentGroups = nextGroups;
    }

    return {
      discoveries: currentGroups[0] ?? [],
      operations: totalOperations,
    };
  }
}
