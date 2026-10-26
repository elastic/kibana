/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { PROFILING_STACKTRACES_INDEX_BY_SCHEMA, ProfilingSchema } from '@kbn/profiling-utils';
import type { RegisterServicesParams } from '../register_services';
import { createGetAvailableSchemasByStacktraceIdsService } from '.';

describe('createGetAvailableSchemasByStacktraceIdsService', () => {
  const esClient = {} as ElasticsearchClient;
  const abortSignal = new AbortController().signal;
  const params = {
    esClient,
    query: { bool: { filter: [{ term: { 'service.name': 'my-service' } }] } },
    indices: ['traces-apm*'],
    stacktraceIdsField: 'transaction.profiler_stack_trace_ids',
  };
  const stacktraceIds = ['stacktrace-id-1', 'stacktrace-id-2'];

  const search = jest.fn();
  const sampleStacktraceIds = jest.fn();
  const createProfilingEsClient = jest.fn().mockReturnValue({ search, sampleStacktraceIds });

  const createService = (buildFlavor: RegisterServicesParams['buildFlavor'] = 'traditional') =>
    createGetAvailableSchemasByStacktraceIdsService({
      buildFlavor,
      createProfilingEsClient,
      deps: {},
    } as unknown as RegisterServicesParams);

  // `count` documents match the query, and only the listed schemas store the sampled stacktrace IDs
  const mockData = ({
    count = 100,
    schemasWithStacktraces = [],
  }: {
    count?: number;
    schemasWithStacktraces?: ProfilingSchema[];
  }) => {
    search.mockImplementation(async (operationName: string) => {
      if (operationName === 'count_stacktrace_ids_documents') {
        return { hits: { total: { value: count } } };
      }
      const hasStacktraces = schemasWithStacktraces.some(
        (schema) => operationName === `has_${schema}_stacktraces`
      );
      return { hits: { total: { value: hasStacktraces ? 1 : 0 } } };
    });
  };

  const getSamplingKeys = () =>
    sampleStacktraceIds.mock.calls.map(([{ seed, preference }]) => ({ seed, preference }));

  beforeEach(() => {
    jest.clearAllMocks();
    sampleStacktraceIds.mockResolvedValue(stacktraceIds);
  });

  it('looks up the sampled stacktrace IDs of the given documents in the stacktraces of each schema', async () => {
    mockData({});

    await createService()({ ...params, abortSignal });

    expect(createProfilingEsClient).toHaveBeenCalledWith({ esClient, abortSignal });
    expect(sampleStacktraceIds).toHaveBeenCalledWith({
      query: params.query,
      indices: params.indices,
      stacktraceIdsField: params.stacktraceIdsField,
      probability: 1,
      seed: expect.any(Number),
      preference: expect.any(String),
      size: 10_000,
    });
    Object.values(ProfilingSchema).forEach((schema) => {
      expect(search).toHaveBeenCalledWith(
        `has_${schema}_stacktraces`,
        expect.objectContaining({
          index: PROFILING_STACKTRACES_INDEX_BY_SCHEMA[schema],
          query: { ids: { values: stacktraceIds } },
        })
      );
    });
  });

  it.each([
    [100, 1],
    [2000, 1],
    [4000, 0.25],
    [1_000_000, 0.001],
  ])('samples %d matching documents with a probability of %s', async (count, probability) => {
    mockData({ count });

    await createService()(params);

    expect(sampleStacktraceIds).toHaveBeenCalledWith(expect.objectContaining({ probability }));
  });

  it('samples the same documents for the same request', async () => {
    mockData({});

    await createService()(params);
    await createService()(params);

    const [first, second] = getSamplingKeys();
    expect(second).toEqual(first);
    expect(first.preference).toBe(String(first.seed));
    expect(search).toHaveBeenCalledWith(
      'count_stacktrace_ids_documents',
      expect.objectContaining({ preference: first.preference })
    );
  });

  it('samples other documents for another request', async () => {
    mockData({});

    await createService()(params);
    await createService()({ ...params, query: { term: { 'service.name': 'other-service' } } });

    const [first, second] = getSamplingKeys();
    expect(second.seed).not.toBe(first.seed);
    expect(second.preference).not.toBe(first.preference);
  });

  it.each([
    [[ProfilingSchema.ECS, ProfilingSchema.OTEL]],
    [[ProfilingSchema.ECS]],
    [[ProfilingSchema.OTEL]],
    [[]],
  ])('reports %j as the schemas with data', async (schemasWithStacktraces) => {
    mockData({ schemasWithStacktraces });

    await expect(createService()(params)).resolves.toEqual({ schemas: schemasWithStacktraces });
  });

  it('reports no data without sampling when no documents match', async () => {
    mockData({ count: 0, schemasWithStacktraces: [ProfilingSchema.OTEL] });

    await expect(createService()(params)).resolves.toEqual({ schemas: [] });
    expect(sampleStacktraceIds).not.toHaveBeenCalled();
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('reports no data without looking up stacktraces when the sample holds no stacktrace IDs', async () => {
    mockData({ schemasWithStacktraces: [ProfilingSchema.OTEL] });
    sampleStacktraceIds.mockResolvedValue([]);

    await expect(createService()(params)).resolves.toEqual({ schemas: [] });
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('only checks OTel data on serverless', async () => {
    mockData({ schemasWithStacktraces: [ProfilingSchema.ECS, ProfilingSchema.OTEL] });

    await expect(createService('serverless')(params)).resolves.toEqual({
      schemas: [ProfilingSchema.OTEL],
    });
    expect(search).not.toHaveBeenCalledWith('has_ecs_stacktraces', expect.anything());
  });
});
