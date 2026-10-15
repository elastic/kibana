/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import type { RouteDependencies } from '../register_routes';
import { createRouteContextMock } from '../route_context.mock';
import { registerListWorkersRoute } from './list_workers';

const setupRoute = (list: jest.Mock) => {
  const router = httpServiceMock.createRouter();
  const addVersion = jest.fn();
  (router.versioned.get as jest.Mock).mockReturnValue({ addVersion });

  registerListWorkersRoute({
    router,
    logger: loggingSystemMock.createLogger(),
    getSpaceId: () => 'default',
    getWorkersService: () => ({ list }),
  } as unknown as RouteDependencies);

  const handler = addVersion.mock.calls[0][1] as (
    context: unknown,
    request: ReturnType<typeof httpServerMock.createKibanaRequest>,
    response: ReturnType<typeof httpServerMock.createResponseFactory>
  ) => Promise<unknown>;

  return { handler };
};

describe('registerListWorkersRoute', () => {
  it('reports whether the caller can modify workers', async () => {
    const list = jest.fn().mockResolvedValue({ workers: [] });
    const { handler } = setupRoute(list);
    const response = httpServerMock.createResponseFactory();

    await handler(
      createRouteContextMock({ manageSecurity: false }),
      httpServerMock.createKibanaRequest(),
      response
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: { workers: [], canModifyWorkers: false },
    });
  });
});
