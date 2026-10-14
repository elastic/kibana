/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
import { ProfilingSchema } from '@kbn/profiling-utils';
import type { ProfilingESClient } from '../utils/profiling_es_client';
import type { RegisterServicesParams } from './register_services';
import { registerServices } from './register_services';

describe('registerServices', () => {
  const esCallError = new Error('ES call failed');
  const esClient = {} as ElasticsearchClient;
  const abortSignal = new AbortController().signal;
  const core = {
    uiSettings: { client: { get: jest.fn().mockResolvedValue(0) } },
  } as unknown as CoreRequestHandlerContext;

  const profilingFlamegraph = jest.fn().mockRejectedValue(esCallError);
  const profilingStacktraces = jest.fn().mockRejectedValue(esCallError);
  const topNFunctions = jest.fn().mockRejectedValue(esCallError);

  const profilingEsClient = {
    profilingFlamegraph,
    profilingStacktraces,
    topNFunctions,
  } as unknown as ProfilingESClient;

  const createProfilingEsClient = jest.fn(() => profilingEsClient);

  const services = registerServices({
    createProfilingEsClient,
    logger: {} as RegisterServicesParams['logger'],
    buildFlavor: 'traditional',
    deps: {},
  });

  const commonParams = { core, esClient, query: {}, totalSeconds: 60 };

  // Each service is paired with the profiling ES client method it calls.
  const fetchServices: ReadonlyArray<
    [
      string,
      (params: { abortSignal?: AbortSignal; schema?: ProfilingSchema }) => Promise<unknown>,
      jest.Mock
    ]
  > = [
    [
      'fetchFlamechartData',
      (params) => services.fetchFlamechartData({ ...commonParams, ...params }),
      profilingFlamegraph,
    ],
    [
      'fetchFunctions',
      (params) =>
        services.fetchFunctions({ ...commonParams, startIndex: 0, endIndex: 10, ...params }),
      profilingStacktraces,
    ],
    [
      'fetchESFunctions',
      (params) => services.fetchESFunctions({ ...commonParams, ...params }),
      topNFunctions,
    ],
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each(fetchServices)('%s', (_name, callService, esClientMethod) => {
    it('passes the abort signal to the profiling ES client', async () => {
      await expect(callService({ abortSignal })).rejects.toBe(esCallError);

      expect(createProfilingEsClient).toHaveBeenCalledWith({ esClient, abortSignal });
    });

    it('creates the profiling ES client without a signal when none is provided', async () => {
      await expect(callService({})).rejects.toBe(esCallError);

      expect(createProfilingEsClient).toHaveBeenCalledWith({ esClient, abortSignal: undefined });
    });

    it.each(Object.values(ProfilingSchema))(
      'forwards the %s schema to the profiling ES client',
      async (schema) => {
        await expect(callService({ schema })).rejects.toBe(esCallError);

        expect(esClientMethod).toHaveBeenCalledWith(expect.objectContaining({ schema }));
      }
    );

    it('leaves the schema unset when none is provided', async () => {
      await expect(callService({})).rejects.toBe(esCallError);

      expect(esClientMethod).toHaveBeenCalledTimes(1);
      expect(esClientMethod.mock.calls[0][0].schema).toBeUndefined();
    });
  });
});
