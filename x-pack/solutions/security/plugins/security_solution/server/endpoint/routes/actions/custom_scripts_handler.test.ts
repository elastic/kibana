/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, RequestHandler } from '@kbn/core/server';
import type { HttpApiTestSetupMock } from '../../mocks';
import { createHttpApiTestSetupMock } from '../../mocks';
import { registerCustomScriptsRoute } from './custom_scripts_handler';
import { CUSTOM_SCRIPTS_ROUTE } from '../../../../common/endpoint/constants';
import { getResponseActionsClient } from '../../services';
import { getEndpointAuthzInitialStateMock } from '../../../../common/endpoint/service/authz/mocks';
import { EndpointAuthorizationError } from '../../errors';

jest.mock('../../services', () => {
  const actual = jest.requireActual('../../services');
  return {
    ...actual,
    getResponseActionsClient: jest.fn(),
  };
});

const mockGetResponseActionsClient = getResponseActionsClient as jest.Mock;
const mockCustomScripts = [
  { id: 'script-1', name: 'Test Script', description: 'Test description' },
];

describe('custom_scripts_handler', () => {
  let testSetup: HttpApiTestSetupMock;
  let httpRequestMock: ReturnType<HttpApiTestSetupMock['createRequestMock']>;
  let httpHandlerContextMock: HttpApiTestSetupMock['httpHandlerContextMock'];
  let httpResponseMock: jest.Mocked<KibanaResponseFactory>;
  let callHandler: () => ReturnType<RequestHandler>;

  beforeEach(() => {
    testSetup = createHttpApiTestSetupMock();
    ({ httpHandlerContextMock, httpResponseMock } = testSetup);

    httpRequestMock = testSetup.createRequestMock({
      query: {
        agentType: 'crowdstrike',
      },
    });

    mockGetResponseActionsClient.mockReturnValue({
      getCustomScripts: jest.fn().mockResolvedValue(mockCustomScripts),
    });

    registerCustomScriptsRoute(testSetup.routerMock, testSetup.endpointAppContextMock);

    const { routeHandler } = testSetup.getRegisteredVersionedRoute(
      'get',
      CUSTOM_SCRIPTS_ROUTE,
      '1'
    );
    callHandler = () => routeHandler(httpHandlerContextMock, httpRequestMock, httpResponseMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should error if user has no Authz to API', async () => {
    (
      (await httpHandlerContextMock.securitySolution).getEndpointAuthz as jest.Mock
    ).mockResolvedValue(
      getEndpointAuthzInitialStateMock({
        canWriteExecuteOperations: false,
      })
    );

    await callHandler();

    expect(httpResponseMock.forbidden).toHaveBeenCalledWith({
      body: expect.any(EndpointAuthorizationError),
    });
  });

  it('returns custom scripts from the response actions client', async () => {
    await callHandler();

    expect(mockGetResponseActionsClient).toHaveBeenCalledWith(
      'crowdstrike',
      expect.objectContaining({
        esClient: expect.anything(),
        spaceId: expect.anything(),
        endpointService: expect.anything(),
        username: expect.any(String),
        connectorActions: expect.anything(),
      })
    );

    expect(httpResponseMock.ok).toHaveBeenCalledWith({ body: mockCustomScripts });
  });

  it('passes agentType from query params', async () => {
    httpRequestMock = testSetup.createRequestMock({
      query: { agentType: 'crowdstrike' },
    });

    await callHandler();

    expect(mockGetResponseActionsClient).toHaveBeenCalledWith('crowdstrike', expect.anything());
  });

  describe('and agentType is sentinel_one', () => {
    beforeEach(() => {
      // @ts-expect-error write to readonly property
      testSetup.endpointAppContextMock.experimentalFeatures.responseActionsSentinelOneRunScriptEnabled =
        true;
      httpRequestMock.query.agentType = 'sentinel_one';
      httpRequestMock.query.osType = 'linux';
    });

    it('should return error if feature flag is disabled', async () => {
      // @ts-expect-error write to readonly property
      testSetup.endpointAppContextMock.experimentalFeatures.responseActionsSentinelOneRunScriptEnabled =
        false;
      await callHandler();

      expect(httpResponseMock.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: expect.objectContaining({
          message: "Agent type [sentinel_one] does not support 'runscript' response action",
        }),
      });
    });

    it('should pass query params to SentinelOne `getCustomScripts()` method', async () => {
      await callHandler();

      expect(mockGetResponseActionsClient().getCustomScripts).toHaveBeenCalledWith({
        osType: 'linux',
      });
    });
  });
});
