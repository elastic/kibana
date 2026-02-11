/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type { CreateScriptRequestBody } from '../../../../common/api/endpoint/scripts_library';
import { ScriptsLibraryMock } from '../../services/scripts_library/mocks';
import { SCRIPTS_LIBRARY_ROUTE } from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { registerCreateScriptRoute } from './create_script';
import { EndpointAuthorizationError } from '../../errors';

describe('POST: create script API route', () => {
  let apiTestSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<undefined, undefined, CreateScriptRequestBody>['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<
    undefined,
    undefined,
    CreateScriptRequestBody
  >['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<
    undefined,
    undefined,
    CreateScriptRequestBody
  >['httpResponseMock'];

  beforeEach(async () => {
    apiTestSetup = createHttpApiTestSetupMock<undefined, undefined, CreateScriptRequestBody>();

    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);

    httpRequestMock = apiTestSetup.createRequestMock({
      body: ScriptsLibraryMock.generateCreateScriptBody(),
    });

    ((await httpHandlerContextMock.securitySolution).getSpaceId as jest.Mock).mockReturnValue(
      'space_a'
    );

    registerCreateScriptRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
  });

  describe('registerCreateScriptRoute()', () => {
    it('should register the route', () => {
      const registeredRoute = apiTestSetup.getRegisteredVersionedRoute(
        'post',
        SCRIPTS_LIBRARY_ROUTE,
        '2023-10-31'
      );

      expect(registeredRoute).toBeDefined();
      expect(registeredRoute.routeConfig.options?.body?.accepts).toEqual(['multipart/form-data']);
      expect(registeredRoute.routeConfig.options?.body?.output).toEqual('stream');
    });

    it('should error if user has no authz to api', async () => {
      (
        (await httpHandlerContextMock.securitySolution).getEndpointAuthz as jest.Mock
      ).mockResolvedValue(
        getEndpointAuthzInitialStateMock({
          canWriteScriptsLibrary: false,
          canReadScriptsLibrary: true,
        })
      );

      await apiTestSetup
        .getRegisteredVersionedRoute('post', SCRIPTS_LIBRARY_ROUTE, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
    });
  });

  describe('route handler', () => {
    it('should get scripts client with correct space ID and call create() method', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('post', SCRIPTS_LIBRARY_ROUTE, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient
      ).toHaveBeenCalledWith('space_a', 'unknown');

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient('', '').create
      ).toHaveBeenCalledWith(httpRequestMock.body);
    });

    it('should respond with the correct body payload', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('post', SCRIPTS_LIBRARY_ROUTE, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: { data: ScriptsLibraryMock.generateScriptEntry() },
      });
    });
  });
});
