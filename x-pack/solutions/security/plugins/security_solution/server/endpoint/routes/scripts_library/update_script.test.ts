/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type {
  PatchUpdateRequestBody,
  PatchUpdateRequestParams,
} from '../../../../common/api/endpoint';
import { ScriptsLibraryMock } from '../../services/scripts_library/mocks';
import { registerPatchUpdateScriptRoute } from './update_script';
import { SCRIPTS_LIBRARY_ROUTE_ITEM } from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { EndpointAuthorizationError } from '../../errors';

describe('PATCH: update script API route', () => {
  let apiTestSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<
      PatchUpdateRequestParams,
      undefined,
      PatchUpdateRequestBody
    >['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<
    PatchUpdateRequestParams,
    undefined,
    PatchUpdateRequestBody
  >['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<
    PatchUpdateRequestParams,
    undefined,
    PatchUpdateRequestBody
  >['httpResponseMock'];

  beforeEach(async () => {
    apiTestSetup = createHttpApiTestSetupMock<
      PatchUpdateRequestParams,
      undefined,
      PatchUpdateRequestBody
    >();

    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);

    httpRequestMock = apiTestSetup.createRequestMock({
      body: ScriptsLibraryMock.generateUpdateScriptBody(),
    });

    httpRequestMock.params = { script_id: '123' };

    ((await httpHandlerContextMock.securitySolution).getSpaceId as jest.Mock).mockReturnValue(
      'space_a'
    );

    registerPatchUpdateScriptRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
  });

  describe('registerPatchUpdateScriptRoute()', () => {
    it('should register the route', () => {
      const registeredRoute = apiTestSetup.getRegisteredVersionedRoute(
        'patch',
        SCRIPTS_LIBRARY_ROUTE_ITEM,
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
        .getRegisteredVersionedRoute('patch', SCRIPTS_LIBRARY_ROUTE_ITEM, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
    });
  });

  describe('Patch update route handler', () => {
    it('should get scripts client with correct space ID and call update() method', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('patch', SCRIPTS_LIBRARY_ROUTE_ITEM, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient
      ).toHaveBeenCalledWith('space_a', 'unknown');

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient('', '').update
      ).toHaveBeenCalledWith({ ...httpRequestMock.body, id: httpRequestMock.params.script_id });
    });

    it('should respond with the correct body payload', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('patch', SCRIPTS_LIBRARY_ROUTE_ITEM, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: { data: ScriptsLibraryMock.generateScriptEntry() },
      });
    });
  });
});
