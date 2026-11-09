/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { ProfilingSchemasAvailability } from '@kbn/profiling-utils';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { getRoutePaths, MAX_KUERY_LENGTH } from '../../../common';
import type { RouteRegisterParameters } from '..';
import { registerSchemasRoute } from './route';

const availability: ProfilingSchemasAvailability = {
  schemas: [ProfilingSchema.ECS, ProfilingSchema.OTEL],
};

function setup(query: { timeFrom: number; timeTo: number; kuery: string }) {
  const router = httpServiceMock.createRouter();
  const getAvailableSchemas = jest.fn().mockResolvedValue(availability);

  registerSchemasRoute({
    router,
    logger: loggerMock.create(),
    services: { createProfilingEsClient: jest.fn() },
    dependencies: {
      start: { profilingDataAccess: { services: { getAvailableSchemas } } },
    },
  } as unknown as RouteRegisterParameters);

  const routeEntry = router.get.mock.calls.find(([{ path }]) => path === getRoutePaths().Schemas);
  const handler = routeEntry?.[1] as (...args: unknown[]) => Promise<unknown>;

  const coreContext = coreMock.createRequestHandlerContext();
  const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
  const request = httpServerMock.createKibanaRequest({ query });
  const response = httpServerMock.createResponseFactory();

  return {
    routeConfig: routeEntry?.[0],
    getAvailableSchemas,
    coreContext,
    response,
    getSchemas: () => handler(context, request, response),
  };
}

describe('registerSchemasRoute', () => {
  const timeRange = { timeFrom: 1_700_000_000_000, timeTo: 1_700_000_900_000 };

  it('returns the schemas with data for the time range and kuery', async () => {
    const { getSchemas, getAvailableSchemas, coreContext, response } = setup({
      ...timeRange,
      kuery: 'host.name:my-host',
    });

    await getSchemas();

    expect(getAvailableSchemas).toHaveBeenCalledWith({
      esClient: coreContext.elasticsearch.client.asCurrentUser,
      abortSignal: expect.any(AbortSignal),
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [{ match: { 'host.name': 'my-host' } }],
                minimum_should_match: 1,
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: '1700000000',
                  lt: '1700000900',
                  format: 'epoch_second',
                  boost: 1.0,
                },
              },
            },
          ],
        },
      },
    });
    expect(response.ok).toHaveBeenCalledWith({ body: availability });
  });

  it('only filters by time range when the kuery is empty', async () => {
    const { getSchemas, getAvailableSchemas } = setup({ ...timeRange, kuery: '' });

    await getSchemas();

    expect(getAvailableSchemas).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { bool: { filter: [expect.objectContaining({ range: expect.anything() })] } },
      })
    );
  });

  it('returns an error response when the schemas cannot be fetched', async () => {
    const { getSchemas, getAvailableSchemas, response } = setup({ ...timeRange, kuery: '' });
    getAvailableSchemas.mockRejectedValue(new Error('ES call failed'));

    await getSchemas();

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: 'Error while fetching the available profiling schemas',
        attributes: { cause: 'ES call failed', name: 'Error' },
      },
    });
  });

  it('rejects kueries longer than the maximum length', () => {
    const { routeConfig } = setup({ ...timeRange, kuery: '' });
    const { query: querySchema } = routeConfig?.validate as { query: Type<unknown> };

    expect(() =>
      querySchema.validate({ ...timeRange, kuery: 'a'.repeat(MAX_KUERY_LENGTH + 1) })
    ).toThrow();
    expect(() =>
      querySchema.validate({ ...timeRange, kuery: 'a'.repeat(MAX_KUERY_LENGTH) })
    ).not.toThrow();
  });
});
