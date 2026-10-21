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
import { registerTopNFunctionsSearchRoute } from './functions';

function setup() {
  const router = httpServiceMock.createRouter();
  const fetchESFunctions = jest.fn().mockResolvedValue({ TopN: [] });

  registerTopNFunctionsSearchRoute({
    router,
    logger: loggerMock.create(),
    services: { createProfilingEsClient: jest.fn() },
    dependencies: {
      start: { profilingDataAccess: { services: { fetchESFunctions } } },
    },
  } as unknown as RouteRegisterParameters);

  const routeEntry = router.get.mock.calls.find(
    ([{ path }]) => path === getRoutePaths().TopNFunctions
  );
  const handler = routeEntry?.[1] as (...args: unknown[]) => Promise<unknown>;

  const context = coreMock.createCustomRequestHandlerContext({
    core: coreMock.createRequestHandlerContext(),
  });
  const response = httpServerMock.createResponseFactory();

  return {
    fetchESFunctions,
    response,
    getTopNFunctions: (schema?: ProfilingSchema) =>
      handler(
        context,
        httpServerMock.createKibanaRequest({
          query: {
            timeFrom: 1_700_000_000_000,
            timeTo: 1_700_000_900_000,
            startIndex: 0,
            endIndex: 10,
            kuery: '',
            schema,
          },
        }),
        response
      ),
  };
}

describe('registerTopNFunctionsSearchRoute', () => {
  it.each([ProfilingSchema.ECS, ProfilingSchema.OTEL])(
    'forwards the %s schema to the data access service',
    async (schema) => {
      const { getTopNFunctions, fetchESFunctions, response } = setup();

      await getTopNFunctions(schema);

      expect(response.ok).toHaveBeenCalled();
      expect(fetchESFunctions).toHaveBeenCalledWith(expect.objectContaining({ schema }));
    }
  );

  it('leaves the schema unset when none is requested', async () => {
    const { getTopNFunctions, fetchESFunctions, response } = setup();

    await getTopNFunctions();

    expect(response.ok).toHaveBeenCalled();
    expect(fetchESFunctions).toHaveBeenCalledTimes(1);
    expect(fetchESFunctions.mock.calls[0][0].schema).toBeUndefined();
  });
});
