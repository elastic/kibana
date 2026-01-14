/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import type { DownloadScriptRequestParams } from '../../../../common/api/endpoint';
import { ScriptsLibraryMock } from '../../services/scripts_library/mocks';
import { registerDownloadScriptRoute } from './download_script';
import { SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE } from '../../../../common/endpoint/constants';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { EndpointAuthorizationError } from '../../errors';
import { Readable } from 'stream';

describe('Download script API route', () => {
  let apiTestSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<
    HttpApiTestSetupMock<DownloadScriptRequestParams, undefined, undefined>['createRequestMock']
  >;
  let httpHandlerContextMock: HttpApiTestSetupMock<
    DownloadScriptRequestParams,
    undefined,
    undefined
  >['httpHandlerContextMock'];
  let httpResponseMock: HttpApiTestSetupMock<
    DownloadScriptRequestParams,
    undefined,
    undefined
  >['httpResponseMock'];

  beforeEach(async () => {
    apiTestSetup = createHttpApiTestSetupMock<DownloadScriptRequestParams, undefined, undefined>();

    ({ httpHandlerContextMock, httpResponseMock } = apiTestSetup);

    httpRequestMock = apiTestSetup.createRequestMock({
      body: ScriptsLibraryMock.generateUpdateScriptBody(),
    });

    httpRequestMock.params = { script_id: '123' };

    ((await httpHandlerContextMock.securitySolution).getSpaceId as jest.Mock).mockReturnValue(
      'space_a'
    );

    registerDownloadScriptRoute(apiTestSetup.routerMock, apiTestSetup.endpointAppContextMock);
  });

  describe('registerDownloadScriptRoute()', () => {
    it('should register the route', () => {
      const registeredRoute = apiTestSetup.getRegisteredVersionedRoute(
        'get',
        SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE,
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
        .getRegisteredVersionedRoute('get', SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
        body: expect.any(EndpointAuthorizationError),
      });
    });
  });

  describe('Download script route handler', () => {
    it('should get scripts client with correct space ID and call download() method', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('get', SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient
      ).toHaveBeenCalledWith('space_a', 'unknown');

      expect(
        apiTestSetup.endpointAppContextMock.service.getScriptsLibraryClient('', '').download
      ).toHaveBeenCalledWith(httpRequestMock.params.script_id);
    });

    it('should respond with the correct body payload', async () => {
      await apiTestSetup
        .getRegisteredVersionedRoute('get', SCRIPTS_LIBRARY_ITEM_DOWNLOAD_ROUTE, '2023-10-31')
        .routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);

      expect(httpResponseMock.ok).toHaveBeenCalledWith({
        body: expect.any(Readable),
        headers: {
          'cache-control': 'max-age=31536000, immutable',
          'content-disposition': 'attachment; filename="do_something.sh"',
          'content-type': 'application/octet-stream',
          'x-content-type-options': 'nosniff',
        },
      });
    });
  });
});
