/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetOneScriptRequestParams } from '../../../../common/api/endpoint';
import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import { ScriptsLibraryMock } from '../../services/scripts_library/mocks';
import { registerGetScriptRoute } from './get_script';
import { SCRIPTS_LIBRARY_ROUTE_ITEM } from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { EndpointAuthorizationError } from '../../errors';

describe('Get one script API route', () => {
  let apiTestSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<GetOneScriptRequestParams, undefined, undefined>['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<
    GetOneScriptRequestParams,
    undefined,
    undefined
  >['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<
    GetOneScriptRequestParams,
    undefined,
    undefined
  >['httpResponseMock'];

  beforeEach(async () => {
    apiTestSetup = createHttpApiTestSetupMock<GetOneScriptRequestParams, undefined, undefined>();

    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);

    httpRequestMock = apiTestSetup.createRequestMock({
      params: { script_id: '123' },
    });

    ((await httpHandlerContextMock.securitySolution).getSpaceId as jest.Mock).mockReturnValue(
      'space_a'
    );

    registerGetScriptRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
  });

  describe('registerGetScriptRoute()', () => {
    it('should register the route', () => {
      const registeredRoute = apiTestSetup.getRegisteredVersionedRoute(
        'get',
        SCRIPTS_LIBRARY_ROUTE_ITEM,
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
        .getRegisteredVersionedRoute('get', SCRIPTS_LIBRARY_ROUTE_ITEM, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
    });
  });

  describe('Get script route handler', () => {
    it('should get scripts client with correct space ID and call get() method', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('get', SCRIPTS_LIBRARY_ROUTE_ITEM, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient
      ).toHaveBeenCalledWith('space_a', 'unknown');

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient('', '').get
      ).toHaveBeenCalledWith(httpRequestMock.params.script_id);
    });

    it('should respond with the correct body payload', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('get', SCRIPTS_LIBRARY_ROUTE_ITEM, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: { data: ScriptsLibraryMock.generateScriptEntry() },
      });
    });
  });
});
