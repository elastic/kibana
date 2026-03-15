/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';

import { getAdaptiveBatchSize, splitIntoBatches } from './split';
import { DEFAULT_BATCH_SIZE } from './types';

const makeAlertDoc = (id: string): Document => ({
  pageContent: `alert-${id}`,
  metadata: {},
});

describe('splitIntoBatches', () => {
  it('returns empty array for empty input', () => {
    expect(splitIntoBatches([], 10)).toEqual([]);
  });

  it('returns single batch when alerts fit within batch size', () => {
    const alerts = [makeAlertDoc('1'), makeAlertDoc('2'), makeAlertDoc('3')];
    const batches = splitIntoBatches(alerts, 10);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(3);
  });

  it('splits alerts into multiple batches of the correct size', () => {
    const alerts = Array.from({ length: 7 }, (_, i) => makeAlertDoc(String(i)));
    const batches = splitIntoBatches(alerts, 3);

    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(3);
    expect(batches[1]).toHaveLength(3);
    expect(batches[2]).toHaveLength(1);
  });

  it('handles exact division with no remainder', () => {
    const alerts = Array.from({ length: 6 }, (_, i) => makeAlertDoc(String(i)));
    const batches = splitIntoBatches(alerts, 3);

    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(3);
    expect(batches[1]).toHaveLength(3);
  });

  it('clamps batch size to minimum of 1', () => {
    const alerts = [makeAlertDoc('1'), makeAlertDoc('2')];
    const batches = splitIntoBatches(alerts, 0);

    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(1);
    expect(batches[1]).toHaveLength(1);
  });

  it('preserves alert order across batches', () => {
    const alerts = Array.from({ length: 5 }, (_, i) => makeAlertDoc(String(i)));
    const batches = splitIntoBatches(alerts, 2);

    const flattened = batches.flat();
    expect(flattened.map((d) => d.pageContent)).toEqual([
      'alert-0',
      'alert-1',
      'alert-2',
      'alert-3',
      'alert-4',
    ]);
  });
});

describe('getAdaptiveBatchSize', () => {
  it('returns default batch size when no model or context window is provided', () => {
    expect(getAdaptiveBatchSize({})).toBe(DEFAULT_BATCH_SIZE);
  });

  it('returns default batch size for unknown models', () => {
    expect(getAdaptiveBatchSize({ model: 'unknown-model-xyz' })).toBe(DEFAULT_BATCH_SIZE);
  });

  it('calculates batch size from explicit context window', () => {
    const result = getAdaptiveBatchSize({ contextWindowTokens: 128000 });

    expect(result).toBeGreaterThan(DEFAULT_BATCH_SIZE);
    expect(result).toBeLessThanOrEqual(500);
  });

  it('calculates larger batch size for models with larger context windows', () => {
    const smallWindow = getAdaptiveBatchSize({ contextWindowTokens: 8192 });
    const largeWindow = getAdaptiveBatchSize({ contextWindowTokens: 200000 });

    expect(largeWindow).toBeGreaterThan(smallWindow);
  });

  it('recognizes known model names', () => {
    const gpt4Result = getAdaptiveBatchSize({ model: 'gpt-4o' });

    expect(gpt4Result).toBeGreaterThan(DEFAULT_BATCH_SIZE);
  });

  it('performs partial matching on model names', () => {
    const result = getAdaptiveBatchSize({ model: 'anthropic.claude-3-sonnet-20240229-v1:0' });

    expect(result).toBeGreaterThan(DEFAULT_BATCH_SIZE);
  });

  it('returns default batch size when context window is too small', () => {
    const result = getAdaptiveBatchSize({ contextWindowTokens: 100 });

    expect(result).toBe(DEFAULT_BATCH_SIZE);
  });

  it('clamps to minimum of 10 for small but viable context windows', () => {
    const result = getAdaptiveBatchSize({ contextWindowTokens: 12000 });

    expect(result).toBe(10);
  });

  it('clamps to maximum of 500', () => {
    const result = getAdaptiveBatchSize({ contextWindowTokens: 10000000 });

    expect(result).toBe(500);
  });

  it('prefers explicit context window over model lookup', () => {
    const fromModel = getAdaptiveBatchSize({ model: 'gpt-4' });
    const fromExplicit = getAdaptiveBatchSize({
      model: 'gpt-4',
      contextWindowTokens: 1000000,
    });

    expect(fromExplicit).toBeGreaterThan(fromModel);
  });
});
