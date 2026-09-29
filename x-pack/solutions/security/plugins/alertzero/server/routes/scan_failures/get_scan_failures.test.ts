/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { RouteDependencies } from '../register_routes';
import { createRouteContextMock } from '../route_context.mock';
import { registerGetScanFailuresRoute } from './get_scan_failures';

const emptyFailures = { workers: [], unknown: false };

const makeDeps = (listFn: Mock, spaceId = 'default') => {
  const addVersion = vi.fn();
  const router = {
    versioned: {
      get: vi.fn().mockReturnValue({ addVersion }),
    },
  };
  const getSpaceId = vi.fn().mockReturnValue(spaceId);

  registerGetScanFailuresRoute({
    router: router as unknown as RouteDependencies['router'],
    getSpaceId,
    getScanFailuresService: () => ({ list: listFn }),
  } as unknown as RouteDependencies);

  const routeConfig = router.versioned.get.mock.calls[0][0];
  const handler = addVersion.mock.calls[0][1] as (
    context: ReturnType<typeof createRouteContextMock>,
    request: ReturnType<typeof httpServerMock.createKibanaRequest>,
    response: ReturnType<typeof httpServerMock.createResponseFactory>
  ) => Promise<unknown>;

  return { handler, routeConfig, getSpaceId };
};

describe('registerGetScanFailuresRoute', () => {
  it('requires alertzero_read', () => {
    const { routeConfig } = makeDeps(vi.fn());

    expect(routeConfig.security.authz.requiredPrivileges).toEqual(['alertzero_read']);
  });

  it('returns the failures for the request space', async () => {
    const list = vi.fn().mockResolvedValue(emptyFailures);
    const { handler, getSpaceId } = makeDeps(list, 'other-space');
    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();

    await handler(createRouteContextMock(), request, response);

    expect(getSpaceId).toHaveBeenCalledWith(request);
    expect(list).toHaveBeenCalledWith(request, 'other-space');
    expect(response.ok).toHaveBeenCalledWith({ body: emptyFailures });
  });

  it('responds 404 without listing failures when AlertZero is off', async () => {
    const list = vi.fn();
    const { handler } = makeDeps(list);
    const response = httpServerMock.createResponseFactory();

    await handler(
      createRouteContextMock({ settingEnabled: false }),
      httpServerMock.createKibanaRequest(),
      response
    );

    expect(list).not.toHaveBeenCalled();
    expect(response.notFound).toHaveBeenCalled();
  });
});
