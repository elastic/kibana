/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';

import {
  CONTEXT_WINDOW_UTILIZATION,
  DEFAULT_BATCH_SIZE,
  ESTIMATED_TOKENS_PER_ALERT,
  KNOWN_CONTEXT_WINDOWS,
  RESERVED_TOKEN_BUDGET,
} from './types';

/**
 * Calculates the optimal batch size based on the LLM connector's context window.
 *
 * The calculation:
 * 1. Determine available tokens = (contextWindow * utilization) - reservedBudget
 * 2. Divide by estimated tokens per alert to get max alerts per batch
 * 3. Clamp to reasonable min/max bounds
 */
export const getAdaptiveBatchSize = ({
  model,
  contextWindowTokens,
}: {
  model?: string;
  contextWindowTokens?: number;
}): number => {
  const contextWindow = contextWindowTokens ?? getContextWindowForModel(model);

  if (contextWindow == null) {
    return DEFAULT_BATCH_SIZE;
  }

  const availableTokens = contextWindow * CONTEXT_WINDOW_UTILIZATION - RESERVED_TOKEN_BUDGET;

  if (availableTokens <= 0) {
    return DEFAULT_BATCH_SIZE;
  }

  const calculatedSize = Math.floor(availableTokens / ESTIMATED_TOKENS_PER_ALERT);

  return Math.max(10, Math.min(calculatedSize, 500));
};

/**
 * Looks up the known context window size for a model string.
 * Performs partial matching to handle model version suffixes.
 */
const getContextWindowForModel = (model?: string): number | undefined => {
  if (model == null) {
    return undefined;
  }

  const normalizedModel = model.toLowerCase();

  const exactMatch = KNOWN_CONTEXT_WINDOWS[normalizedModel];
  if (exactMatch != null) {
    return exactMatch;
  }

  for (const [knownModel, contextWindow] of Object.entries(KNOWN_CONTEXT_WINDOWS)) {
    if (normalizedModel.includes(knownModel)) {
      return contextWindow;
    }
  }

  return undefined;
};

/**
 * Splits an array of anonymized alert documents into batches of the specified size.
 */
export const splitIntoBatches = (alerts: Document[], batchSize: number): Document[][] => {
  if (alerts.length === 0) {
    return [];
  }

  const effectiveBatchSize = Math.max(1, batchSize);
  const batches: Document[][] = [];

  for (let i = 0; i < alerts.length; i += effectiveBatchSize) {
    batches.push(alerts.slice(i, i + effectiveBatchSize));
  }

  return batches;
};
