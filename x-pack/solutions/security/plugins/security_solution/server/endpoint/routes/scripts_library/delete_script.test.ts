/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeleteScriptRequestParams } from '../../../../common/api/endpoint';
import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import { SCRIPTS_LIBRARY_ROUTE_ITEM } from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { EndpointAuthorizationError } from '../../errors';
import { registerDeleteScriptRoute } from './delete_script';

describe('Delete Script API route', () => {
  let apiTestSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<DeleteScriptRequestParams, undefined, undefined>['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<
    DeleteScriptRequestParams,
    undefined,
    undefined
  >['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<
    DeleteScriptRequestParams,
    undefined,
    undefined
  >['httpResponseMock'];

  beforeEach(async () => {
    apiTestSetup = createHttpApiTestSetupMock<DeleteScriptRequestParams, undefined, undefined>();

    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);

    httpRequestMock = apiTestSetup.createRequestMock({
      params: { script_id: '123' },
    });

    ((await httpHandlerContextMock.securitySolution).getSpaceId as jest.Mock).mockReturnValue(
      'space_a'
    );

    registerDeleteScriptRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
  });

  describe('registerDeleteScriptRoute()', () => {
    it('should register the route', () => {
      const registeredRoute = apiTestSetup.getRegisteredVersionedRoute(
        'delete',
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
        .getRegisteredVersionedRoute('delete', SCRIPTS_LIBRARY_ROUTE_ITEM, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
    });
  });

  describe('Delete script route handler', () => {
    it('should get scripts client with correct space ID and call delete() method', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('delete', SCRIPTS_LIBRARY_ROUTE_ITEM, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient
      ).toHaveBeenCalledWith('space_a', 'unknown');

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient('', '').delete
      ).toHaveBeenCalledWith(httpRequestMock.params.script_id);
    });

    it('should respond with the correct body payload', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('delete', SCRIPTS_LIBRARY_ROUTE_ITEM, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith();
    });
  });
});
