/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { getAttackDiscoveryGenerationsRoute } from './get_attack_discovery_generations';
import * as helpers from '../../../helpers';
import { getKibanaFeatureFlags } from '../../helpers/get_kibana_feature_flags';
import { getMockAttackDiscoveryGenerationsResponse } from '../../../../__mocks__/attack_discovery_generations_response';
import { mockAuthenticatedUser } from '../../../../__mocks__/mock_authenticated_user';

jest.mock('../../helpers/get_kibana_feature_flags', () => ({
  getKibanaFeatureFlags: jest.fn(),
}));

const mockAttackDiscoveryGenerationsResponse = getMockAttackDiscoveryGenerationsResponse();

describe('getAttackDiscoveryGenerationsRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  let mockContext: {
    resolve: jest.Mock;
    elasticAssistant: Promise<{
      logger: ReturnType<typeof loggingSystemMock.createLogger>;
      eventLogIndex: string;
      getSpaceId: () => string;
      getAttackDiscoveryDataClient: jest.Mock;
    }>;
  };
  let mockRequest: Partial<KibanaRequest<unknown, unknown, unknown>>;
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let mockDataClient: { getAttackDiscoveryGenerations: jest.Mock };
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;

  let addVersionMock: jest.Mock;
  let getHandler: (ctx: unknown, req: unknown, res: unknown) => Promise<unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    router = httpServiceMock.createRouter();
    mockLogger = loggingSystemMock.createLogger();
    mockDataClient = {
      getAttackDiscoveryGenerations: jest
        .fn()
        .mockResolvedValue(mockAttackDiscoveryGenerationsResponse),
    };
    mockContext = {
      resolve: jest.fn().mockResolvedValue({ core: {}, elasticAssistant: {}, licensing: {} }),
      elasticAssistant: Promise.resolve({
        logger: mockLogger,
        eventLogIndex: 'event-log-index',
        getSpaceId: () => 'default',
        getAttackDiscoveryDataClient: jest.fn().mockResolvedValue(mockDataClient),
      }),
    };
    mockRequest = {
      query: { start: '2025-06-26T21:00:00.000Z', end: '2025-06-26T22:00:00.000Z', size: 10 },
    };
    mockResponse = httpServerMock.createResponseFactory();
    jest
      .spyOn(helpers, 'performChecks')
      .mockResolvedValue({ isSuccess: true, currentUser: mockAuthenticatedUser });

    (getKibanaFeatureFlags as jest.Mock).mockResolvedValue({
      attackDiscoveryPublicApiEnabled: true, // enabled by default
    });

    addVersionMock = jest.fn();
    (router.versioned.get as jest.Mock).mockReturnValue({ addVersion: addVersionMock });
    getAttackDiscoveryGenerationsRoute(router);
    getHandler = addVersionMock.mock.calls[0][1];
  });

  it('returns 200 and the expected generations on success', async () => {
    await getHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: mockAttackDiscoveryGenerationsResponse,
    });
  });

  it('returns 500 if the data client is not initialized', async () => {
    (await mockContext.elasticAssistant).getAttackDiscoveryDataClient.mockResolvedValueOnce(null);

    await getHandler(mockContext, mockRequest, mockResponse);

    expect(mockResponse.custom).toHaveBeenCalledWith({
      body: Buffer.from(
        JSON.stringify({
          message: 'Attack discovery data client not initialized',
          status_code: 500,
        })
      ),
      headers: expect.any(Object),
      statusCode: 500,
    });
  });

  it('returns an error when performChecks fails', async () => {
    (helpers.performChecks as jest.Mock).mockResolvedValueOnce({
      isSuccess: false,
      response: { status: 403, payload: { message: 'Forbidden' } },
    });

    const result = await getHandler(mockContext, mockRequest, mockResponse);

    expect(result).toEqual({ status: 403, payload: { message: 'Forbidden' } });
  });

  describe('public API feature flag behavior', () => {
    describe('when the public API is disabled', () => {
      beforeEach(() => {
        (getKibanaFeatureFlags as jest.Mock).mockResolvedValueOnce({
          attackDiscoveryPublicApiEnabled: false,
        });
      });

      it('returns a 403 custom response when the public API is disabled', async () => {
        await getHandler(mockContext, mockRequest, mockResponse);

        expect(mockResponse.custom).toHaveBeenCalledWith({
          body: Buffer.from(
            JSON.stringify({
              message: 'Attack discovery public API is disabled',
              status_code: 403,
            })
          ),
          headers: expect.any(Object),
          statusCode: 403,
        });
      });
    });

    describe('when the public API is enabled', () => {
      beforeEach(() => {
        (getKibanaFeatureFlags as jest.Mock).mockResolvedValueOnce({
          attackDiscoveryPublicApiEnabled: true,
        });
      });

      it('proceeds with normal execution when the public API is enabled', async () => {
        await getHandler(mockContext, mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: mockAttackDiscoveryGenerationsResponse,
        });
      });
    });
  });

  describe('when data client throws', () => {
    const thrownError = new Error('fail!');

    beforeEach(() => {
      mockDataClient.getAttackDiscoveryGenerations.mockRejectedValueOnce(thrownError);
    });

    it('includes the error message in the response body', async () => {
      await getHandler(mockContext, mockRequest, mockResponse);
      const customCall = mockResponse.custom.mock.calls[0][0];
      const bodyString = customCall.body ? customCall.body.toString() : '';

      expect(bodyString).toContain(thrownError.message);
    });

    it('returns status code 500', async () => {
      await getHandler(mockContext, mockRequest, mockResponse);
      const customCall = mockResponse.custom.mock.calls[0][0];

      expect(customCall.statusCode).toBe(500);
    });
  });
});
