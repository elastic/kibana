/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';

export interface ProcessBatchResult {
  /** Set to true to stop processing the remaining items. */
  stop: boolean;
}

export interface ProcessInHalvingBatchesArgs<TItem> {
  items: readonly TItem[];
  /** Number of items in the first batch, all items at once by default. */
  initialBatchSize?: number;
  /**
   * Processes one batch of items, typically by sending an Elasticsearch request for them.
   * `startIndex` is the position of the first batch item within `items` and `batchSize` is the current batch
   * size limit, the last batch can hold fewer items.
   */
  processBatch: (
    batch: TItem[],
    startIndex: number,
    batchSize: number
  ) => Promise<ProcessBatchResult>;
  /**
   * Returns the batch size to retry the failed batch with, or undefined when a smaller batch cannot work
   * around the error. Halves the batch on oversized Elasticsearch responses by default.
   */
  getReducedBatchSize?: (error: unknown, batchSize: number) => number | undefined;
  /** Invoked every time the batch size gets reduced. */
  onBatchSizeReduced: (args: { from: number; to: number; error: Error }) => void;
}

export const getBatchSizeReducedWarning = ({
  from,
  to,
  error,
}: {
  from: number;
  to: number;
  error: Error;
}): string =>
  `The new terms search response exceeded the "elasticsearch.maxResponseSize" limit, reducing the number of terms processed per request from ${from} to ${to} and retrying. Error: ${error.message}`;

/**
 * Returns the halved batch size when the response exceeded `elasticsearch.maxResponseSize` and the batch
 * still holds more than one item, otherwise undefined.
 */
export const halveBatchOnOversizedResponse = (
  error: unknown,
  batchSize: number
): number | undefined => {
  if (isMaximumResponseSizeExceededError(error) && batchSize > 1) {
    return Math.floor(batchSize / 2);
  }

  return undefined;
};

/**
 * Processes items in batches. When processing a batch fails with an error that `getReducedBatchSize` can work
 * around, the failed batch is retried with the reduced batch size starting from its first item, so items of
 * already processed batches are never processed again. Any other error is rethrown. The reduced batch size
 * is kept for the remaining items.
 */
export const processInHalvingBatches = async <TItem>({
  items,
  initialBatchSize = items.length,
  processBatch,
  getReducedBatchSize = halveBatchOnOversizedResponse,
  onBatchSizeReduced,
}: ProcessInHalvingBatchesArgs<TItem>): Promise<void> => {
  let batchSize = initialBatchSize;
  let processedCount = 0;

  while (processedCount < items.length) {
    const batch = items.slice(processedCount, processedCount + batchSize);

    try {
      const { stop } = await processBatch(batch, processedCount, batchSize);

      if (stop) {
        return;
      }

      processedCount += batch.length;
    } catch (error) {
      const reducedBatchSize = getReducedBatchSize(error, batch.length);

      if (reducedBatchSize == null || !(error instanceof Error)) {
        throw error;
      }

      onBatchSizeReduced({ from: batch.length, to: reducedBatchSize, error });
      batchSize = reducedBatchSize;
    }
  }
};
