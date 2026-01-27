/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import { SCRIPTS_LIBRARY_ROUTE } from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { EndpointAuthorizationError } from '../../errors';
import { registerListScriptsRoute } from './list_scripts';
import { ScriptsLibraryMock } from '../../services/scripts_library/mocks';
import type { ListScriptsRequestQuery } from '../../../../common/api/endpoint/scripts_library/list_scripts';

describe('GET: fetch list of scripts', () => {
  let apiTestSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<undefined, ListScriptsRequestQuery, undefined>['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<
    undefined,
    ListScriptsRequestQuery,
    undefined
  >['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<
    undefined,
    ListScriptsRequestQuery,
    undefined
  >['httpResponseMock'];

  beforeEach(async () => {
    apiTestSetup = createHttpApiTestSetupMock<undefined, ListScriptsRequestQuery, undefined>();

    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);

    httpRequestMock = apiTestSetup.createRequestMock({
      query: {
        page: 100,
        pageSize: 50,
        sortField: 'name',
        sortDirection: 'asc',
        kuery: 'name:foo',
      },
    });

    ((await httpHandlerContextMock.securitySolution).getSpaceId as jest.Mock).mockReturnValue(
      'space_a'
    );

    registerListScriptsRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
  });

  describe('registerListScriptsRoute()', () => {
    it('should register the route', () => {
      const registeredRoute = apiTestSetup.getRegisteredVersionedRoute(
        'get',
        SCRIPTS_LIBRARY_ROUTE,
        '2023-10-31'
      );

      expect(registeredRoute).toBeDefined();
    });

    it('should error if user has no authz to api', async () => {
      (
        (await httpHandlerContextMock.securitySolution).getEndpointAuthz as jest.Mock
      ).mockResolvedValue(
        getEndpointAuthzInitialStateMock({
          canWriteScriptsLibrary: false,
          canReadScriptsLibrary: false,
        })
      );

      await apiTestSetup
        .getRegisteredVersionedRoute('get', SCRIPTS_LIBRARY_ROUTE, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
    });
  });

  describe('router handler', () => {
    it('should get scripts client with correct space ID and call list() method', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('get', SCRIPTS_LIBRARY_ROUTE, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient
      ).toHaveBeenCalledWith('space_a', 'unknown');

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient('', '').list
      ).toHaveBeenCalledWith(httpRequestMock.query);
    });

    it('should respond with expected body payload', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('get', SCRIPTS_LIBRARY_ROUTE, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: {
          data: [ScriptsLibraryMock.generateScriptEntry()],
          page: httpRequestMock.query!.page!,
          pageSize: httpRequestMock.query!.pageSize!,
          sortField: httpRequestMock.query!.sortField!,
          sortDirection: httpRequestMock.query!.sortDirection!,
          total: 1,
        },
      });
    });
  });
});
