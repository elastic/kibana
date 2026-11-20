/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ProfilingSchema } from '@kbn/profiling-utils';
import { getRoutePaths } from '../../common';
import type { RouteRegisterParameters } from '.';
import { registerFlameChartSearchRoute } from './flamechart';

function setup() {
  const router = httpServiceMock.createRouter();
  const fetchFlamechartData = jest.fn().mockResolvedValue({});

  registerFlameChartSearchRoute({
    router,
    logger: loggerMock.create(),
    services: { createProfilingEsClient: jest.fn() },
    dependencies: {
      start: { profilingDataAccess: { services: { fetchFlamechartData } } },
    },
  } as unknown as RouteRegisterParameters);

  const routeEntry = router.get.mock.calls.find(
    ([{ path }]) => path === getRoutePaths().Flamechart
  );
  const handler = routeEntry?.[1] as (...args: unknown[]) => Promise<unknown>;

  const context = coreMock.createCustomRequestHandlerContext({
    core: coreMock.createRequestHandlerContext(),
  });
  const response = httpServerMock.createResponseFactory();

  return {
    fetchFlamechartData,
    response,
    getFlamechart: (schema?: ProfilingSchema) =>
      handler(
        context,
        httpServerMock.createKibanaRequest({
          query: { timeFrom: 1_700_000_000_000, timeTo: 1_700_000_900_000, kuery: '', schema },
        }),
        response
      ),
  };
}

describe('registerFlameChartSearchRoute', () => {
  it.each([ProfilingSchema.ECS, ProfilingSchema.OTEL])(
    'forwards the %s schema to the data access service',
    async (schema) => {
      const { getFlamechart, fetchFlamechartData, response } = setup();

      await getFlamechart(schema);

      expect(response.ok).toHaveBeenCalled();
      expect(fetchFlamechartData).toHaveBeenCalledWith(expect.objectContaining({ schema }));
    }
  );

  it('leaves the schema unset when none is requested', async () => {
    const { getFlamechart, fetchFlamechartData, response } = setup();

    await getFlamechart();

    expect(response.ok).toHaveBeenCalled();
    expect(fetchFlamechartData).toHaveBeenCalledTimes(1);
    expect(fetchFlamechartData.mock.calls[0][0].schema).toBeUndefined();
  });
});
