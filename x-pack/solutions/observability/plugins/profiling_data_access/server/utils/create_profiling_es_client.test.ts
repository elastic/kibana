/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createProfilingEsClient } from './create_profiling_es_client';
import type { ProfilingESClient } from './profiling_es_client';

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// Every ES call captures its abort signal and stays pending until resolved or aborted.
const createEsClientMock = () => {
  const signals: Array<AbortSignal | undefined> = [];
  const resolvers: Array<() => void> = [];

  const handleEsCall = jest.fn(
    (_params: object, { signal }: { signal?: AbortSignal }) =>
      new Promise((resolve, reject) => {
        signals.push(signal);
        resolvers.push(() => resolve({ body: {} }));
        signal?.addEventListener('abort', () => reject(new Error('Request aborted')));
      })
  );

  const esClient = {
    search: handleEsCall,
    transport: { request: handleEsCall },
  } as unknown as ElasticsearchClient;

  return {
    esClient,
    getSignal: () => signals[signals.length - 1],
    resolveAll: () => resolvers.forEach((resolve) => resolve()),
  };
};

const methods: ReadonlyArray<[string, (client: ProfilingESClient) => Promise<unknown>]> = [
  ['search', (client) => client.search('test_search', { index: 'test' })],
  [
    'profilingStacktraces',
    (client) => client.profilingStacktraces({ query: {}, sampleSize: 1, durationSeconds: 1 }),
  ],
  [
    'profilingFlamegraph',
    (client) => client.profilingFlamegraph({ query: {}, sampleSize: 1, durationSeconds: 1 }),
  ],
  ['topNFunctions', (client) => client.topNFunctions({ query: {}, durationSeconds: 1 })],
  ['universalProfiling.status', (client) => client.universalProfiling.status()],
];

describe('createProfilingEsClient', () => {
  describe.each(methods)('%s', (_name, callMethod) => {
    it('aborts the ES call when the abort signal fires', async () => {
      const controller = new AbortController();
      const { esClient, getSignal } = createEsClientMock();

      const promise = callMethod(
        createProfilingEsClient({ esClient, abortSignal: controller.signal })
      );
      await flushPromises();

      controller.abort();

      expect(getSignal()?.aborted).toBe(true);
      await expect(promise).rejects.toThrow();
    });

    it('does not pass a signal to the ES call when none is provided', async () => {
      const { esClient, getSignal, resolveAll } = createEsClientMock();

      const promise = callMethod(createProfilingEsClient({ esClient }));
      await flushPromises();
      resolveAll();

      await expect(promise).resolves.toBeDefined();
      expect(getSignal()).toBeUndefined();
    });
  });
});
