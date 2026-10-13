/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ProfilingSchema } from '@kbn/profiling-utils';
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
    durationSeconds: 900,
  };

  const profilingStacktraces = jest.fn();
  const createProfilingEsClient = jest.fn().mockReturnValue({ profilingStacktraces });

  const createService = (buildFlavor: RegisterServicesParams['buildFlavor'] = 'traditional') =>
    createGetAvailableSchemasByStacktraceIdsService({
      buildFlavor,
      createProfilingEsClient,
      deps: {},
    } as unknown as RegisterServicesParams);

  // Every schema gets the stacktrace events of the documents, but only the listed schemas resolve
  // them into stack traces.
  const mockSchemasWithStacktraces = (schemasWithStacktraces: ProfilingSchema[]) => {
    profilingStacktraces.mockImplementation(async ({ schema }: { schema: ProfilingSchema }) => ({
      sampling_rate: 1,
      stack_trace_events: { 'stacktrace-id': 1 },
      stack_traces: schemasWithStacktraces.includes(schema)
        ? { 'stacktrace-id': { frame_ids: ['frame-id'] } }
        : {},
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('looks up the stacktrace IDs of the given documents in each schema', async () => {
    mockSchemasWithStacktraces([]);

    await createService()({ ...params, abortSignal });

    expect(createProfilingEsClient).toHaveBeenCalledWith({ esClient, abortSignal });
    expect(profilingStacktraces).toHaveBeenCalledTimes(2);
    Object.values(ProfilingSchema).forEach((schema) => {
      expect(profilingStacktraces).toHaveBeenCalledWith({
        query: params.query,
        indices: params.indices,
        stacktraceIdsField: params.stacktraceIdsField,
        durationSeconds: params.durationSeconds,
        sampleSize: expect.any(Number),
        schema,
      });
    });
  });

  it.each([
    [[ProfilingSchema.ECS, ProfilingSchema.OTEL]],
    [[ProfilingSchema.ECS]],
    [[ProfilingSchema.OTEL]],
    [[]],
  ])('reports %j as the schemas with data', async (schemasWithStacktraces) => {
    mockSchemasWithStacktraces(schemasWithStacktraces);

    await expect(createService()(params)).resolves.toEqual({ schemas: schemasWithStacktraces });
  });

  it('reports no data when the documents hold no stacktrace IDs', async () => {
    profilingStacktraces.mockResolvedValue({ sampling_rate: 1 });

    await expect(createService()(params)).resolves.toEqual({ schemas: [] });
  });

  it('only checks OTel data on serverless', async () => {
    mockSchemasWithStacktraces([ProfilingSchema.ECS, ProfilingSchema.OTEL]);

    await expect(createService('serverless')(params)).resolves.toEqual({
      schemas: [ProfilingSchema.OTEL],
    });
    expect(profilingStacktraces).toHaveBeenCalledTimes(1);
  });
});
