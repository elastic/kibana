/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ProfilingDataAccessPluginStart } from '@kbn/profiling-data-access-plugin/server';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { fetchProfilingFlamegraph } from './fetch_profiling_flamegraph';
import { fetchProfilingFunctions } from './fetch_profiling_functions';
import { fetchProfilingSchemas } from './fetch_profiling_schemas';
import { getProfilingQuery } from './get_profiling_query';

describe('Infra profiling data', () => {
  const fetchFlamechartData = jest.fn();
  const fetchFunctions = jest.fn();
  const getAvailableSchemas = jest.fn();
  const profilingDataAccess = {
    services: { fetchFlamechartData, fetchFunctions, getAvailableSchemas },
  } as unknown as ProfilingDataAccessPluginStart;
  const esClient = {};
  const coreRequestContext = {
    elasticsearch: { client: { asCurrentUser: esClient } },
  } as unknown as CoreRequestHandlerContext;
  const params = { kuery: 'host.name : "host-1"', from: 1000000, to: 1900000 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each([
    ['the requested schema', ProfilingSchema.OTEL],
    ['no schema, so the default of the profiling APIs applies', undefined],
  ])('with %s', (_description, schema) => {
    it('requests the flamegraph of the host', async () => {
      await fetchProfilingFlamegraph(
        { ...params, schema },
        profilingDataAccess,
        coreRequestContext
      );

      expect(fetchFlamechartData).toHaveBeenCalledWith({
        core: coreRequestContext,
        esClient,
        totalSeconds: 900,
        query: getProfilingQuery(params),
        schema,
      });
    });

    it('requests the functions of the host', async () => {
      await fetchProfilingFunctions(
        { ...params, startIndex: 0, endIndex: 10, schema },
        profilingDataAccess,
        coreRequestContext
      );

      expect(fetchFunctions).toHaveBeenCalledWith({
        core: coreRequestContext,
        esClient,
        startIndex: 0,
        endIndex: 10,
        totalSeconds: 900,
        query: getProfilingQuery(params),
        schema,
      });
    });
  });

  it('checks which schemas have profiling data of the host', async () => {
    const availability = { schemas: [ProfilingSchema.OTEL] };
    getAvailableSchemas.mockResolvedValue(availability);

    await expect(
      fetchProfilingSchemas(params, profilingDataAccess, coreRequestContext)
    ).resolves.toBe(availability);

    expect(getAvailableSchemas).toHaveBeenCalledWith({
      esClient,
      query: getProfilingQuery(params),
    });
  });
});
