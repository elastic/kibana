/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsSourceGeneration } from '../../common/analytics';
import type { GenerationCacheKeyParts } from './analytics_generation_cache';
import { createGenerationCache, getGenerationCacheKey } from './analytics_generation_cache';

const KEY_PARTS: GenerationCacheKeyParts = {
  userId: 'u_1',
  source: 'app-events',
  mappingHash: 'abc',
  timeField: '@timestamp',
  useCaseId: 'gaming',
  schemaOnly: false,
  connectorId: 'model-a',
  locale: 'en',
};

const createAnswer = (
  overrides: Partial<AnalyticsSourceGeneration> = {}
): AnalyticsSourceGeneration => ({
  source: 'app-events',
  summary: 'Events.',
  queries: [{ id: 'generated_1', question: 'How many?', esql: 'FROM app-events | LIMIT 1' }],
  panels: null,
  model: 'model-a',
  schemaOnly: false,
  cached: false,
  generatedAt: 1,
  stats: {
    latencyMs: 1,
    modelCalls: 1,
    inputTokens: 1,
    outputTokens: 1,
    queries: { proposed: 1, validFirstTime: 1, validAfterRepair: 0, dropped: 0 },
    panels: { proposed: 0, validFirstTime: 0, validAfterRepair: 0, dropped: 0 },
  },
  ...overrides,
});

describe('getGenerationCacheKey', () => {
  it('is stable for the same request', () => {
    expect(getGenerationCacheKey(KEY_PARTS)).toBe(getGenerationCacheKey({ ...KEY_PARTS }));
  });

  it.each<[string, Partial<GenerationCacheKeyParts>]>([
    ['user', { userId: 'u_2' }],
    ['source', { source: 'other-events' }],
    ['mapping', { mappingHash: 'def' }],
    ['time field', { timeField: 'created_at' }],
    ['use case', { useCaseId: undefined }],
    ['privacy mode', { schemaOnly: true }],
    ['model', { connectorId: 'model-b' }],
    ['locale', { locale: 'fr' }],
  ])('differs when the %s differs', (_, change) => {
    expect(getGenerationCacheKey({ ...KEY_PARTS, ...change })).not.toBe(
      getGenerationCacheKey(KEY_PARTS)
    );
  });
});

describe('createGenerationCache', () => {
  it('keeps an answer and marks it as kept when served again', async () => {
    const cache = createGenerationCache();
    const generate = jest.fn().mockResolvedValue(createAnswer());

    await expect(cache.getOrGenerate('key', generate)).resolves.toMatchObject({ cached: false });
    await expect(cache.getOrGenerate('key', generate)).resolves.toMatchObject({ cached: true });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('never serves one key the answer of another', async () => {
    const cache = createGenerationCache();
    await cache.getOrGenerate('user-1', async () => createAnswer({ summary: 'first' }));

    await expect(
      cache.getOrGenerate('user-2', async () => createAnswer({ summary: 'second' }))
    ).resolves.toMatchObject({ summary: 'second', cached: false });
  });

  it('generates again when asked to refresh, and keeps the new answer', async () => {
    const cache = createGenerationCache();
    await cache.getOrGenerate('key', async () => createAnswer({ generatedAt: 1 }));

    await expect(
      cache.getOrGenerate('key', async () => createAnswer({ generatedAt: 2 }), { refresh: true })
    ).resolves.toMatchObject({ generatedAt: 2, cached: false });
    await expect(cache.getOrGenerate('key', jest.fn())).resolves.toMatchObject({
      generatedAt: 2,
      cached: true,
    });
  });

  it('shares one generation between simultaneous requests for the same key', async () => {
    const cache = createGenerationCache();
    const generate = jest.fn().mockResolvedValue(createAnswer());

    await Promise.all([cache.getOrGenerate('key', generate), cache.getOrGenerate('key', generate)]);

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('keeps neither a failure nor an answer with nothing usable', async () => {
    const cache = createGenerationCache();
    await expect(
      cache.getOrGenerate('key', async () => {
        throw new Error('model down');
      })
    ).rejects.toThrow('model down');
    await cache.getOrGenerate('key', async () => createAnswer({ queries: null, panels: null }));
    const generate = jest.fn().mockResolvedValue(createAnswer());

    await cache.getOrGenerate('key', generate);

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('forgets answers after the time to live and beyond the size bound', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    try {
      const cache = createGenerationCache({ maxEntries: 1, ttlMs: 1000 });
      await cache.getOrGenerate('a', async () => createAnswer());
      await cache.getOrGenerate('b', async () => createAnswer());
      const generateA = jest.fn().mockResolvedValue(createAnswer());
      await cache.getOrGenerate('a', generateA);
      expect(generateA).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }

    const cache = createGenerationCache({ ttlMs: 20 });
    await cache.getOrGenerate('a', async () => createAnswer());
    await new Promise((resolve) => setTimeout(resolve, 60));
    const generate = jest.fn().mockResolvedValue(createAnswer());
    await cache.getOrGenerate('a', generate);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});
