/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ProfilingSchema } from '@kbn/profiling-utils';
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
    getRequestParams: () => handleEsCall.mock.calls[handleEsCall.mock.calls.length - 1][0],
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

const schemaMethods: ReadonlyArray<
  [string, (client: ProfilingESClient, schema?: ProfilingSchema) => Promise<unknown>]
> = [
  [
    'profilingStacktraces',
    (client, schema) =>
      client.profilingStacktraces({ query: {}, sampleSize: 1, durationSeconds: 1, schema }),
  ],
  [
    'profilingFlamegraph',
    (client, schema) =>
      client.profilingFlamegraph({ query: {}, sampleSize: 1, durationSeconds: 1, schema }),
  ],
  [
    'topNFunctions',
    (client, schema) => client.topNFunctions({ query: {}, durationSeconds: 1, schema }),
  ],
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

  describe.each(schemaMethods)('%s schema', (_name, callMethod) => {
    it.each([
      [ProfilingSchema.ECS, 'ecs'],
      [ProfilingSchema.OTEL, 'otel'],
    ])('sends the %s schema in the request body', async (schema, expectedSchema) => {
      const { esClient, getRequestParams, resolveAll } = createEsClientMock();

      const promise = callMethod(createProfilingEsClient({ esClient }), schema);
      await flushPromises();
      resolveAll();
      await promise;

      expect(getRequestParams()).toEqual(
        expect.objectContaining({ body: expect.objectContaining({ schema: expectedSchema }) })
      );
    });

    it('does not send a schema when none is provided', async () => {
      const { esClient, getRequestParams, resolveAll } = createEsClientMock();

      const promise = callMethod(createProfilingEsClient({ esClient }));
      await flushPromises();
      resolveAll();
      await promise;

      // Serialise the request like the ES client does, which drops `undefined` body values.
      expect(JSON.parse(JSON.stringify(getRequestParams()))).not.toHaveProperty('body.schema');
    });
  });
});
