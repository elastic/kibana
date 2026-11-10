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
  [
    'sampleStacktraceIds',
    (client) =>
      client.sampleStacktraceIds({
        query: {},
        indices: ['test'],
        stacktraceIdsField: 'test',
        probability: 1,
        seed: 1,
        preference: '1',
        size: 1,
      }),
  ],
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

  describe('sampleStacktraceIds', () => {
    const sampleParams = {
      query: { term: { 'service.name': 'my-service' } },
      indices: ['traces-apm*', 'apm-*'],
      stacktraceIdsField: 'transaction.profiler_stack_trace_ids',
      probability: 0.25,
      seed: 42,
      preference: '42',
      size: 10,
    };

    it('collects the stacktrace IDs of a random sample of the documents', async () => {
      const request = jest.fn().mockResolvedValue({ body: {} });
      const esClient = { transport: { request } } as unknown as ElasticsearchClient;

      await createProfilingEsClient({ esClient }).sampleStacktraceIds(sampleParams);

      expect(request).toHaveBeenCalledWith(
        {
          method: 'POST',
          path: '/traces-apm*,apm-*/_search',
          querystring: { preference: '42', request_cache: true },
          body: {
            size: 0,
            track_total_hits: false,
            query: sampleParams.query,
            aggs: {
              sample: {
                random_sampler: { probability: 0.25, seed: 42 },
                aggs: {
                  stacktraceIds: {
                    counted_terms: { field: 'transaction.profiler_stack_trace_ids', size: 10 },
                  },
                },
              },
            },
          },
        },
        expect.anything()
      );
    });

    it('returns the collected stacktrace IDs', async () => {
      const buckets = [
        { key: 'stacktrace-id-1', doc_count: 3 },
        { key: 'stacktrace-id-2', doc_count: 1 },
      ];
      const request = jest
        .fn()
        .mockResolvedValue({ body: { aggregations: { sample: { stacktraceIds: { buckets } } } } });
      const esClient = { transport: { request } } as unknown as ElasticsearchClient;

      await expect(
        createProfilingEsClient({ esClient }).sampleStacktraceIds(sampleParams)
      ).resolves.toEqual(['stacktrace-id-1', 'stacktrace-id-2']);
    });
  });
});
