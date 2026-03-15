/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Replacements } from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { Document } from '@langchain/core/documents';

import { getDefaultAttackDiscoveryGraph } from '..';
import type { AttackDiscoveryGraphState } from '../../../../langchain/graphs';
import { ATTACK_DISCOVERY_GRAPH_RUN_NAME } from '../constants';
import type { CombinedPrompts } from '../prompts';
import type { BatchProcessingConfig, BatchResult, MergeResult } from './types';
import { DEFAULT_CONCURRENCY, DEFAULT_MAX_BATCHES } from './types';
import { getAdaptiveBatchSize, splitIntoBatches } from './split';
import { mergeDiscoveries } from './merge';

export interface RunBatchedAttackDiscoveryParams {
  alertsIndexPattern?: string;
  anonymizationFields: AnonymizationFieldResponse[];
  anonymizedAlerts: Document[];
  batchConfig?: Partial<BatchProcessingConfig>;
  end?: string;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown>;
  llm: ActionsClientLlm;
  logger?: Logger;
  model?: string;
  onNewReplacements?: (replacements: Replacements) => void;
  prompts: CombinedPrompts;
  replacements?: Replacements;
  start?: string;
  tags?: string[];
  traceOptions?: { tracers: unknown[] };
}

/**
 * Orchestrates batched Attack Discovery processing:
 * 1. Determines adaptive batch size based on LLM model
 * 2. Splits pre-retrieved alerts into batches
 * 3. Runs the AD graph on each batch (with concurrency control)
 * 4. Merges results across batches using hierarchical LLM merge
 * 5. Returns consolidated discoveries with quality metrics
 */
export const runBatchedAttackDiscovery = async ({
  anonymizedAlerts,
  anonymizationFields,
  alertsIndexPattern,
  batchConfig,
  end,
  esClient,
  filter,
  llm,
  logger,
  model,
  onNewReplacements,
  prompts,
  replacements,
  start,
  tags,
  traceOptions,
}: RunBatchedAttackDiscoveryParams): Promise<MergeResult> => {
  const adaptiveBatchSize = getAdaptiveBatchSize({ model });

  const effectiveConfig: BatchProcessingConfig = {
    batchSize: batchConfig?.batchSize ?? adaptiveBatchSize,
    maxBatches: batchConfig?.maxBatches ?? DEFAULT_MAX_BATCHES,
    concurrency: batchConfig?.concurrency ?? DEFAULT_CONCURRENCY,
  };

  if (anonymizedAlerts.length <= effectiveConfig.batchSize) {
    logger?.debug(
      () =>
        `runBatchedAttackDiscovery: ${anonymizedAlerts.length} alerts fit in single batch (batchSize=${effectiveConfig.batchSize}), running without batching`
    );

    const singleResult = await runSingleBatch({
      alertsIndexPattern,
      anonymizationFields,
      anonymizedAlerts,
      batchIndex: 0,
      end,
      esClient,
      filter,
      llm,
      logger,
      onNewReplacements,
      prompts,
      replacements,
      start,
      tags,
      traceOptions,
    });

    return mergeDiscoveries({
      batchResults: [singleResult],
      llm,
      logger,
      prompts,
    });
  }

  const batches = splitIntoBatches(anonymizedAlerts, effectiveConfig.batchSize);

  const activeBatches =
    effectiveConfig.maxBatches > 0 ? batches.slice(0, effectiveConfig.maxBatches) : batches;

  logger?.info(
    `runBatchedAttackDiscovery: processing ${anonymizedAlerts.length} alerts in ${activeBatches.length} batches (batchSize=${effectiveConfig.batchSize}, concurrency=${effectiveConfig.concurrency})`
  );

  const batchResults = await runBatchesWithConcurrency({
    alertsIndexPattern,
    anonymizationFields,
    batches: activeBatches,
    concurrency: effectiveConfig.concurrency,
    end,
    esClient,
    filter,
    llm,
    logger,
    onNewReplacements,
    prompts,
    replacements,
    start,
    tags,
    traceOptions,
  });

  const successfulBatches = batchResults.filter((r) => r.attackDiscoveries.length > 0);
  logger?.info(
    `runBatchedAttackDiscovery: ${successfulBatches.length}/${batchResults.length} batches produced discoveries, starting merge pass`
  );

  return mergeDiscoveries({
    batchResults,
    llm,
    logger,
    prompts,
  });
};

const runBatchesWithConcurrency = async ({
  alertsIndexPattern,
  anonymizationFields,
  batches,
  concurrency,
  end,
  esClient,
  filter,
  llm,
  logger,
  onNewReplacements,
  prompts,
  replacements,
  start,
  tags,
  traceOptions,
}: {
  alertsIndexPattern?: string;
  anonymizationFields: AnonymizationFieldResponse[];
  batches: Document[][];
  concurrency: number;
  end?: string;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown>;
  llm: ActionsClientLlm;
  logger?: Logger;
  onNewReplacements?: (replacements: Replacements) => void;
  prompts: CombinedPrompts;
  replacements?: Replacements;
  start?: string;
  tags?: string[];
  traceOptions?: { tracers: unknown[] };
}): Promise<BatchResult[]> => {
  const results: BatchResult[] = [];

  for (let i = 0; i < batches.length; i += concurrency) {
    const chunk = batches.slice(i, i + concurrency);

    const chunkResults = await Promise.allSettled(
      chunk.map((batch, chunkIdx) =>
        runSingleBatch({
          alertsIndexPattern,
          anonymizationFields,
          anonymizedAlerts: batch,
          batchIndex: i + chunkIdx,
          end,
          esClient,
          filter,
          llm,
          logger,
          onNewReplacements,
          prompts,
          replacements,
          start,
          tags,
          traceOptions,
        })
      )
    );

    for (const [idx, result] of chunkResults.entries()) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        const batchIndex = i + idx;
        logger?.warn(
          `runBatchedAttackDiscovery: batch ${batchIndex} failed: ${
            result.reason?.message ?? result.reason
          }`
        );

        results.push({
          batchIndex,
          attackDiscoveries: [],
          anonymizedAlerts: chunk[idx],
          replacements: {},
          alertCount: chunk[idx].length,
          durationMs: 0,
          errors: [result.reason?.message ?? String(result.reason)],
        });
      }
    }
  }

  return results;
};

const runSingleBatch = async ({
  alertsIndexPattern,
  anonymizationFields,
  anonymizedAlerts,
  batchIndex,
  end,
  esClient,
  filter,
  llm,
  logger,
  onNewReplacements,
  prompts,
  replacements,
  start,
  tags,
  traceOptions,
}: {
  alertsIndexPattern?: string;
  anonymizationFields: AnonymizationFieldResponse[];
  anonymizedAlerts: Document[];
  batchIndex: number;
  end?: string;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown>;
  llm: ActionsClientLlm;
  logger?: Logger;
  onNewReplacements?: (replacements: Replacements) => void;
  prompts: CombinedPrompts;
  replacements?: Replacements;
  start?: string;
  tags?: string[];
  traceOptions?: { tracers: unknown[] };
}): Promise<BatchResult> => {
  const batchStart = Date.now();

  logger?.debug(
    () => `runSingleBatch: batch ${batchIndex} starting with ${anonymizedAlerts.length} alerts`
  );

  let batchReplacements: Replacements = { ...(replacements ?? {}) };
  const batchOnNewReplacements = (newReplacements: Replacements) => {
    batchReplacements = { ...batchReplacements, ...newReplacements };
    onNewReplacements?.(batchReplacements);
  };

  const graph = getDefaultAttackDiscoveryGraph({
    anonymizationFields,
    alertsIndexPattern,
    end,
    esClient,
    filter,
    llm,
    logger,
    onNewReplacements: batchOnNewReplacements,
    prompts,
    replacements: batchReplacements,
    size: anonymizedAlerts.length,
    start,
  });

  const result: AttackDiscoveryGraphState = await graph.invoke(
    {
      anonymizedDocuments: anonymizedAlerts,
    },
    {
      callbacks: [...((traceOptions?.tracers as never[]) ?? [])],
      runName: `${ATTACK_DISCOVERY_GRAPH_RUN_NAME} (batch ${batchIndex})`,
      tags: [...(tags ?? []), `batch-${batchIndex}`],
    }
  );

  const { insights: attackDiscoveries, errors, replacements: resultReplacements } = result;

  const durationMs = Date.now() - batchStart;

  logger?.debug(
    () =>
      `runSingleBatch: batch ${batchIndex} completed in ${durationMs}ms with ${
        attackDiscoveries?.length ?? 0
      } discoveries`
  );

  return {
    batchIndex,
    attackDiscoveries: attackDiscoveries ?? [],
    anonymizedAlerts,
    replacements: resultReplacements ?? batchReplacements,
    alertCount: anonymizedAlerts.length,
    durationMs,
    errors: errors ?? [],
  };
};
