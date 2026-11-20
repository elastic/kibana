/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { PROFILING_EVENTS_INDEX_BY_SCHEMA, ProfilingSchema } from '@kbn/profiling-utils';
import type { RegisterServicesParams } from '../register_services';
import { createGetAvailableSchemasService } from '.';

describe('createGetAvailableSchemasService', () => {
  const esClient = {} as ElasticsearchClient;
  const abortSignal = new AbortController().signal;
  const query = { bool: { filter: [{ term: { 'host.name': 'my-host' } }] } };

  const search = jest.fn();
  const createProfilingEsClient = jest.fn().mockReturnValue({ search });

  const createService = (buildFlavor: RegisterServicesParams['buildFlavor'] = 'traditional') =>
    createGetAvailableSchemasService({
      buildFlavor,
      createProfilingEsClient,
      deps: {},
    } as unknown as RegisterServicesParams);

  // Resolves each events search with hits only for the schemas listed.
  const mockSchemasWithData = (schemasWithData: ProfilingSchema[]) => {
    search.mockImplementation(async (_operationName: string, { index }: { index: string }) => {
      const hasData = schemasWithData.some(
        (schema) => PROFILING_EVENTS_INDEX_BY_SCHEMA[schema] === index
      );
      return { hits: { total: { value: hasData ? 1 : 0 } } };
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches the events of each schema with the given query', async () => {
    mockSchemasWithData([]);

    await createService()({ esClient, query, abortSignal });

    expect(createProfilingEsClient).toHaveBeenCalledWith({ esClient, abortSignal });
    expect(search).toHaveBeenCalledTimes(2);
    Object.values(ProfilingSchema).forEach((schema) => {
      expect(search).toHaveBeenCalledWith(`has_${schema}_profiling_data`, {
        index: PROFILING_EVENTS_INDEX_BY_SCHEMA[schema],
        size: 0,
        track_total_hits: 1,
        terminate_after: 1,
        ignore_unavailable: true,
        allow_no_indices: true,
        query,
      });
    });
  });

  it.each([
    [[ProfilingSchema.ECS, ProfilingSchema.OTEL]],
    [[ProfilingSchema.ECS]],
    [[ProfilingSchema.OTEL]],
    [[]],
  ])('reports %j as the schemas with data', async (schemasWithData) => {
    mockSchemasWithData(schemasWithData);

    await expect(createService()({ esClient, query })).resolves.toEqual({
      schemas: schemasWithData,
    });
  });

  it('only checks OTel data on serverless', async () => {
    mockSchemasWithData([ProfilingSchema.ECS, ProfilingSchema.OTEL]);

    await expect(createService('serverless')({ esClient, query })).resolves.toEqual({
      schemas: [ProfilingSchema.OTEL],
    });
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(
      `has_${ProfilingSchema.OTEL}_profiling_data`,
      expect.objectContaining({ index: PROFILING_EVENTS_INDEX_BY_SCHEMA[ProfilingSchema.OTEL] })
    );
  });

  it('rejects when an events search fails', async () => {
    const error = new Error('ES call failed');
    search.mockRejectedValue(error);

    await expect(createService()({ esClient, query })).rejects.toBe(error);
  });
});
