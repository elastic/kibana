/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSchema } from '@kbn/profiling-utils';
import { getRoutePaths } from '../common';
import type { AutoAbortedHttpService } from './hooks/use_auto_aborted_http_client';
import { getServices } from './services';

jest.mock('@kbn/profiling-utils', () => ({
  ...jest.requireActual('@kbn/profiling-utils'),
  createFlameGraph: jest.fn(),
}));

describe('getServices', () => {
  const paths = getRoutePaths();
  const timeRange = { timeFrom: 1_700_000_000_000, timeTo: 1_700_000_900_000 };

  const get = jest.fn().mockResolvedValue({});
  const http = { get } as unknown as AutoAbortedHttpService;
  const services = getServices();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Each service is paired with the route it requests.
  const schemaServices: ReadonlyArray<
    [string, (schema?: ProfilingSchema) => Promise<unknown>, string]
  > = [
    [
      'fetchElasticFlamechart',
      (schema) =>
        services.fetchElasticFlamechart({
          http,
          ...timeRange,
          kuery: '',
          showErrorFrames: false,
          schema,
        }),
      paths.Flamechart,
    ],
    [
      'fetchTopNFunctions',
      (schema) =>
        services.fetchTopNFunctions({
          http,
          ...timeRange,
          startIndex: 0,
          endIndex: 10,
          kuery: '',
          schema,
        }),
      paths.TopNFunctions,
    ],
    [
      'fetchTopNFunctionAPMTransactions',
      (schema) =>
        services.fetchTopNFunctionAPMTransactions({
          http,
          ...timeRange,
          functionName: 'main',
          serviceNames: ['my-service'],
          schema,
        }),
      paths.APMTransactions,
    ],
  ];

  describe.each(schemaServices)('%s', (_name, callService, path) => {
    it.each(Object.values(ProfilingSchema))('requests data in the %s schema', async (schema) => {
      await callService(schema);

      expect(get).toHaveBeenCalledWith(path, {
        query: expect.objectContaining({ schema }),
      });
    });

    it('leaves the schema unset when none is given', async () => {
      await callService();

      expect(get.mock.calls[0][1].query.schema).toBeUndefined();
    });
  });

  it('fetchAvailableSchemas requests the schemas with data for the time range and query', async () => {
    get.mockResolvedValueOnce({ schemas: [ProfilingSchema.OTEL] });

    await expect(
      services.fetchAvailableSchemas({ http, ...timeRange, kuery: 'host.name:my-host' })
    ).resolves.toEqual({ schemas: [ProfilingSchema.OTEL] });

    expect(get).toHaveBeenCalledWith(paths.Schemas, {
      query: { ...timeRange, kuery: 'host.name:my-host' },
    });
  });
});
