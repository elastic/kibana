/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { RouterMock } from '@kbn/core-http-router-server-mocks';
import type { StartPlugins } from '../../plugin';
import type {
  SecuritySolutionApiRequestHandlerContext,
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../types';
import { registerDataGeneratorRoutes } from './register_data_generator_routes';

describe('registerDataGeneratorRoutes', () => {
  const ROUTE_PATH = '/internal/security_solution/data_generator/cases/{caseId}/timestamps';
  const defaultTimestamp = '2026-01-01T00:00:00.000Z';

  let router: RouterMock;
  let getStartServices: jest.MockedFunction<StartServicesAccessor<StartPlugins>>;

  let coreStart: ReturnType<typeof coreMock.createStart>;
  let internalRepo: { update: jest.Mock };
  let pluginsStart: Partial<StartPlugins>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;

  const getRouteHandler = () => {
    const route = router.versioned.getRoute('put', ROUTE_PATH);
    return route.versions['1'].handler;
  };

  const createContext = (): SecuritySolutionRequestHandlerContext => {
    const securitySolutionContext = {
      getSpaceId: jest.fn().mockReturnValue('default'),
    } as Pick<SecuritySolutionApiRequestHandlerContext, 'getSpaceId'>;

    return {
      securitySolution: Promise.resolve(
        securitySolutionContext as unknown as SecuritySolutionApiRequestHandlerContext
      ),
    } as unknown as SecuritySolutionRequestHandlerContext;
  };

  const createRequest = ({
    headers,
    caseId = 'case-1',
    timestamp = defaultTimestamp,
  }: {
    headers?: Record<string, string>;
    caseId?: string;
    timestamp?: string;
  } = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'put',
      path: ROUTE_PATH,
      headers: headers ?? {},
      params: { caseId },
      body: { timestamp },
    });

  beforeEach(() => {
    router = httpServiceMock.createRouter() as unknown as RouterMock;
    mockResponse = httpServerMock.createResponseFactory();

    coreStart = coreMock.createStart();
    internalRepo = { update: jest.fn().mockResolvedValue({}) };
    (coreStart.savedObjects.createInternalRepository as jest.Mock).mockReturnValue(
      internalRepo as unknown as ReturnType<typeof coreStart.savedObjects.createInternalRepository>
    );
    (coreStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
      username: 'elastic',
      roles: ['superuser'],
      authentication_type: 'realm',
      authentication_realm: { name: 'native', type: 'native' },
      lookup_realm: { name: 'native', type: 'native' },
      elastic_cloud_user: false,
    });

    const casesGet = jest.fn().mockResolvedValue({ id: 'case-1' });
    pluginsStart = {
      cases: {
        getCasesClientWithRequest: jest.fn().mockResolvedValue({ cases: { get: casesGet } }),
      } as unknown as StartPlugins['cases'],
    };

    getStartServices = jest
      .fn()
      .mockResolvedValue([
        coreStart as unknown as typeof coreStart,
        pluginsStart as unknown as StartPlugins,
        undefined,
      ]);
    registerDataGeneratorRoutes(
      router as unknown as SecuritySolutionPluginRouter,
      getStartServices as unknown as StartServicesAccessor<StartPlugins>
    );
  });

  it('returns forbidden when the internal-origin header is missing', async () => {
    const handler = getRouteHandler();
    await handler(createContext(), createRequest(), mockResponse);
    expect(mockResponse.forbidden).toHaveBeenCalled();
  });

  it('returns forbidden when the current user is not privileged', async () => {
    (coreStart.security.authc.getCurrentUser as jest.Mock).mockReturnValue({
      username: 'elastic',
      roles: [],
      authentication_type: 'realm',
      authentication_realm: { name: 'native', type: 'native' },
      lookup_realm: { name: 'native', type: 'native' },
      elastic_cloud_user: false,
    });

    const handler = getRouteHandler();
    await handler(
      createContext(),
      createRequest({ headers: { 'x-elastic-internal-origin': 'Kibana' } }),
      mockResponse
    );
    expect(mockResponse.forbidden).toHaveBeenCalled();
  });

  it('returns notFound when the Cases plugin is unavailable', async () => {
    pluginsStart = { cases: undefined };
    const startServices = [
      coreStart,
      pluginsStart as unknown as StartPlugins,
      undefined,
    ] as unknown as Awaited<ReturnType<StartServicesAccessor<StartPlugins>>>;
    getStartServices.mockResolvedValue(startServices);

    const handler = getRouteHandler();
    await handler(
      createContext(),
      createRequest({ headers: { 'x-elastic-internal-origin': 'Kibana' } }),
      mockResponse
    );

    expect(mockResponse.notFound).toHaveBeenCalled();
  });

  it('updates the case saved object created_at', async () => {
    const handler = getRouteHandler();
    await handler(
      createContext(),
      createRequest({ headers: { 'x-elastic-internal-origin': 'Kibana' } }),
      mockResponse
    );

    expect(internalRepo.update).toHaveBeenCalled();
  });

  it('returns ok when the update succeeds', async () => {
    const handler = getRouteHandler();
    await handler(
      createContext(),
      createRequest({ headers: { 'x-elastic-internal-origin': 'Kibana' } }),
      mockResponse
    );

    expect(mockResponse.ok).toHaveBeenCalled();
  });
});
