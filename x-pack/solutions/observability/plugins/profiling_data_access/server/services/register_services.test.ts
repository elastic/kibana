/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext, ElasticsearchClient } from '@kbn/core/server';
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

  const profilingEsClient = {
    profilingFlamegraph: jest.fn().mockRejectedValue(esCallError),
    profilingStacktraces: jest.fn().mockRejectedValue(esCallError),
    topNFunctions: jest.fn().mockRejectedValue(esCallError),
  } as unknown as ProfilingESClient;

  const createProfilingEsClient = jest.fn(() => profilingEsClient);

  const services = registerServices({
    createProfilingEsClient,
    logger: {} as RegisterServicesParams['logger'],
    buildFlavor: 'traditional',
    deps: {},
  });

  const commonParams = { core, esClient, query: {}, totalSeconds: 60 };

  const fetchServices: ReadonlyArray<
    [string, (params: { abortSignal?: AbortSignal }) => Promise<unknown>]
  > = [
    [
      'fetchFlamechartData',
      (params) => services.fetchFlamechartData({ ...commonParams, ...params }),
    ],
    [
      'fetchFunctions',
      (params) =>
        services.fetchFunctions({ ...commonParams, startIndex: 0, endIndex: 10, ...params }),
    ],
    ['fetchESFunctions', (params) => services.fetchESFunctions({ ...commonParams, ...params })],
  ];

  beforeEach(() => {
    createProfilingEsClient.mockClear();
  });

  describe.each(fetchServices)('%s', (_name, callService) => {
    it('passes the abort signal to the profiling ES client', async () => {
      await expect(callService({ abortSignal })).rejects.toBe(esCallError);

      expect(createProfilingEsClient).toHaveBeenCalledWith({ esClient, abortSignal });
    });

    it('creates the profiling ES client without a signal when none is provided', async () => {
      await expect(callService({})).rejects.toBe(esCallError);

      expect(createProfilingEsClient).toHaveBeenCalledWith({ esClient, abortSignal: undefined });
    });
  });
});
