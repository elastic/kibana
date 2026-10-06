/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { registerRoutes } from './register_routes';
import { createRouteContextMock } from './route_context.mock';

const setup = () => {
  const router = httpServiceMock.createRouter();
  const service = jest.fn((): never => {
    throw new Error('Feature services must not run');
  });
  registerRoutes({
    router,
    logger: loggerMock.create(),
    getSpaceId: service,
    getWatchesService: service,
    getWorkersService: service,
    getConversationProposalsService: service,
    getActionsService: service,
    getAgentBuilderConversations: service,
    getHuntServices: service,
    getScanFailuresService: service,
  });
  const routes = (['get', 'post', 'put', 'patch', 'delete'] as const).flatMap((method) =>
    router.versioned[method].mock.calls.map(([{ path }]) => router.versioned.getRoute(method, path))
  );
  return { routes, service };
};

describe('AlertZero route gate coverage', () => {
  it.each(['license', 'serverless_tier', 'loading'] as const)(
    'blocks every registered route for %s',
    async (subscription) => {
      const { routes, service } = setup();
      expect(routes.length).toBeGreaterThan(0);
      for (const { versions } of routes) {
        for (const { handler } of Object.values(versions)) {
          const response = httpServerMock.createResponseFactory();
          await handler(
            createRouteContextMock({ subscription }),
            httpServerMock.createKibanaRequest(),
            response
          );
          expect(response.forbidden).toHaveBeenCalled();
        }
      }
      expect(service).not.toHaveBeenCalled();
    }
  );

  it('blocks every registered route when the space setting is off', async () => {
    const { routes, service } = setup();
    for (const { versions } of routes) {
      for (const { handler } of Object.values(versions)) {
        const response = httpServerMock.createResponseFactory();
        await handler(
          createRouteContextMock({ settingEnabled: false }),
          httpServerMock.createKibanaRequest(),
          response
        );
        expect(response.notFound).toHaveBeenCalled();
      }
    }
    expect(service).not.toHaveBeenCalled();
  });

  it('requires an AlertZero read or write privilege on every route', () => {
    for (const { config } of setup().routes) {
      expect(config.security?.authz).toEqual(
        expect.objectContaining({
          requiredPrivileges: expect.arrayContaining([
            expect.stringMatching(/^alertzero_(read|write)$/),
          ]),
        })
      );
    }
  });
});
